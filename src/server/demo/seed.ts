import { and, eq } from 'drizzle-orm'
import { getDb } from '@/server/db'
import {
  briefSections,
  briefs,
  caseConversations,
  caseMessages,
  cases,
  claimEvidence,
  claims,
  discrepancies,
  discrepancyEvidence,
  entities,
  entityRelationships,
  sourceChunks,
  sourcePages,
  sourceSheets,
  sources,
  timelineEventSources,
  timelineEvents,
} from '@/server/db/schema'
import { normalizeEntityName } from '@/server/ai/local/text'
import { BRIEF_SECTION_META, type BriefSectionKey } from '@/lib/domain'
import { formatCitation } from '@/lib/citations'
import {
  DEMO_CASE,
  DEMO_CLAIMS,
  DEMO_DISCREPANCIES,
  DEMO_ENTITIES,
  DEMO_EVENTS,
  DEMO_RELATIONSHIPS,
  DEMO_SOURCES,
} from './content'

/**
 * Builds the fictional demonstration case.
 *
 * The demo is authored rather than generated so it is identical for every
 * viewer, and its chunk locators (page 14 of the minutes, row 221 of the
 * register) are the real ones the citations resolve to — clicking a citation in
 * the demo opens exactly the excerpt it names, through the same code path a
 * real case uses.
 */
export async function seedDemoCase(input: {
  organizationId: string
  profileId: string | null
  force?: boolean
}): Promise<string> {
  const db = await getDb()

  if (!input.force) {
    const existing = await db
      .select({ id: cases.id })
      .from(cases)
      .where(and(eq(cases.organizationId, input.organizationId), eq(cases.isDemo, true)))
      .limit(1)
    if (existing[0]) return existing[0].id
  }

  const insertedCase = await db
    .insert(cases)
    .values({
      organizationId: input.organizationId,
      createdByProfileId: input.profileId,
      title: DEMO_CASE.title,
      description: DEMO_CASE.description,
      objective: DEMO_CASE.objective,
      templateId: DEMO_CASE.templateId,
      isDemo: true,
      summary: DEMO_CASE.summary,
      lastAnalyzedAt: new Date(),
    })
    .returning()

  const caseId = insertedCase[0]!.id

  /* ------------------------------------------------------------ sources */

  const sourceIdByKey = new Map<string, string>()
  // chunk lookup key: `${sourceKey}:p${page}` or `${sourceKey}:r${row}`
  const chunkIdByRef = new Map<string, string>()

  let order = 0
  for (const source of DEMO_SOURCES) {
    const inserted = await db
      .insert(sources)
      .values({
        caseId,
        label: source.label,
        title: source.title,
        kind: source.kind,
        format: source.format,
        originalFilename: source.filename ?? null,
        mimeType: source.mimeType ?? null,
        byteSize: source.byteSize,
        sourceUrl: source.sourceUrl ?? null,
        pageCount: source.pages?.length ?? 1,
        wordCount: countWords(source),
        status: 'complete',
        statusDetail: 'Indexed and ready to cite.',
        extractionConfidence: source.extractionConfidence,
        summary: source.summary,
        keyPoints: source.keyPoints,
        includedInShare: true,
        sortOrder: order,
        metadata: { demo: true },
      })
      .returning()

    const sourceId = inserted[0]!.id
    sourceIdByKey.set(source.key, sourceId)
    order += 1

    let chunkIndex = 0

    if (source.pages) {
      await db.insert(sourcePages).values(
        source.pages.map((page) => ({ sourceId, pageNumber: page.page, text: page.text })),
      )
      for (const page of source.pages) {
        const chunk = await db
          .insert(sourceChunks)
          .values({
            sourceId,
            caseId,
            chunkIndex: chunkIndex++,
            text: page.text,
            pageNumber: page.page,
            charStart: 0,
            charEnd: page.text.length,
            tokenEstimate: Math.ceil(page.text.length / 4),
          })
          .returning()
        chunkIdByRef.set(`${source.key}:p${page.page}`, chunk[0]!.id)
      }
    }

    if (source.sheet) {
      await db.insert(sourceSheets).values({
        sourceId,
        name: source.sheet.name,
        sheetIndex: 0,
        headers: source.sheet.headers,
        rows: source.sheet.rows,
        rowCount: source.sheet.rows.length,
        rowOffset: source.sheet.rowOffset,
      })

      // Header chunk, then one chunk per register row so a row can be cited exactly.
      const headerText = `Sheet “${source.sheet.name}” columns: ${source.sheet.headers.join(', ')}.`
      const headerChunk = await db
        .insert(sourceChunks)
        .values({
          sourceId,
          caseId,
          chunkIndex: chunkIndex++,
          text: headerText,
          sheetName: source.sheet.name,
          charStart: 0,
          charEnd: headerText.length,
          tokenEstimate: Math.ceil(headerText.length / 4),
        })
        .returning()
      chunkIdByRef.set(`${source.key}:header`, headerChunk[0]!.id)

      for (const [offset, row] of source.sheet.rows.entries()) {
        const rowNumber = source.sheet.rowOffset + offset
        const text = `Sheet “${source.sheet.name}” row ${rowNumber} — ${source.sheet.headers
          .map((header, i) => `${header}: ${row[i] ?? ''}`)
          .filter((part) => !part.endsWith(': '))
          .join('; ')}`
        const chunk = await db
          .insert(sourceChunks)
          .values({
            sourceId,
            caseId,
            chunkIndex: chunkIndex++,
            text,
            sheetName: source.sheet.name,
            rowStart: rowNumber,
            rowEnd: rowNumber,
            charStart: 0,
            charEnd: text.length,
            tokenEstimate: Math.ceil(text.length / 4),
          })
          .returning()
        chunkIdByRef.set(`${source.key}:r${rowNumber}`, chunk[0]!.id)
      }
    }
  }

  const resolveChunk = (ref: { sourceKey: string; page?: number; row?: number }) => {
    const key = ref.page != null ? `${ref.sourceKey}:p${ref.page}` : ref.row != null ? `${ref.sourceKey}:r${ref.row}` : `${ref.sourceKey}:header`
    return chunkIdByRef.get(key) ?? null
  }

  /* ----------------------------------------------------------- entities */

  const entityIdByName = new Map<string, string>()
  for (const entity of DEMO_ENTITIES) {
    const firstChunk = resolveChunkForSourceKeys(entity.sourceKeys, chunkIdByRef)
    const inserted = await db
      .insert(entities)
      .values({
        caseId,
        name: entity.name,
        normalizedName: normalizeEntityName(entity.name),
        type: entity.type,
        role: entity.role,
        aliases: entity.aliases,
        description: entity.description,
        mentionCount: entity.sourceKeys.length,
        firstSeenChunkId: firstChunk,
        graphX: entity.x,
        graphY: entity.y,
      })
      .returning()
    entityIdByName.set(entity.name, inserted[0]!.id)
  }

  for (const relationship of DEMO_RELATIONSHIPS) {
    const fromId = entityIdByName.get(relationship.from)
    const toId = entityIdByName.get(relationship.to)
    if (!fromId || !toId) continue
    await db.insert(entityRelationships).values({
      caseId,
      fromEntityId: fromId,
      toEntityId: toId,
      type: relationship.type,
      description: relationship.description,
      confidence: relationship.confidence,
      chunkIds: [],
    })
  }

  /* ------------------------------------------------------------- claims */

  for (const claim of DEMO_CLAIMS) {
    const inserted = await db
      .insert(claims)
      .values({
        caseId,
        statement: claim.statement,
        category: claim.category,
        status: claim.status,
        statusOverridden: false,
        confidence: claim.confidence,
        materiality: claim.materiality,
        origin: 'extracted',
        reviewState: claim.reviewState,
        analystNotes: claim.analystNotes ?? '',
        includedInBrief: true,
        includedInShare: claim.materiality !== 'low',
      })
      .returning()

    const claimId = inserted[0]!.id
    for (const evidence of claim.evidence) {
      const chunkId = resolveChunk(evidence)
      const sourceId = sourceIdByKey.get(evidence.sourceKey)
      if (!chunkId || !sourceId) continue
      const chunkRow = await db.select({ text: sourceChunks.text }).from(sourceChunks).where(eq(sourceChunks.id, chunkId)).limit(1)
      await db
        .insert(claimEvidence)
        .values({
          claimId,
          chunkId,
          sourceId,
          role: evidence.role,
          excerpt: (chunkRow[0]?.text ?? '').slice(0, 560),
          confidence: claim.confidence,
        })
        .onConflictDoNothing()
    }
  }

  /* ----------------------------------------------------------- timeline */

  for (const event of DEMO_EVENTS) {
    const inserted = await db
      .insert(timelineEvents)
      .values({
        caseId,
        occurredOn: event.occurredOn,
        precision: event.precision,
        title: event.title,
        description: event.description,
        category: event.category,
        confidence: event.confidence,
        reviewState: 'reviewed',
        includedInShare: true,
      })
      .returning()

    const eventId = inserted[0]!.id
    for (const ref of event.sources) {
      const chunkId = resolveChunk(ref)
      const sourceId = sourceIdByKey.get(ref.sourceKey)
      if (!chunkId || !sourceId) continue
      const chunkRow = await db.select({ text: sourceChunks.text }).from(sourceChunks).where(eq(sourceChunks.id, chunkId)).limit(1)
      await db
        .insert(timelineEventSources)
        .values({ eventId, chunkId, sourceId, excerpt: (chunkRow[0]?.text ?? '').slice(0, 400) })
        .onConflictDoNothing()
    }
  }

  /* ------------------------------------------------------ discrepancies */

  for (const discrepancy of DEMO_DISCREPANCIES) {
    const inserted = await db
      .insert(discrepancies)
      .values({
        caseId,
        title: discrepancy.title,
        description: discrepancy.description,
        type: discrepancy.type,
        subject: discrepancy.subject,
        confidence: discrepancy.confidence,
        materiality: discrepancy.materiality,
        reviewState: discrepancy.reviewState,
        includedInShare: true,
      })
      .returning()

    const discrepancyId = inserted[0]!.id
    for (const [side, ref] of [['a', discrepancy.sideA] as const, ['b', discrepancy.sideB] as const]) {
      const chunkId = resolveChunk(ref)
      const sourceId = sourceIdByKey.get(ref.sourceKey)
      if (!chunkId || !sourceId) continue
      const chunkRow = await db.select({ text: sourceChunks.text }).from(sourceChunks).where(eq(sourceChunks.id, chunkId)).limit(1)
      await db.insert(discrepancyEvidence).values({
        discrepancyId,
        chunkId,
        sourceId,
        side,
        statedValue: ref.statedValue,
        excerpt: (chunkRow[0]?.text ?? '').slice(0, 560),
      })
    }
  }

  /* -------------------------------------------------------------- brief */

  const brief = await db
    .insert(briefs)
    .values({ caseId, title: `${DEMO_CASE.title} — investigation brief`, generatedAt: new Date() })
    .returning()

  const briefBodies = demoBriefBodies()
  await db.insert(briefSections).values(
    (Object.keys(BRIEF_SECTION_META) as BriefSectionKey[]).map((key, index) => ({
      briefId: brief[0]!.id,
      caseId,
      key,
      title: BRIEF_SECTION_META[key].title,
      body: briefBodies[key] ?? '',
      position: index,
      included: true,
      generated: true,
    })),
  )

  /* ------------------------------------------------------------ copilot */

  if (input.profileId) {
    const conversation = await db.insert(caseConversations).values({ caseId, profileId: input.profileId }).returning()
    const proposalChunk = chunkIdByRef.get('proposal:p4')
    const minutesChunk = chunkIdByRef.get('minutes:p14')
    const deliveryChunk = chunkIdByRef.get('delivery:p1')

    if (proposalChunk && minutesChunk && deliveryChunk) {
      await db.insert(caseMessages).values([
        {
          conversationId: conversation[0]!.id,
          caseId,
          role: 'user',
          content: 'Which records disagree about the delivery date, and what does each one say?',
        },
        {
          conversationId: conversation[0]!.id,
          caseId,
          role: 'assistant',
          content: `The available sources conflict on this point.

The vendor proposal commits to delivery of all 240 units on September 10, 2024 ${formatCitation('S2', 'p. 4')}.

The committee minutes record the Facilities Manager stating that delivery is scheduled for September 18, 2024, and record that no formal amendment to the contract delivery schedule was tabled or approved ${formatCitation('S4', 'p. 14')}.

The receiving report records the delivery as arriving on September 21, 2024 ${formatCitation('S6', 'p. 1')}.

These records state three different dates. No record in this case documents an agreed change to the contract schedule.`,
          citations: [
            {
              marker: 'S2',
              chunkId: proposalChunk,
              sourceId: sourceIdByKey.get('proposal')!,
              sourceLabel: 'S2',
              locator: 'p. 4',
              excerpt:
                'Halvorsen Office Systems commits to delivery of all 240 units on September 10, 2024 to the receiving dock at 14 Ridgeway Avenue.',
            },
            {
              marker: 'S4',
              chunkId: minutesChunk,
              sourceId: sourceIdByKey.get('minutes')!,
              sourceLabel: 'S4',
              locator: 'p. 14',
              excerpt:
                'The Facilities Manager stated that delivery of the 240 workstations is scheduled for September 18, 2024, with installation to follow beginning the week of September 23.',
            },
            {
              marker: 'S6',
              chunkId: deliveryChunk,
              sourceId: sourceIdByKey.get('delivery')!,
              sourceLabel: 'S6',
              locator: 'p. 1',
              excerpt: 'The delivery arrived on September 21, 2024 and was checked against the purchase order at the dock.',
            },
          ],
          retrievedChunkIds: [proposalChunk, minutesChunk, deliveryChunk],
          insufficientEvidence: false,
        },
      ])
    }
  }

  return caseId
}

function countWords(source: (typeof DEMO_SOURCES)[number]): number {
  const pageWords = (source.pages ?? []).reduce((acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length, 0)
  const sheetWords = source.sheet ? source.sheet.rows.flat().join(' ').split(/\s+/).filter(Boolean).length : 0
  return pageWords + sheetWords
}

function resolveChunkForSourceKeys(keys: string[], chunkIdByRef: Map<string, string>): string | null {
  for (const key of keys) {
    for (const [ref, id] of chunkIdByRef) {
      if (ref.startsWith(`${key}:`)) return id
    }
  }
  return null
}

function demoBriefBodies(): Partial<Record<BriefSectionKey, string>> {
  return {
    objective: DEMO_CASE.objective,
    executive_summary: `This review examined seven records covering a single equipment procurement by a fictional county: the purchase request, the vendor proposal, the notice of award, committee minutes, the invoice register, the receiving report and an internal status memo.

Eleven claims were extracted from those records. Five are supported by at least one citation with no conflicting citation; two are contradicted by another record in the case; one is unresolved.

Four points were identified where the records state different things: the delivery date, the quantity of units, the characterisation of whether delivery met the schedule, and the name used for the vendor.

Every statement below carries the citation for the record it came from. Nothing in this brief is a determination of fact.`,
    methodology: `This review covers seven records added to the case as a single set. Each record was indexed into excerpts that preserve their original location — page number for the PDF and DOCX records, sheet name and row number for the invoice register.

Claims, dated events and named parties were extracted from those excerpts, and each is linked to the excerpt it came from. Differences between records were identified by comparing the values each record states for the same subject.

No information outside the seven listed records was used.`,
    source_inventory: `- **S1** — Procurement Request PR-2024-0418.pdf (PDF, 3 pages)
- **S2** — Vendor Proposal — Halvorsen Office Systems.pdf (PDF, 5 pages)
- **S3** — Notice of Award NOA-2024-0418.pdf (PDF, 2 pages)
- **S4** — Facilities Committee Minutes — September 4, 2024.pdf (PDF, 4 pages)
- **S5** — Invoice Register FY2024.xlsx (Spreadsheet, sheet “Invoices”)
- **S6** — Delivery and Receiving Report DR-2024-0912.pdf (PDF, 3 pages)
- **S7** — Internal Status Memo — Building C programme.docx (DOCX, 1 page)`,
    key_findings: `- The vendor proposal commits to delivery of all 240 workstations on September 10, 2024 [S2 p. 4]
- The delivery was recorded as received on September 21, 2024 [S6 p. 1]
- The receiving report records 228 units received, with 12 units back-ordered [S6 p. 2]
- The invoice register records 240 units invoiced against invoice INV-4471 [S5 Sheet “Invoices,” row 221]
- Solicitation SOL-2024-0418 was awarded to Halvorsen Office Systems on August 2, 2024 in the amount of $178,080 [S3 p. 1]
- The invoiced amount of $178,080 is within the approved budget ceiling of $186,000 [S1 p. 2] [S5 Sheet “Invoices,” row 221]`,
    unresolved_questions: `- Whether the 12 back-ordered units were subsequently delivered — no record in this case addresses this.
- Whether a change to the contract delivery schedule was formally agreed. The minutes record a later date being stated to the committee and also record that no amendment was tabled [S4 p. 14].
- Why the invoice records 240 units when the receiving report records 228; no credit note or adjustment appears in the register.
- Whether “Halvorsen Supply Co.” and “Halvorsen Office Systems” are the same legal entity.`,
    recommended_records: `- **Signed delivery receipt or bill of lading** — would establish the date and quantity actually received independently of the county's own receiving report.
- **Purchase order PO-2024-0761 and any amendments** — would fix the contractual delivery date and show whether it was formally revised.
- **Vendor correspondence covering the schedule change** — would document how and when the September 18 date arose.
- **Credit note or adjusted invoice** — would show how the 12-unit shortfall was treated for payment.
- **Vendor registration or business filing** — would confirm the organization's legal name and resolve the naming difference.`,
    limitations: `This brief describes what the seven listed records state. It does not establish what occurred, and it makes no finding about any person or organization.

Records not held by this case were not considered. Where records conflict, both readings are preserved rather than resolved.

All content in this case is fictional demonstration data created to illustrate the CaseSignal workflow.`,
  }
}
