import { describe, expect, it } from 'vitest'
import {
  citationTrail,
  formatCitation,
  formatLocator,
  nextSourceLabel,
  scanCitations,
  verifyCitations,
  type CitableChunk,
  type CitableSource,
} from '@/lib/citations'

/**
 * Citation integrity is the product's core guarantee, so these tests are the
 * ones that matter most: a marker that does not resolve to a retrieved chunk
 * must never survive into a displayed answer.
 */

const sources: CitableSource[] = [
  { id: 'src-1', label: 'S1', title: 'Vendor Proposal.pdf', format: 'pdf' },
  { id: 'src-2', label: 'S2', title: 'Invoice Register.xlsx', format: 'xlsx' },
  { id: 'src-3', label: 'S3', title: 'Interview.txt', format: 'txt' },
]

const chunks: CitableChunk[] = [
  { id: 'chunk-1', sourceId: 'src-1', text: 'Delivery of all 240 units on September 10, 2024.', pageNumber: 4 },
  { id: 'chunk-2', sourceId: 'src-1', text: 'Installation between September 11 and 17.', pageNumber: 5 },
  {
    id: 'chunk-3',
    sourceId: 'src-2',
    text: 'INV-4471 quantity 240 amount $178,080.00',
    sheetName: 'Invoices',
    rowStart: 221,
    rowEnd: 221,
  },
  { id: 'chunk-4', sourceId: 'src-3', text: 'The clerk described the process.', timecode: '00:14:22' },
]

describe('formatLocator', () => {
  it('renders page locators for paged documents', () => {
    expect(formatLocator({ pageNumber: 14 }, 'pdf')).toBe('p. 14')
    expect(formatLocator({ pageNumber: 2 }, 'docx')).toBe('p. 2')
  })

  it('renders sheet and row locators for spreadsheets', () => {
    expect(formatLocator({ sheetName: 'Invoices', rowStart: 221, rowEnd: 221 }, 'xlsx')).toBe('Sheet “Invoices,” row 221')
    expect(formatLocator({ sheetName: 'Invoices', rowStart: 12, rowEnd: 24 }, 'xlsx')).toBe('Sheet “Invoices,” rows 12–24')
    expect(formatLocator({ sheetName: 'Invoices' }, 'xlsx')).toBe('Sheet “Invoices”')
  })

  it('renders timecodes, sections and image regions', () => {
    expect(formatLocator({ timecode: '00:14:22' }, 'txt')).toBe('00:14:22')
    expect(formatLocator({ sectionPath: 'Contract Terms' }, 'html')).toBe('section “Contract Terms”')
    expect(formatLocator({ regionLabel: '2' }, 'image')).toBe('extracted region 2')
  })

  it('returns an empty locator for a note with no position', () => {
    expect(formatLocator({}, 'note')).toBe('')
    expect(formatCitation('S6', '')).toBe('[S6]')
  })
})

describe('scanCitations', () => {
  it('finds single and grouped markers', () => {
    const result = scanCitations('One [S1 p. 4] and two [S2 Sheet “Invoices,” row 221] and both [S1 p. 4; S3 00:14:22].')
    expect(result.markers.sort()).toEqual(['S1', 'S2', 'S3'])
    expect(result.spans).toHaveLength(3)
    expect(result.spans[2]!.markers).toEqual(['S1', 'S3'])
  })

  it('ignores bracketed text that is not a citation', () => {
    expect(scanCitations('An aside [see below] with no marker.').markers).toEqual([])
  })
})

describe('verifyCitations', () => {
  it('resolves valid markers to the chunk they name', () => {
    const result = verifyCitations({
      text: 'The proposal commits to delivery on September 10, 2024 [S1 p. 4].',
      retrieved: chunks,
      sources,
    })
    expect(result.invalidMarkers).toEqual([])
    expect(result.citations).toHaveLength(1)
    expect(result.citations[0]).toMatchObject({ chunkId: 'chunk-1', sourceLabel: 'S1', locator: 'p. 4' })
    expect(result.unsupported).toBe(false)
  })

  it('picks the chunk matching the page named inside the citation', () => {
    const result = verifyCitations({
      text: 'Installation follows delivery [S1 p. 5].',
      retrieved: chunks,
      sources,
    })
    expect(result.citations[0]!.chunkId).toBe('chunk-2')
  })

  it('picks the chunk matching a cited spreadsheet row', () => {
    const result = verifyCitations({
      text: 'The register records 240 units [S2 Sheet “Invoices,” row 221].',
      retrieved: chunks,
      sources,
    })
    expect(result.citations[0]).toMatchObject({ chunkId: 'chunk-3', locator: 'Sheet “Invoices,” row 221' })
  })

  it('strips a marker naming a source that was not retrieved', () => {
    const result = verifyCitations({
      text: 'A fabricated reference [S9 p. 2] should not survive.',
      retrieved: chunks,
      sources,
    })
    expect(result.invalidMarkers).toEqual(['S9'])
    expect(result.text).not.toContain('S9')
    expect(result.citations).toHaveLength(0)
    expect(result.unsupported).toBe(true)
  })

  it('strips a marker for a known source whose chunks were not retrieved', () => {
    const result = verifyCitations({
      text: 'Cited from an unretrieved record [S2].',
      retrieved: chunks.filter((c) => c.sourceId === 'src-1'),
      sources,
    })
    expect(result.invalidMarkers).toEqual(['S2'])
    expect(result.citations).toHaveLength(0)
  })

  it('keeps valid markers when a group contains one invalid marker', () => {
    const result = verifyCitations({
      text: 'Two records agree [S1 p. 4; S9 p. 1].',
      retrieved: chunks,
      sources,
    })
    expect(result.invalidMarkers).toEqual(['S9'])
    expect(result.text).toContain('[S1]')
    expect(result.citations.map((c) => c.sourceLabel)).toEqual(['S1'])
  })

  it('uses the stored excerpt rather than any text the model produced', () => {
    const result = verifyCitations({
      text: 'The record says something entirely different [S1 p. 4].',
      retrieved: chunks,
      sources,
    })
    expect(result.citations[0]!.excerpt).toBe('Delivery of all 240 units on September 10, 2024.')
  })

  it('does not mark an explicit insufficiency statement as unsupported', () => {
    const result = verifyCitations({
      text: 'The available case sources do not establish this.',
      retrieved: chunks,
      sources,
    })
    expect(result.unsupported).toBe(false)
    expect(result.citations).toHaveLength(0)
  })

  it('flags factual sentences that carry no citation', () => {
    const result = verifyCitations({
      text: 'The delivery was completed on time and the invoice totals were reconciled in full afterwards.',
      retrieved: chunks,
      sources,
    })
    expect(result.uncitedSentences.length).toBeGreaterThan(0)
  })

  it('deduplicates repeated citations to the same chunk', () => {
    const result = verifyCitations({
      text: 'First [S1 p. 4]. Second reference to the same passage [S1 p. 4].',
      retrieved: chunks,
      sources,
    })
    expect(result.citations).toHaveLength(1)
  })
})

describe('nextSourceLabel', () => {
  it('starts at S1 and increments past the highest existing label', () => {
    expect(nextSourceLabel([])).toBe('S1')
    expect(nextSourceLabel(['S1', 'S2'])).toBe('S3')
    expect(nextSourceLabel(['S1', 'S9', 'S3'])).toBe('S10')
  })

  it('ignores labels that are not in the SN form', () => {
    expect(nextSourceLabel(['S1', 'draft', ''])).toBe('S2')
  })
})

describe('citationTrail', () => {
  it('renders a compact trail for exports', () => {
    const result = verifyCitations({
      text: 'Both [S1 p. 4] and [S2 Sheet “Invoices,” row 221] are cited.',
      retrieved: chunks,
      sources,
    })
    expect(citationTrail(result.citations)).toBe('[S1 p. 4] [S2 Sheet “Invoices,” row 221]')
  })
})
