# CaseSignal Design System

CaseSignal should read as a premium investigative research terminal crossed with a
modern editorial publication. Precision, neutrality, traceability, calm authority.

It is deliberately **not**: a crypto product, a political campaign site, a generic AI
chatbot, a cyberpunk intelligence terminal, a government portal, a law-enforcement
database, or a template-heavy startup landing page.

The single organising idea: **a claim is only as good as the passage behind it.**
Citations are the most visually distinctive element in the product, and everything
else recedes to let them read.

---

## 1. Surfaces

Two visual languages, deliberately different.

**Marketing** — editorial and full-bleed. The site fills the viewport edge to
edge; there is no outer frame, no floating canvas and no decorative browser
chrome. Atmosphere comes from a restrained backdrop applied to the hero band
only — cool archival light, faint grid coordinates, defocused paper fragments at
the far edges of wide viewports — so everything below the hero reads as a clean
document. Generous negative space; the composition does the work.

**Application** — calm, dense, fast. Warm page background, white working
surfaces, hairline borders, minimal shadow. The app must never look like the
marketing hero: it is a tool, not a poster.

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#FFFFFF` | Working surfaces, cards, the marketing canvas |
| `page` | `#F5F5F2` | App background, alternating marketing bands |
| `surface` | `#EFEFEB` | Inset areas, hover fills, chips |
| `ink` | `#111111` | Primary text, primary buttons |
| `ink-secondary` | `#676762` | Body copy, descriptions |
| `ink-muted` | `#92928C` | Labels, metadata, captions |
| `line` | `#DFDFD9` | Default 1px hairline |
| `line-strong` | `#C9C9C2` | Secondary button borders, emphasis rules |

Dividers are preferred over enclosing every element. If a border and a shadow
would both work, use the border.

---

## 2. Accent colour

Roughly **88% neutral / 9% evidence blue / 3% signal orange and status tones.**

**Evidence blue `#3F76C5`** (`evidence-soft #EDF2FB`, `evidence-border #C5D6F0`,
`evidence-deep #2F5AA0`) — and only for:

- selected citations and citation chips
- active navigation and active tab underline
- source connections and supporting relationships in the graph
- timeline focus states
- primary charts

**Signal orange `#E98243`** (`signal-soft #FDF0E7`, `signal-border #F5D2B8`) —
sparingly, for:

- unresolved discrepancies
- high-priority review items
- important processing states
- small marketing micro-details

Never use large rainbow gradients, neon, heavy blue-purple "AI" gradients, or
full-black page backgrounds.

### Status colours

| Status | Colour | Soft | Symbol |
| --- | --- | --- | --- |
| Supported | `#3D7A5A` | `#EAF3EE` | `=` |
| Partially supported | `#A67A16` | `#FBF3E0` | `≈` |
| Contradicted | `#B4544C` | `#F9EDEC` | `≠` |
| Unresolved | `#E98243` | `#FDF0E7` | `?` |
| Context only | `#767671` | `#F0F0EC` | `·` |

**Status meaning must never depend on colour alone.** Every status chip pairs its
colour with a text label and a monospace symbol, and the vocabulary lives in
`src/lib/domain.ts` so a status can never mean two things in two places.

Date precision uses the same rule: `●` exact, `◐` estimated, `▭` range,
`⚠` conflicting.

---

## 3. Typography

**Geist Sans** for interface and body, **Geist Mono** for citation labels,
locators and numeric identifiers. Both are self-hosted via the `geist` package —
no network fetch at build time. A restrained system serif stack is available as
`font-editorial` for occasional marketing statements; use it rarely or not at all.

| Token | Desktop | Mobile | Tracking |
| --- | --- | --- | --- |
| `display-lg` | 68px | — | −0.035em |
| `display-md` | 52px | — | −0.03em |
| `display-sm` | 40px | 40px | −0.028em |
| `section` | 50px | — | −0.03em |
| `section-sm` | 36px | 36px | −0.025em |
| App page title | 28–32px | 24px | −0.02em |
| `lede` | 17px | 16px | −0.005em |
| Body | 13.5–15px | 14–15px | 0 |
| Labels | 10–12px, uppercase | same | 0.12–0.16em |

Hero line height sits at 0.95–1.03. Headlines use `text-balance`; paragraphs use
`text-pretty` and cap at roughly 60–70 characters.

Interface text is never shrunk below 11px to imitate a reference. Numeric columns
carry the `.tabular` class so figures align.

---

## 4. Geometry

| Element | Radius |
| --- | --- |
| Large product preview | 20px (`rounded-preview`) |
| Application panels | 12px (`rounded-panel`) |
| Controls, inputs, buttons | 8px (`rounded-control`) |
| Pills | full — **only** for status, filters and compact navigation |

Do not put every label in a pill, and do not wrap every section in a rounded
card. Marketing sections are full-bleed bands separated by hairlines and surface
changes.

Shadows are soft, wide and low-opacity: `shadow-preview` for large product
previews, `shadow-float` for elements that genuinely float above the page.
Inside the app, shadows are minimal or absent.

---

## 5. Motion

Slow, deliberate, professional.

- Interface transitions: **180–260ms**
- Marketing transitions: **500–900ms**
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (`ease-editorial`)

Used for: document highlight movement, source-card entrance, evidence-line
drawing, status transitions, scroll-triggered section reveals.

Never: bouncing, constant floating, large parallax, cursor-following effects,
fast flashing, 3D.

The hero preview advances on its own for one pass, then hands control to the
visitor at the first interaction. `prefers-reduced-motion` disables autoplay
entirely and collapses every transition — enforced globally in `globals.css`.

---

## 6. Evidence primitives

These carry the brand.

**`.excerpt-mark`** — a highlighted passage. Pale blue fill with a 1px underline;
`data-active="true"` deepens the fill and adds a 2px evidence underline plus a
soft ring; `data-tone="conflict"` switches the whole treatment to the
contradicted palette. Transitions at 220ms so moving between citations reads as
motion along a document rather than a jump cut.

**Citation chip** — monospace source label plus locator, e.g. `S4 p. 14`,
`S5 Sheet "Invoices," row 221`, `S3 00:14:22`. Blue-tinted when active, neutral
otherwise. Always clickable; always opens the source at that exact location.

**Relationship lines** — 1–1.8px. Supporting relationships solid evidence blue;
contradicting relationships dashed in the contradicted red; context dotted in
neutral grey. Hovering names the relationship rather than relying on the line
style alone.

**Redaction bar** — a near-black rounded rectangle at low opacity, used only in
decorative archival backdrops. Never over real content.

---

## 7. Imagery

No stock photography. No AI robots, magnifying glasses, police tape, surveillance
imagery, campaign imagery, flags, courtroom photos or hacker screens.

Every visual is constructed from product primitives: fictional documents, tables,
case notes, timeline fragments, citation markers, graph nodes, redaction bars,
metadata rows and file tabs. Paper texture is CSS-generated and barely visible.

All document content shown anywhere is fictional and clearly safe.

---

## 8. Layout

**Marketing**: full-bleed sections with a 1280px content container and 104px
desktop / 64px mobile section padding. Sections alternate `canvas` and `page`
surfaces, separated by hairlines — the surface change is the section boundary.

**Application**: left rail 240px, right context panel 360px, centre takes the
remaining width with no artificial max-width in dense work views. Sticky toolbars
where the view scrolls.

**Breakpoints tested**: 375, 768, 1024, 1440 and wide desktop. No page may scroll
horizontally at any width.

Mobile is designed, not collapsed: bottom navigation, source and copilot panels as
drawers, tables that become stacked rows, a graph that offers a list view, and
large touch targets. Decorative backdrop fragments are dropped below `2xl` rather
than shrunk.

---

## 9. Components

The primitive kit lives in `src/components/ui`. Notable conventions:

- **Tabs** are a thin editorial strip: plain text with a 2px evidence underline on
  the active item. Never a filled pill.
- **Buttons**: `primary` (near-black), `secondary` (bordered white), `ghost`,
  `evidence` (blue, for citation-affirmative actions), `danger`, `link`. A
  `loading` state sets `aria-busy` and disables the control.
- **Empty states** are intentional, not apologetic: a short title, one sentence of
  orientation, and the action that resolves the state.
- **Every control** either performs its action, is disabled with a visible
  reason, or does not exist. There are no dead buttons.

---

## 10. Accessibility

- Semantic HTML; real `<table>` elements for tabular evidence.
- Visible focus: 2px evidence-blue outline at 2px offset, set globally.
- Dialogs manage focus and always carry a title (visually hidden where the design
  has none).
- Status, precision and relationship are conveyed by text and symbol as well as
  colour.
- The evidence graph has an equivalent list view, which becomes the default under
  `prefers-reduced-motion`.
- Contrast: body copy at `#676762` on `#FFFFFF` and all interactive text meets
  WCAG AA at its rendered size.

---

## 11. Voice

Precise, investigative, calm, evidence-first, professional. Never sensational,
never partisan, never overconfident.

Write: *"These records appear inconsistent regarding the reported delivery date."*

Never write: *"This proves that the organization lied."*

Brand lines, used sparingly:

- Every claim. Every source. One auditable trail.
- Investigate records, not rumors.
- Ask the case. Inspect the evidence.
- From raw records to a defensible dossier.
- Built for questions that require receipts.
