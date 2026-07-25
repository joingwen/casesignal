/**
 * Fictional demonstration data.
 *
 * Northstar County, Halvorsen Office Systems, Meridian Facilities Group and
 * every person named here are invented for the purpose of demonstrating the
 * CaseSignal workflow. No real jurisdiction, organization, person, election or
 * allegation is referenced, and the discrepancies below are ordinary clerical
 * differences of the kind any procurement file contains.
 */

export const DEMO_CASE = {
  title: 'Northstar County Equipment Procurement Review',
  description:
    'A fictional review of procurement records for administrative equipment, created solely to demonstrate CaseSignal’s evidence-analysis workflow.',
  objective:
    'Trace the procurement of workstation equipment from request through award, invoice and delivery, and identify where the records state different things.',
  templateId: 'procurement',
  summary:
    '7 records indexed. 11 claims extracted, of which 5 are supported by at least one citation with no conflicting citation. 4 points where records differ. Every item links to the excerpt it came from; nothing here is a determination of fact.',
}

export interface DemoPage {
  page: number
  text: string
}

export interface DemoSource {
  key: string
  label: string
  title: string
  kind: 'file' | 'url' | 'note' | 'paste'
  format: 'pdf' | 'docx' | 'xlsx' | 'txt' | 'html' | 'note' | 'csv' | 'image' | 'markdown'
  filename?: string
  mimeType?: string
  byteSize: number
  summary: string
  keyPoints: string[]
  extractionConfidence: number
  pages?: DemoPage[]
  sheet?: { name: string; headers: string[]; rows: string[][]; rowOffset: number }
  sourceUrl?: string
}

export const DEMO_SOURCES: DemoSource[] = [
  {
    key: 'request',
    label: 'S1',
    title: 'Procurement Request PR-2024-0418.pdf',
    kind: 'file',
    format: 'pdf',
    filename: 'Procurement Request PR-2024-0418.pdf',
    mimeType: 'application/pdf',
    byteSize: 248_112,
    extractionConfidence: 0.97,
    summary:
      'A departmental purchase request for 240 height-adjustable workstations for the Northstar County administration building, submitted 14 June 2024 with a stated need-by date of 30 September 2024.',
    keyPoints: [
      'Requests 240 height-adjustable workstations for Building C.',
      'States an approved budget ceiling of $186,000.',
      'Records a required-by date of 30 September 2024.',
      'Signed by the Procurement Director on 14 June 2024.',
    ],
    pages: [
      {
        page: 1,
        text: `NORTHSTAR COUNTY
OFFICE OF PROCUREMENT AND CONTRACTS
PURCHASE REQUEST — PR-2024-0418

Requesting department: Facilities and Building Services
Submitted: June 14, 2024
Prepared by: R. Castellanos, Facilities Manager
Approved by: D. Okonjo, Procurement Director

SUMMARY OF REQUEST

The Facilities and Building Services department requests the purchase of 240 height-adjustable workstations for the Northstar County administration building, Building C, floors 2 through 5. The request replaces fixed-height desks installed in 2009 that are no longer serviceable.`,
      },
      {
        page: 2,
        text: `SPECIFICATION

Item: Height-adjustable workstation, electric, 60" x 30" work surface
Quantity: 240 units
Delivery location: Northstar County Administration Building C, receiving dock, 14 Ridgeway Avenue
Required by: September 30, 2024

The requested quantity of 240 units reflects a per-floor allocation of 60 workstations across four floors. No spare units are included in this request.

BUDGET

An approved budget ceiling of $186,000 applies to this request, drawn from the FY2024 capital equipment line. The department is instructed not to exceed this ceiling without a separate authorization.`,
      },
      {
        page: 3,
        text: `PROCUREMENT METHOD

This request exceeds the county's informal purchase threshold and is therefore to be solicited competitively. The Office of Procurement and Contracts will issue a solicitation to vendors on the county's qualified supplier list.

Responses are to address unit price, delivery schedule, warranty and installation.

CERTIFICATION

I certify that the equipment described in this request is required for the operation of the department and that funds are available in the identified budget line.

Signed: R. Castellanos, Facilities Manager — June 14, 2024
Approved: D. Okonjo, Procurement Director — June 14, 2024`,
      },
    ],
  },
  {
    key: 'proposal',
    label: 'S2',
    title: 'Vendor Proposal — Halvorsen Office Systems.pdf',
    kind: 'file',
    format: 'pdf',
    filename: 'Vendor Proposal - Halvorsen Office Systems.pdf',
    mimeType: 'application/pdf',
    byteSize: 512_884,
    extractionConfidence: 0.96,
    summary:
      'A proposal from Halvorsen Office Systems offering 240 workstations at $742 per unit, totalling $178,080, with delivery committed for September 10, 2024 and installation over the following week.',
    keyPoints: [
      'Offers 240 units at $742 per unit, totalling $178,080.',
      'Commits to delivery on September 10, 2024.',
      'Offers installation between September 11 and September 17, 2024.',
      'Includes a five-year mechanical warranty.',
    ],
    pages: [
      {
        page: 1,
        text: `HALVORSEN OFFICE SYSTEMS
Proposal in response to Northstar County solicitation SOL-2024-0418

Submitted: July 12, 2024
Contact: M. Adeyemi, Account Director, Halvorsen Office Systems

Halvorsen Office Systems is pleased to submit this proposal for the supply and installation of 240 height-adjustable workstations for Northstar County Administration Building C.`,
      },
      {
        page: 2,
        text: `PRICING

Unit: Height-adjustable workstation, electric, 60" x 30"
Unit price: $742.00
Quantity: 240
Extended price: $178,080.00

Pricing is firm for 120 days from the date of this proposal and includes delivery to the receiving dock at 14 Ridgeway Avenue. Installation is included at no additional charge.`,
      },
      {
        page: 3,
        text: `WARRANTY AND SERVICE

Halvorsen Office Systems provides a five-year mechanical warranty on the lifting column and a two-year warranty on the control electronics. Service calls within Northstar County are answered within two business days.

Replacement components are held at the Halvorsen regional distribution centre.`,
      },
      {
        page: 4,
        text: `DELIVERY SCHEDULE

Halvorsen Office Systems commits to delivery of all 240 units on September 10, 2024 to the receiving dock at 14 Ridgeway Avenue.

Installation will be carried out between September 11 and September 17, 2024, in floor order beginning with floor 2. Halvorsen will provide two installation crews and will remove all packaging material at the conclusion of each day.

The delivery date stated above assumes purchase order issuance no later than August 9, 2024. Delay in purchase order issuance will move the delivery date by an equivalent number of business days.`,
      },
      {
        page: 5,
        text: `REFERENCES AND QUALIFICATIONS

Halvorsen Office Systems has supplied workstation equipment to municipal and county clients in the region since 2011. The company maintains a qualified supplier registration with Northstar County, registration number QS-3318.

Authorized signature: M. Adeyemi, Account Director — July 12, 2024`,
      },
    ],
  },
  {
    key: 'award',
    label: 'S3',
    title: 'Notice of Award NOA-2024-0418.pdf',
    kind: 'file',
    format: 'pdf',
    filename: 'Notice of Award NOA-2024-0418.pdf',
    mimeType: 'application/pdf',
    byteSize: 132_004,
    extractionConfidence: 0.98,
    summary:
      'A notice recording the award of solicitation SOL-2024-0418 to Halvorsen Office Systems on August 2, 2024 in the amount of $178,080, and directing that a purchase order be issued.',
    keyPoints: [
      'Awards SOL-2024-0418 to Halvorsen Office Systems on August 2, 2024.',
      'Records the award amount as $178,080.',
      'Directs issuance of a purchase order within ten business days.',
      'Names two other responding vendors.',
    ],
    pages: [
      {
        page: 1,
        text: `NORTHSTAR COUNTY
OFFICE OF PROCUREMENT AND CONTRACTS
NOTICE OF AWARD — NOA-2024-0418

Solicitation: SOL-2024-0418, Height-adjustable workstations
Date of award: August 2, 2024

Award is made to Halvorsen Office Systems in the amount of $178,080.00 for the supply and installation of 240 height-adjustable workstations.

Responses were received from three vendors: Halvorsen Office Systems, Meridian Facilities Group and Cedar Line Interiors. Evaluation was carried out against price, delivery schedule and warranty terms as published in the solicitation.`,
      },
      {
        page: 2,
        text: `BASIS OF AWARD

Halvorsen Office Systems submitted the lowest extended price of the three responses and met all published requirements. Meridian Facilities Group submitted an extended price of $184,320 with a delivery date of September 24, 2024. Cedar Line Interiors submitted a partial response and was found non-responsive.

DIRECTION

The Office of Procurement and Contracts will issue a purchase order to Halvorsen Office Systems within ten business days of the date of this notice.

Signed: D. Okonjo, Procurement Director — August 2, 2024`,
      },
    ],
  },
  {
    key: 'minutes',
    label: 'S4',
    title: 'Facilities Committee Minutes — September 4, 2024.pdf',
    kind: 'file',
    format: 'pdf',
    filename: 'Facilities Committee Minutes 2024-09-04.pdf',
    mimeType: 'application/pdf',
    byteSize: 604_338,
    extractionConfidence: 0.94,
    summary:
      'Minutes of the Northstar County Facilities Committee meeting of September 4, 2024, recording a status update in which the workstation delivery is described as scheduled for September 18, 2024.',
    keyPoints: [
      'Records a meeting held September 4, 2024.',
      'States the workstation delivery is scheduled for September 18, 2024.',
      'Notes that installation will follow delivery by one week.',
      'Does not record a formal amendment to the contract schedule.',
    ],
    pages: [
      {
        page: 12,
        text: `NORTHSTAR COUNTY FACILITIES COMMITTEE
Minutes of the regular meeting of September 4, 2024
Building C, Room 210, 9:00 a.m.

Present: R. Castellanos (Facilities Manager), D. Okonjo (Procurement Director), T. Whitfield (Committee Clerk), four committee members.

ITEM 6 — BUILDING C FURNITURE REPLACEMENT

The Facilities Manager provided a status update on the Building C workstation replacement programme.`,
      },
      {
        page: 13,
        text: `The Facilities Manager reported that the purchase order had been issued to the awarded vendor and that the vendor had confirmed production of the units was complete.

A committee member asked whether the September completion target for floors 2 and 3 remained achievable. The Facilities Manager responded that the installation crews had been booked and that the target remained the working assumption.

The Committee Clerk noted that the receiving dock would be unavailable on September 16 and 17 owing to scheduled maintenance.`,
      },
      {
        page: 14,
        text: `The Facilities Manager stated that delivery of the 240 workstations is scheduled for September 18, 2024, with installation to follow beginning the week of September 23.

The Committee noted the update. No formal amendment to the contract delivery schedule was tabled or approved at this meeting.

ITEM 7 — GROUNDS MAINTENANCE CONTRACT

The Committee turned to the grounds maintenance contract renewal. Discussion of Item 7 is recorded separately in Appendix B.`,
      },
      {
        page: 15,
        text: `ITEM 8 — ANY OTHER BUSINESS

No other business was raised.

The meeting closed at 10:42 a.m. The next regular meeting is scheduled for October 2, 2024.

Minutes recorded by T. Whitfield, Committee Clerk. Approved as a correct record on October 2, 2024.`,
      },
    ],
  },
  {
    key: 'invoices',
    label: 'S5',
    title: 'Invoice Register FY2024.xlsx',
    kind: 'file',
    format: 'xlsx',
    filename: 'Invoice Register FY2024.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    byteSize: 88_460,
    extractionConfidence: 0.99,
    summary:
      'A register of invoices received by the county finance office. Row 221 records invoice INV-4471 from Halvorsen Office Systems, dated September 22, 2024, for 240 units at a total of $178,080.',
    keyPoints: [
      'Row 221 records invoice INV-4471 for 240 units at $178,080.',
      'The invoice is dated September 22, 2024.',
      'The register records the invoice status as “Approved for payment”.',
      'No credit or adjustment entry appears against INV-4471.',
    ],
    // An extract of the register beginning at row 218, which is why `rowOffset`
    // is set: the viewer numbers rows 218–224 so they match the citations.
    sheet: {
      name: 'Invoices',
      rowOffset: 218,
      headers: ['Invoice No.', 'Vendor', 'Invoice Date', 'Description', 'Quantity', 'Amount', 'Status'],
      rows: [
        ['INV-4468', 'Cedar Line Interiors', '2024-09-12', 'Reception seating', '12', '$4,320.00', 'Paid'],
        ['INV-4469', 'Meridian Facilities Group', '2024-09-16', 'Floor 6 partitions', '30', '$21,900.00', 'Paid'],
        ['INV-4470', 'Northstar Print Services', '2024-09-19', 'Wayfinding signage', '48', '$3,264.00', 'Paid'],
        ['INV-4471', 'Halvorsen Office Systems', '2024-09-22', 'Height-adjustable workstations, Building C', '240', '$178,080.00', 'Approved for payment'],
        ['INV-4472', 'Halvorsen Office Systems', '2024-09-22', 'Installation labour, Building C', '1', '$0.00', 'Approved for payment'],
        ['INV-4473', 'Ridgeway Electrical', '2024-09-25', 'Power drop, floors 2-5', '4', '$9,860.00', 'Paid'],
        ['INV-4474', 'Cedar Line Interiors', '2024-09-27', 'Task chairs', '60', '$16,140.00', 'Paid'],
      ],
    },
  },
  {
    key: 'delivery',
    label: 'S6',
    title: 'Delivery and Receiving Report DR-2024-0912.pdf',
    kind: 'file',
    format: 'pdf',
    filename: 'Delivery and Receiving Report DR-2024-0912.pdf',
    mimeType: 'application/pdf',
    byteSize: 196_770,
    extractionConfidence: 0.95,
    summary:
      'A receiving report recording that a delivery from Halvorsen Office Systems arrived on September 21, 2024 and that 228 of 240 units were received, with 12 units recorded as back-ordered.',
    keyPoints: [
      'Records delivery received on September 21, 2024.',
      'Records 228 units received against an expected 240.',
      'Records 12 units as back-ordered with no stated delivery date.',
      'Signed by the receiving clerk on September 21, 2024.',
    ],
    pages: [
      {
        page: 1,
        text: `NORTHSTAR COUNTY
RECEIVING REPORT — DR-2024-0912

Delivery received: September 21, 2024, 08:40
Carrier: Halvorsen Office Systems, own fleet
Delivery location: Administration Building C, receiving dock, 14 Ridgeway Avenue
Purchase order: PO-2024-0761
Received by: J. Marsh, Receiving Clerk

The delivery arrived on September 21, 2024 and was checked against the purchase order at the dock.`,
      },
      {
        page: 2,
        text: `QUANTITY RECEIVED

Expected quantity: 240 units
Quantity received: 228 units
Quantity back-ordered: 12 units

Twelve units were not present on the delivery vehicle. The driver stated that the outstanding units were held at the regional distribution centre. No date for the outstanding units was provided at the time of delivery and none is recorded in this report.

CONDITION

Units were inspected at the dock. Two cartons showed external damage; the units inside were found undamaged on inspection and were accepted.`,
      },
      {
        page: 3,
        text: `NOTES

The receiving clerk recorded the shortfall on the delivery paperwork and retained a copy. A note of the shortfall was sent to the Facilities Manager on September 21, 2024.

Signed: J. Marsh, Receiving Clerk — September 21, 2024`,
      },
    ],
  },
  {
    key: 'memo',
    label: 'S7',
    title: 'Internal Status Memo — Building C programme.docx',
    kind: 'file',
    format: 'docx',
    filename: 'Internal Status Memo - Building C programme.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    byteSize: 41_226,
    extractionConfidence: 0.93,
    summary:
      'An internal memorandum of September 26, 2024 summarising the Building C programme. It refers to the vendor as “Halvorsen Supply Co.” and describes the delivery as having been completed on schedule.',
    keyPoints: [
      'Dated September 26, 2024.',
      'Refers to the vendor as “Halvorsen Supply Co.”',
      'States that the delivery was completed on schedule.',
      'Does not mention the back-ordered units.',
    ],
    pages: [
      {
        page: 1,
        text: `MEMORANDUM

To: Office of the County Administrator
From: R. Castellanos, Facilities Manager
Date: September 26, 2024
Subject: Building C workstation replacement — status

The Building C workstation replacement programme is substantially complete. Equipment was supplied by Halvorsen Supply Co. under purchase order PO-2024-0761.

Delivery was completed on schedule and installation is proceeding on floors 2 and 3. Floors 4 and 5 are expected to be completed during October.

No budget variance is anticipated. The invoiced amount of $178,080 is within the approved ceiling of $186,000.`,
      },
    ],
  },
]

/* --------------------------------------------------------------- entities */

export const DEMO_ENTITIES: {
  name: string
  type: 'person' | 'organization' | 'location' | 'document' | 'transaction' | 'other'
  role: string
  aliases: string[]
  description: string
  sourceKeys: string[]
  x: number
  y: number
}[] = [
  {
    name: 'Northstar County',
    type: 'organization',
    role: 'Purchasing authority named in the records',
    aliases: [],
    description: 'The county whose procurement records make up this case.',
    sourceKeys: ['request', 'award', 'minutes', 'delivery'],
    x: 0,
    y: 0,
  },
  {
    name: 'Halvorsen Office Systems',
    type: 'organization',
    role: 'Vendor named in the award and invoice records',
    aliases: ['Halvorsen Supply Co.'],
    description: 'The awarded vendor. One record refers to it by a different name.',
    sourceKeys: ['proposal', 'award', 'invoices', 'delivery', 'memo'],
    x: 320,
    y: -120,
  },
  {
    name: 'Meridian Facilities Group',
    type: 'organization',
    role: 'Named as a responding vendor',
    aliases: [],
    description: 'A vendor that responded to the solicitation but was not awarded.',
    sourceKeys: ['award', 'invoices'],
    x: 320,
    y: 140,
  },
  {
    name: 'R. Castellanos',
    type: 'person',
    role: 'Facilities Manager named in the records',
    aliases: [],
    description: 'Prepared the purchase request and the internal status memo.',
    sourceKeys: ['request', 'minutes', 'memo'],
    x: -300,
    y: -140,
  },
  {
    name: 'D. Okonjo',
    type: 'person',
    role: 'Procurement Director named in the records',
    aliases: [],
    description: 'Approved the purchase request and signed the notice of award.',
    sourceKeys: ['request', 'award', 'minutes'],
    x: -300,
    y: 120,
  },
  {
    name: 'J. Marsh',
    type: 'person',
    role: 'Receiving Clerk named in the delivery record',
    aliases: [],
    description: 'Signed the receiving report recording the quantity received.',
    sourceKeys: ['delivery'],
    x: 40,
    y: 300,
  },
  {
    name: 'Administration Building C',
    type: 'location',
    role: 'Delivery location named in the records',
    aliases: ['14 Ridgeway Avenue'],
    description: 'The building the equipment was ordered for.',
    sourceKeys: ['request', 'proposal', 'delivery', 'memo'],
    x: 20,
    y: -280,
  },
  {
    name: 'PO-2024-0761',
    type: 'transaction',
    role: 'Purchase order referenced by the delivery and memo records',
    aliases: [],
    description: 'The purchase order under which the equipment was supplied.',
    sourceKeys: ['delivery', 'memo'],
    x: 340,
    y: 340,
  },
]

export const DEMO_RELATIONSHIPS: { from: string; to: string; type: string; description: string; confidence: number }[] = [
  {
    from: 'Northstar County',
    to: 'Halvorsen Office Systems',
    type: 'paid',
    description: 'Invoice INV-4471 for $178,080 is recorded against the vendor in the county register.',
    confidence: 0.9,
  },
  {
    from: 'R. Castellanos',
    to: 'Northstar County',
    type: 'authored_by',
    description: 'Prepared the purchase request and the September status memo.',
    confidence: 0.88,
  },
  {
    from: 'D. Okonjo',
    to: 'Halvorsen Office Systems',
    type: 'related_to',
    description: 'Signed the notice of award naming this vendor.',
    confidence: 0.86,
  },
  {
    from: 'Halvorsen Office Systems',
    to: 'Administration Building C',
    type: 'occurred_at',
    description: 'Delivery was made to the receiving dock at this location.',
    confidence: 0.82,
  },
  {
    from: 'J. Marsh',
    to: 'PO-2024-0761',
    type: 'mentions',
    description: 'The receiving report records the delivery against this purchase order.',
    confidence: 0.8,
  },
  {
    from: 'Meridian Facilities Group',
    to: 'Northstar County',
    type: 'mentions',
    description: 'Named in the notice of award as a responding vendor.',
    confidence: 0.7,
  },
]

/* ----------------------------------------------------------------- claims */

export interface DemoClaim {
  statement: string
  category: string
  status: 'supported' | 'partially_supported' | 'contradicted' | 'unresolved' | 'context_only'
  materiality: 'low' | 'medium' | 'high'
  confidence: number
  reviewState: 'unreviewed' | 'reviewed' | 'approved' | 'needs_follow_up'
  analystNotes?: string
  evidence: { sourceKey: string; page?: number; row?: number; role: 'supporting' | 'contradicting' | 'context' }[]
}

export const DEMO_CLAIMS: DemoClaim[] = [
  {
    statement: 'The vendor proposal commits to delivery of all 240 workstations on September 10, 2024.',
    category: 'timing',
    status: 'supported',
    materiality: 'high',
    confidence: 0.94,
    reviewState: 'approved',
    evidence: [{ sourceKey: 'proposal', page: 4, role: 'supporting' }],
  },
  {
    statement: 'The delivery was recorded as received on September 21, 2024.',
    category: 'timing',
    status: 'supported',
    materiality: 'high',
    confidence: 0.93,
    reviewState: 'approved',
    evidence: [{ sourceKey: 'delivery', page: 1, role: 'supporting' }],
  },
  {
    statement: 'The equipment delivery was completed on the schedule committed in the proposal.',
    category: 'timing',
    status: 'contradicted',
    materiality: 'high',
    confidence: 0.88,
    reviewState: 'needs_follow_up',
    analystNotes:
      'The memo states the delivery was on schedule. The proposal commits to September 10 and the receiving report records September 21. No record in this case documents a schedule change being agreed.',
    evidence: [
      { sourceKey: 'memo', page: 1, role: 'supporting' },
      { sourceKey: 'proposal', page: 4, role: 'contradicting' },
      { sourceKey: 'delivery', page: 1, role: 'contradicting' },
      { sourceKey: 'minutes', page: 14, role: 'context' },
    ],
  },
  {
    statement: 'The invoice register records 240 units invoiced against invoice INV-4471.',
    category: 'quantity',
    status: 'supported',
    materiality: 'high',
    confidence: 0.96,
    reviewState: 'reviewed',
    evidence: [{ sourceKey: 'invoices', row: 221, role: 'supporting' }],
  },
  {
    statement: 'The receiving report records 228 units received, with 12 units back-ordered.',
    category: 'quantity',
    status: 'supported',
    materiality: 'high',
    confidence: 0.95,
    reviewState: 'reviewed',
    evidence: [{ sourceKey: 'delivery', page: 2, role: 'supporting' }],
  },
  {
    statement: 'The quantity invoiced matches the quantity recorded as received.',
    category: 'quantity',
    status: 'contradicted',
    materiality: 'high',
    confidence: 0.9,
    reviewState: 'needs_follow_up',
    analystNotes: 'The register shows 240 invoiced; the receiving report shows 228 received. No credit note appears in the register.',
    evidence: [
      { sourceKey: 'invoices', row: 221, role: 'contradicting' },
      { sourceKey: 'delivery', page: 2, role: 'contradicting' },
    ],
  },
  {
    statement: 'Solicitation SOL-2024-0418 was awarded to Halvorsen Office Systems on August 2, 2024 in the amount of $178,080.',
    category: 'authorization',
    status: 'supported',
    materiality: 'medium',
    confidence: 0.95,
    reviewState: 'approved',
    evidence: [
      { sourceKey: 'award', page: 1, role: 'supporting' },
      { sourceKey: 'proposal', page: 2, role: 'context' },
    ],
  },
  {
    statement: 'A revised delivery date of September 18, 2024 was communicated to the Facilities Committee.',
    category: 'communication',
    status: 'partially_supported',
    materiality: 'medium',
    confidence: 0.76,
    reviewState: 'reviewed',
    analystNotes:
      'The minutes record the date being stated to the committee. They also record that no formal amendment was tabled, so the records show the statement but not an agreed change.',
    evidence: [
      { sourceKey: 'minutes', page: 14, role: 'supporting' },
      { sourceKey: 'proposal', page: 4, role: 'contradicting' },
    ],
  },
  {
    statement: 'The 12 back-ordered units were subsequently delivered.',
    category: 'quantity',
    status: 'unresolved',
    materiality: 'high',
    confidence: 0.5,
    reviewState: 'needs_follow_up',
    analystNotes: 'No record in this case addresses what happened to the outstanding units after September 21.',
    evidence: [{ sourceKey: 'delivery', page: 2, role: 'context' }],
  },
  {
    statement: 'The invoiced amount of $178,080 is within the approved budget ceiling of $186,000.',
    category: 'financial',
    status: 'supported',
    materiality: 'medium',
    confidence: 0.92,
    reviewState: 'approved',
    evidence: [
      { sourceKey: 'memo', page: 1, role: 'supporting' },
      { sourceKey: 'request', page: 2, role: 'supporting' },
      { sourceKey: 'invoices', row: 221, role: 'supporting' },
    ],
  },
  {
    statement: 'The procurement was solicited competitively because it exceeded the county’s informal purchase threshold.',
    category: 'compliance',
    status: 'context_only',
    materiality: 'low',
    confidence: 0.8,
    reviewState: 'reviewed',
    evidence: [
      { sourceKey: 'request', page: 3, role: 'context' },
      { sourceKey: 'award', page: 2, role: 'context' },
    ],
  },
]

/* --------------------------------------------------------------- timeline */

export const DEMO_EVENTS: {
  occurredOn: string
  title: string
  description: string
  category: string
  precision: 'exact' | 'estimated' | 'range' | 'conflicting'
  confidence: number
  sources: { sourceKey: string; page?: number; row?: number }[]
}[] = [
  {
    occurredOn: '2024-06-14',
    title: 'Purchase request PR-2024-0418 submitted',
    description: 'The Facilities Manager submits a request for 240 height-adjustable workstations with a required-by date of September 30, 2024.',
    category: 'filing',
    precision: 'exact',
    confidence: 0.95,
    sources: [{ sourceKey: 'request', page: 1 }],
  },
  {
    occurredOn: '2024-07-12',
    title: 'Vendor proposal submitted',
    description: 'Halvorsen Office Systems submits a proposal of $178,080 for 240 units.',
    category: 'filing',
    precision: 'exact',
    confidence: 0.94,
    sources: [{ sourceKey: 'proposal', page: 1 }],
  },
  {
    occurredOn: '2024-08-02',
    title: 'Notice of award issued',
    description: 'The solicitation is awarded to Halvorsen Office Systems in the amount of $178,080.',
    category: 'decision',
    precision: 'exact',
    confidence: 0.96,
    sources: [{ sourceKey: 'award', page: 1 }],
  },
  {
    occurredOn: '2024-09-04',
    title: 'Facilities Committee status update',
    description: 'The Committee is told delivery is scheduled for September 18, 2024. No amendment to the contract schedule is tabled.',
    category: 'meeting',
    precision: 'exact',
    confidence: 0.92,
    sources: [{ sourceKey: 'minutes', page: 14 }],
  },
  {
    occurredOn: '2024-09-10',
    title: 'Delivery date committed in the proposal',
    description: 'The date the vendor proposal commits to for delivery of all 240 units.',
    category: 'delivery',
    precision: 'conflicting',
    confidence: 0.9,
    sources: [{ sourceKey: 'proposal', page: 4 }],
  },
  {
    occurredOn: '2024-09-18',
    title: 'Delivery date stated to the Facilities Committee',
    description: 'The date recorded in the minutes as the scheduled delivery.',
    category: 'delivery',
    precision: 'conflicting',
    confidence: 0.88,
    sources: [{ sourceKey: 'minutes', page: 14 }],
  },
  {
    occurredOn: '2024-09-21',
    title: 'Delivery received; 228 of 240 units recorded',
    description: 'The receiving report records the delivery arriving at 08:40 with 228 units received and 12 back-ordered.',
    category: 'delivery',
    precision: 'exact',
    confidence: 0.95,
    sources: [
      { sourceKey: 'delivery', page: 1 },
      { sourceKey: 'delivery', page: 2 },
    ],
  },
  {
    occurredOn: '2024-09-22',
    title: 'Invoice INV-4471 recorded in the register',
    description: 'The invoice register records 240 units at $178,080, approved for payment.',
    category: 'payment',
    precision: 'exact',
    confidence: 0.96,
    sources: [{ sourceKey: 'invoices', row: 221 }],
  },
  {
    occurredOn: '2024-09-26',
    title: 'Internal status memo issued',
    description: 'The memo describes the delivery as completed on schedule and refers to the vendor as “Halvorsen Supply Co.”',
    category: 'communication',
    precision: 'exact',
    confidence: 0.93,
    sources: [{ sourceKey: 'memo', page: 1 }],
  },
]

/* ---------------------------------------------------------- discrepancies */

export const DEMO_DISCREPANCIES: {
  title: string
  description: string
  type: 'date' | 'count' | 'name' | 'status'
  subject: string
  materiality: 'low' | 'medium' | 'high'
  confidence: number
  reviewState: 'unreviewed' | 'reviewed' | 'approved' | 'needs_follow_up'
  sideA: { sourceKey: string; page?: number; row?: number; statedValue: string }
  sideB: { sourceKey: string; page?: number; row?: number; statedValue: string }
}[] = [
  {
    title: 'Delivery date differs between records',
    description:
      'These records appear inconsistent regarding the reported delivery date. The vendor proposal commits to September 10, 2024, while the committee minutes record the delivery as scheduled for September 18, 2024 and the receiving report records the delivery arriving on September 21, 2024. No record in this case documents an agreed change to the contract schedule.',
    type: 'date',
    subject: 'delivery date',
    materiality: 'high',
    confidence: 0.92,
    reviewState: 'needs_follow_up',
    sideA: { sourceKey: 'proposal', page: 4, statedValue: 'September 10, 2024' },
    sideB: { sourceKey: 'minutes', page: 14, statedValue: 'September 18, 2024' },
  },
  {
    title: 'Invoiced quantity differs from quantity received',
    description:
      'These records appear inconsistent regarding the quantity of workstations. The invoice register records 240 units invoiced, while the receiving report records 228 units received with 12 units back-ordered. No credit note or adjustment entry appears in the register.',
    type: 'count',
    subject: 'workstation quantity',
    materiality: 'high',
    confidence: 0.94,
    reviewState: 'unreviewed',
    sideA: { sourceKey: 'invoices', row: 221, statedValue: '240 units' },
    sideB: { sourceKey: 'delivery', page: 2, statedValue: '228 units received' },
  },
  {
    title: 'Delivery described as on schedule while records show a later date',
    description:
      'The internal memo describes the delivery as completed on schedule. The proposal commits to September 10, 2024 and the receiving report records September 21, 2024. The records differ on whether the delivery met the committed schedule; CaseSignal does not resolve which characterisation is correct.',
    type: 'status',
    subject: 'delivery status',
    materiality: 'medium',
    confidence: 0.85,
    reviewState: 'unreviewed',
    sideA: { sourceKey: 'memo', page: 1, statedValue: 'completed on schedule' },
    sideB: { sourceKey: 'delivery', page: 1, statedValue: 'received September 21, 2024' },
  },
  {
    title: 'Organization name differs between records',
    description:
      'These records refer to what appears to be the same vendor using different names. The notice of award and the invoice register use “Halvorsen Office Systems”; the internal memo uses “Halvorsen Supply Co.” This may reflect a renaming, an abbreviation or a clerical difference — the records alone do not establish which.',
    type: 'name',
    subject: 'vendor name',
    materiality: 'low',
    confidence: 0.72,
    reviewState: 'reviewed',
    sideA: { sourceKey: 'award', page: 1, statedValue: 'Halvorsen Office Systems' },
    sideB: { sourceKey: 'memo', page: 1, statedValue: 'Halvorsen Supply Co.' },
  },
]

/* ---------------------------------------------------------------- copilot */

export const DEMO_QUESTIONS = [
  'Which records disagree about the delivery date, and what does each one say?',
  'How many workstations were invoiced, and how many were recorded as received?',
  'Was a revised delivery schedule formally approved?',
  'Build a chronology of everything these records date.',
  'What records would resolve the outstanding quantity difference?',
]
