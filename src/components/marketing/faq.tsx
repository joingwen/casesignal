'use client'

import * as Accordion from '@radix-ui/react-accordion'
import { Plus } from 'lucide-react'

export interface FaqItem {
  question: string
  answer: React.ReactNode
}

export const LANDING_FAQ: FaqItem[] = [
  {
    question: 'Does CaseSignal decide what is true?',
    answer:
      'No. CaseSignal organises records and shows where they agree and disagree. A claim is marked supported, partially supported, contradicted, unresolved or context only strictly on the basis of the excerpts cited against it — and an analyst can override any of those judgements. It does not weigh credibility, infer intent, or reach conclusions about any person or organization. Its outputs are research assistance, not findings of fact.',
  },
  {
    question: 'How accurate are the citations?',
    answer:
      'Every citation resolves to a stored excerpt with its original location — page, sheet and row, section or timecode. Before an answer is shown, each citation the model produced is checked against the excerpts that were actually retrieved for that answer; any citation that does not resolve is removed, and if nothing survives, the answer is replaced with a statement that the sources do not establish the point. The excerpt you see is the stored text, never a paraphrase. Extraction quality still varies by document, so a scanned or low-confidence record is flagged as such and should be read in the original.',
  },
  {
    question: 'Which file formats are supported?',
    answer:
      'PDF, DOCX, TXT, Markdown, CSV, XLSX, PNG, JPG and WEBP, plus public webpages by URL, pasted text and typed notes. Spreadsheets keep sheet and row references; PDFs keep page numbers; webpages keep section headings. Images are read with vision extraction and marked with a confidence value.',
  },
  {
    question: 'What happens to sensitive source material?',
    answer:
      'Files are stored privately and are never publicly addressable. Access is checked on the server for every read — a file request re-verifies that you belong to the organization that owns the case, so a leaked link alone grants nothing. Nothing in a case is public unless you explicitly create an evidence room and explicitly include each item in it.',
  },
  {
    question: 'What about scanned documents?',
    answer:
      'A scanned PDF with no machine-readable text is detected during extraction, given a low confidence score and marked "needs review" rather than being silently indexed as empty. Adding the page as an image lets vision extraction transcribe it, region by region, with illegible passages marked rather than guessed.',
  },
  {
    question: 'Can I edit what the AI produced?',
    answer:
      'Yes, and you are expected to. Claim wording, status, materiality, review state and notes are all editable; citations can be added or removed; duplicate claims can be merged; anything can be archived. When you set a status yourself it is recorded as an analyst decision and is never silently overwritten by later analysis.',
  },
  {
    question: 'Can I delete my data?',
    answer:
      'Yes. Deleting a source removes it, its excerpts and every citation to it. Deleting a case removes all of its records, analysis and stored files. Workspace settings include a control to delete every case at once. Deletions are recorded in the audit log before the rows are removed.',
  },
  {
    question: 'How does public sharing work?',
    answer:
      'You can publish a read-only evidence room at a link you name. Sharing is off until you turn it on, and only items you have explicitly included appear — sources, claims, timeline events and discrepancies are each opted in individually. You can set an expiry date, require a password, hide analyst notes, disable downloads and revoke the link at any time.',
  },
]

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <Accordion.Root type="single" collapsible className="border-t border-line">
      {items.map((item, index) => (
        <Accordion.Item key={item.question} value={`item-${index}`} className="border-b border-line">
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-start justify-between gap-6 py-5 text-left transition-colors duration-200 ease-editorial hover:text-ink-secondary lg:py-6">
              <span className="text-[16px] font-medium tracking-tight text-ink lg:text-[17.5px]">{item.question}</span>
              <Plus className="mt-1 h-4 w-4 shrink-0 text-ink-muted transition-transform duration-300 ease-editorial group-data-[state=open]:rotate-45" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-fade data-[state=open]:animate-fade">
            <div className="max-w-[760px] pb-6 pr-10 text-[14.5px] leading-relaxed text-ink-secondary">{item.answer}</div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
