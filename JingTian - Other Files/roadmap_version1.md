# SQUARE / MyHealthReport — Software Development Roadmap, Version 1

**Document ID:** `ROADMAP-V1`
**Prepared:** 1 September 2026
**Scope:** End-to-end engineering roadmap for the 20-screen SQUARE platform defined in `Screen/Screen Reference.docx`, the legal artefacts in `Content/`, and the 26-module technical architecture in `Phase i/technical/MyHealthReport_Technical_Module_Architecture.md`.
**Status:** Engineering planning document. Not a clinical governance document, not legal advice, and not a substitute for the Malaysian counsel review and clinician sign-off that `Content/1. Terms & Conditions.docx` and `Content/Cardiovascular Domain Specification.docx` both require before production release.

---

## 0. How to read this document

### 0.1 The MMRC structure

Every feature block in this roadmap is written in four parts. The brief specified "Motivation – Method – Result – Result"; the second "Result" is clearly a different question (system-level effect and requirement), so it is written here as **Consequence**, which also makes the acronym literal:

| Letter | Heading | The question it answers |
|---|---|---|
| **M** | Motivation | What capability do we want, and why does the product fail without it? |
| **M** | Method | What structure, framework, tool, interface and protocol realises it? Concrete named choices, not categories. |
| **R** | Result | What is the expected observable outcome, its properties, and — stated honestly — its advantages *and* its disadvantages? |
| **C** | Consequence | What does this force on the rest of the framework? What must exist before it, what breaks if it changes, what does it cost the team permanently? |

A block whose **R** contains no disadvantages has not been thought about hard enough. Where a disadvantage is genuinely absent, the block says so explicitly rather than leaving the field empty.

### 0.2 Confidence labelling

Claims in this document are tagged where the distinction matters:

- **[established]** — a decision already recorded in an existing project document; this roadmap is restating, not inventing it.
- **[proposed]** — this roadmap's recommendation; a reasonable default, but a decision the team still owns.
- **[unverified]** — a figure or capability claim that has not been tested against a live source or a real workload. All performance numbers, accuracy targets and cost estimates in this document are **[unverified]** unless a citation is attached.
- **[blocked]** — cannot be settled by engineering; needs a named clinician, lawyer or business owner.

### 0.3 What already exists (the honest baseline)

| Artefact | State | Bearing on this roadmap |
|---|---|---|
| 20 screen mockups (`Screen/*.png`) | Complete, high-fidelity, visually consistent | The frontend section treats these as the design contract |
| `Screen/Screen Reference.docx` | Complete 20-screen master table, 6 functional groups | The functional contract for Section 1 |
| `Content/Cardiovascular Domain Specification.docx` | Complete v1.0, CV-01…CV-14 calculator register with thresholds and sources | The **only** clinically specified domain. Five other domains are unspecified. |
| `Content/1. Terms & Conditions.docx`, `Content/2. User Consent.docx` | Drafts with `[bracketed placeholders]`, explicitly not counsel-reviewed | Consent data model in Section 3 is derived from these; publication is **[blocked]** |
| `Phase i/technical/…Module_Architecture.md` | 26-module architecture, four-layer model, "never hard-code medical knowledge" rule | **[established]** — this roadmap builds on it, does not replace it |
| `Phase i/plan_model.md` | Stack decisions (Next.js/TypeScript, FastAPI/Python, PostgreSQL), three-front-end plan | **[established]** — Sections 1–3 honour these choices |
| `Phase i/Prototype1_Version2/` | Working 20-screen client-side prototype; cardiovascular engine traceable to the CV spec, five domains illustrative | The reference implementation of the UI and CV logic. **No backend, no auth, no persistence beyond `localStorage`.** |
| `Security/` | Threat model, staged testing plan, baseline findings (MHR-001 stored-XSS latency), SAST/DAST/LLM harness | **[established]** — Sections 4 and 6 extend this rather than restarting it |
| Version control | **The repository is not under git.** | Blocking prerequisite for Phase 0 in Section 7 |

### 0.4 Global assumptions this roadmap runs on

These are the load-bearing assumptions. If one is false, the section that depends on it must be re-planned, not patched.

| # | Assumption | If false |
|---|---|---|
| A1 | SQUARE remains **non-diagnostic wellness/health-information software** and is not classified as a medical device or clinical decision-support software requiring registration under Malaysian MDA regulation. | Section 7's phase plan gains a formal design-control, validation and clearance track measured in quarters, not sprints. This is the single highest-impact assumption in the document. **[blocked]** — needs a regulatory opinion. |
| A2 | Primary market is Malaysia; users are adults 18+; English and Bahasa Melayu at launch. | Reference-range, guideline-source and consent design all change per jurisdiction. |
| A3 | Health data may be stored in a Malaysian cloud region, and cross-border transfer to any AI/OCR vendor requires an explicit, documented lawful basis. | If no in-country region is usable for a needed service, that service is out. |
| A4 | Clinical thresholds are owned and versioned by a Malaysian-registered medical practitioner, not by engineers. | The rule engine has no legitimate content and the platform cannot ship. **[blocked]** |
| A5 | A user's own verification of extracted lab values (Screen 8) is a real control, not a formality — i.e. users actually check. | Extraction accuracy becomes a safety-critical property rather than a UX property, and Section 8's evaluation gates must tighten by an order of magnitude. |
| A6 | Launch scale is on the order of 10³–10⁴ users in year one, not 10⁶. | Cost estimates in Section 8 and capacity design in Section 2 change materially. |
| A7 | The team is small (roughly the four-person split in the module architecture: medical logic, two engineers, UI/marketing) with no dedicated SRE or security engineer at launch. | Sections 4 and 7 assume controls must be cheap to operate and mostly automated. |

### 0.5 Table of contents

1. Frontend
2. Backend
3. Database
4. Cybersecurity
5. Data and information flowmap
6. Testing and debug plan
7. Project development flow
8. AI implementation

- Appendix A — Keyword index for further study, by section
- Appendix B — Open decisions requiring a named human owner
- Appendix C — Limitations of this roadmap itself

---

# 1. Frontend

The frontend contract is fixed by twenty mockups and the master table. The engineering question is not *what* to build but *how to build it so that clinical wording, legal wording and safety pathways can never be authored in the client.*

## 1.0 The frontend's one architectural rule

Everything in this section is downstream of a single constraint inherited from the module architecture: **no clinical threshold, no classification boundary, no referral wording and no legal text is authored in frontend code.** The client renders `classification_code`, `urgency_level` and `content_key` values returned by the backend, and looks the display strings up in a versioned content bundle. A developer must not be able to change what "Grade 2 hypertension" means by editing a React component.

This is not style preference. It is what makes A4 (clinician ownership) enforceable and what makes Section 4's integrity controls meaningful.

---

## 1.1 Interaction model and application shell

**M — Motivation.**
The 20 screens are not 20 independent pages. They form one stateful journey (`Screen Reference.docx` §Core Journey Logic) with a four-step pipeline (Upload → Verify → Questions → Analysis) that a user can leave and resume, a persistent left sidebar in the authenticated area, and a distinct unauthenticated/setup chrome for screens 1–5. Rebuilding that state on every navigation would lose in-progress verification edits and half-answered questionnaires — the two places where losing state is most expensive to the user and most damaging to trust.

**M — Method.**
- **Framework:** Next.js (App Router) + TypeScript **[established, `plan_model.md`]**. React Server Components for the marketing surface (Screen 1) and the legal reading surfaces (Screens 4, 16 preview) where first-paint and SEO matter; client components for the wizard, dashboard and editable tables.
- **Three shells**, matching what the mockups actually show: `AuthShell` (Screens 1–3: split hero + card, no sidebar), `SetupShell` (Screens 4–5: centred stepper "Account Setup › Terms › Consent" with an *Exit Setup* affordance), `AppShell` (Screens 6–20: fixed left sidebar, top-right notification bell + avatar menu, content column). This mirrors the prototype's existing `ui/shell.js` split **[established]**.
- **Routing:** file-system routes under `/app`, with the pipeline as nested routes `/analysis/[reportId]/{upload,verify,questions,processing,summary}` so a resumed session deep-links to the exact step. The prototype's hash router is a `file://` artefact and does not carry forward.
- **State:** three tiers, deliberately separated —
  1. *Server state*: TanStack Query over the typed API client. Reports, results, analyses, profile. Cache keys include `analysis_version` so a re-run invalidates cleanly.
  2. *Draft state*: the Verify table and the questionnaire, held in a form store (React Hook Form + Zod schema mirrored from the backend contract) with autosave to a server-side draft endpoint on a debounce, **not** to `localStorage` (see 1.6).
  3. *Ephemeral UI state*: local component state. Never persisted.
- **Progress and interruption:** Screen 10 explicitly says "You may leave this page… we will notify you when your analysis is ready." That makes the analysis an async job with a resumable status view, not a blocking spinner — see 2.3 and 2.4.
- **Protocol:** JSON over HTTPS to the BFF (1.5). Long-running analysis status by Server-Sent Events with polling fallback (see 2.4 for why not WebSockets).

**R — Result.**
A user can close the tab mid-verification, return on another device, and land on the same step with their edits intact. Screens 8 and 9 — the two with real data-entry cost — never lose work. Deep links to `/reports/[id]/analysis` work from an email notification.

*Advantages:* resumability is a genuine product feature, not a nicety, given a questionnaire estimated at "about 4 minutes" and an 18-row verification table. Server-held drafts also mean the draft is covered by the same access control and deletion path as everything else. Route-level code splitting keeps the marketing page light even though the app bundle is large.

*Disadvantages:* three shells plus nested pipeline routes is more layout machinery than a 20-screen app strictly needs, and it will feel like over-engineering for the first month. Server-side draft autosave costs a write endpoint, a debounce policy, and a conflict story if the same user edits on two devices — we accept last-write-wins with a visible "updated on another device" notice rather than building merge. Next.js App Router pulls in a build/deploy pipeline that the current `file://` prototype does not have, so the prototype cannot be incrementally migrated; the UI is a rewrite against the same design.

**C — Consequence.**
Requires the BFF (1.5) and the async job model (2.3) to exist before Screens 8–11 can be built for real — so the frontend cannot be completed ahead of the backend, and Section 7 sequences them together. Requires a draft table in the database (3.4) that inherits the consent and deletion rules. Fixes the notification channel (2.4) as a hard dependency of Screen 10. Commits the team to a Node build toolchain and therefore to Section 4's supply-chain controls on the npm dependency tree.

---

## 1.2 Theme, design system and visual language

**M — Motivation.**
The mockups already are a design system — they are internally consistent to an unusual degree — and the value of extracting it explicitly is that clinical status colour becomes a *governed token* rather than a per-screen decision. In a health product, the difference between amber "Attention recommended" and red "Urgent" is a safety signal. It cannot be a designer's ad-hoc choice inside one component.

**M — Method.**
Read directly off the mockups:

| Token group | Value observed in `Screen/*.png` | Use |
|---|---|---|
| Brand primary | Deep teal (`#0F6E6E`-family) | Primary buttons, active nav, progress arcs, links |
| Brand ink | Dark navy (`#12284C`-family) | Headings, body text, logo wordmark |
| Surface | Off-white page (`#FAFAF8`-family), white cards, 12–16px radius, 1px hairline border, very soft shadow | All cards |
| Status: good/within range | Green | "Within expected range", "Matched", protective factors |
| Status: monitor | Blue-grey | "Monitor", "Stable" |
| Status: attention | Amber | "Attention recommended", "Needs attention", "Review" |
| Status: urgent/emergency | Red | Emergency care card (Screen 15), "Delete account" |
| Typography | Single geometric-humanist sans; large display headings (48–56px) on Screens 1–5, 28–32px page titles in-app; 14–16px body | — |
| Iconography | Single-weight line icons, ~1.5px stroke, teal or navy | — |
| Layout | 12-column, ~1440px design width, sidebar 240–260px fixed | — |

- **Implementation:** CSS custom properties as the single source of truth, consumed by Tailwind via `theme.extend` so utility classes and raw CSS agree. Tokens live in one file, generated from a `design-tokens.json`.
- **The safety-colour rule:** status colours are *never* referenced by hue. A component receives `urgency="PROMPT"` and resolves `--status-prompt`; there is no `text-amber-500` anywhere in the codebase. A lint rule (`no-restricted-syntax` on raw colour utilities outside the token layer) enforces it.
- **Accessibility:** WCAG 2.2 AA as the floor. Every status is carried by **icon + text label + colour**, never colour alone — the mockups already do this (a pill reads "Attention recommended", it is not just amber), so the rule is to preserve it. Contrast checked in CI (see 6.4). Focus rings visible on the teal primary. Screen 20 already scopes a "Language & Accessibility" settings group; text scaling to 200% must not break the sidebar or the Verify table.
- **Internationalisation:** `next-intl` with English and Bahasa Melayu bundles from day one **[established: Screen 2 shows an EN/BM toggle]**. All clinical display strings are keyed (`content_key`), never inlined — which also means a clinician can change wording via the Module 22 admin console without a frontend deploy.
- **Dark mode:** deliberately **out of scope for V1** **[proposed]**. The status palette is the safety-critical part and re-validating contrast for a second palette is real work with no user demand evidenced anywhere in the design set.

**R — Result.**
A themed component library (~35 components: `Card`, `StatusPill`, `RangeBar`, `DomainCard`, `MarkerRow`, `ConsentToggle`, `StepperHeader`, `SafetyBanner`, …) that reproduces all 20 mockups, plus a token file that a clinician-facing style guide can point at when defining what each urgency level looks like.

*Advantages:* status semantics become auditable — you can answer "show me everywhere the platform can display red" with a grep. Bilingual from the start avoids the far more expensive retrofit. Tokens make the eventual desktop/mobile front ends (`plan_model.md` §1) visually consistent for free.

*Disadvantages:* Tailwind + token indirection is more setup than hand-written CSS for a 20-screen app, and the indirection makes ad-hoc design tweaks slower. Building a component library before the backend exists risks building components against assumed data shapes; mitigated by driving Storybook from the same Zod schemas the API client uses. Bahasa Melayu doubles the clinical-copy review burden — every wording change needs two clinician-approved strings, and there is currently **no named owner for BM clinical translation [blocked]**.

**C — Consequence.**
Creates a permanent obligation: every new clinical status must be added to the token set and to both language bundles before it can be rendered. Makes the Module 22 admin console (2.6) a *frontend* dependency too, because that is where display strings will be edited. Forces the report PDF (2.7) to consume the same tokens, or the downloadable report will drift visually from the app.

---

## 1.3 HTML / CSS / JS architecture

**M — Motivation.**
Two failure modes have to be designed out. First, the one already found: `Security/BASELINE_FINDINGS.md` records **MHR-001 — the report renderer builds HTML by string concatenation with no escaping helper**, latent today and stored XSS the moment Module 5 ingests attacker-controlled lab names. Second, clinical logic leaking into components, which A4 forbids.

**M — Method.**
- **Layering** (preserved from the prototype, hardened): `content/` (i18n bundles, static copy) → `lib/api/` (typed client, Zod-validated at the boundary) → `lib/format/` (pure display formatters: units, dates, value-to-range position) → `components/` (presentational, no fetching) → `features/` (screen-level composition + hooks) → `app/` (routes). Dependencies point one way only, enforced by `eslint-plugin-boundaries`.
- **No engine code in the client.** `lib/format/` may compute *where a dot sits on a range bar* (Screen 12) because that is presentation. It may not compute *whether 3.6 mmol/L is "Attention"* — that classification arrives from the API. The dividing line is written into `CONTRIBUTING.md` and checked in review.
- **XSS posture — the direct answer to MHR-001:** React's JSX escaping is the default and `dangerouslySetInnerHTML` is banned by lint rule, with a single audited exception: the rich-text renderer for clinician-authored education content (Module 16), which takes structured Markdown-subset AST from the API, not HTML, and renders it through a whitelist component map. No HTML string concatenation anywhere. A Content-Security-Policy with a per-request nonce and no `unsafe-inline` is served by the BFF (4.6); the report PDF path (2.7) renders server-side in a sandbox and never in a user's browser session.
- **Forms:** React Hook Form + Zod, schemas generated from the backend OpenAPI spec so a field the server rejects cannot be silently accepted by the client. The Verify table (Screen 8) is the hardest form in the product — 18 editable rows × (value, unit, range) with per-row confidence and a required "I have reviewed…" attestation. It gets its own virtualised, keyboard-navigable table component with per-cell dirty tracking.
- **Charts:** a small declarative chart layer (Recharts or visx **[proposed]**) for Screens 1, 6, 12, 17. Every chart carries the mockups' own caveat text ("A trend describes change over time and does not by itself confirm improvement or disease") as a required prop, not an optional caption — so a chart cannot be shipped without its limitation.
- **Performance budget [proposed, unverified]:** ≤200 KB gzipped JS on the marketing route, ≤450 KB on the heaviest app route; LCP ≤2.5 s on a mid-tier Android over 4G. Enforced in CI by Lighthouse CI with hard budgets.

**R — Result.**
A codebase where the class of bug that MHR-001 represents is structurally impossible rather than merely absent, and where a reviewer can tell at a glance whether a PR is touching presentation or clinical meaning.

*Advantages:* the boundary lint rules make the "no clinical logic in the client" rule cheap to enforce continuously instead of expensively in review. Generated schemas eliminate a whole category of client/server drift. Required caveat props are an unusually effective control — they make the safe thing the only compiling thing.

*Disadvantages:* generated types couple the frontend release to the backend contract; a breaking API change blocks the frontend until regenerated, which is friction the team will feel weekly. The single audited `dangerouslySetInnerHTML` exception is a permanent soft spot requiring an escaping-and-sanitisation review whenever the education content model changes. Performance budgets on a data-dense dashboard (Screen 6 has an anatomical illustration, six domain cards, three chart widgets) will be tight; the anatomical body map likely needs to be an optimised SVG sprite rather than the bitmap in the mockup.

**C — Consequence.**
Requires the backend to publish a stable OpenAPI spec early — this makes 2.2 a Phase 1 deliverable, not a Phase 2 one. Requires the education content model (Module 16) to be structured, which rules out "let clinicians paste HTML" and pushes toward a constrained editor in the admin console. Ties CI (7.5) to Lighthouse and the boundary linter, adding ~2–4 minutes to every pipeline run.

---

## 1.4 Markdown / content page development

**M — Motivation.**
A large fraction of what SQUARE displays is *authored text under version control by non-engineers*: Terms and Conditions (Screen 4, with a table of contents, version, effective date and a Download PDF), the Privacy Notice, the consent item explanations behind every "Learn more" (Screen 5), the "Why we ask this" popovers (Screen 9), "What this marker represents" / "Why this result may matter" (Screen 12), "Why this helps" (Screen 14), and the Methods & Limitations section of the generated report (Screen 16, page 12). Every one of these has a legal or clinical owner and none of them should require a code deploy to change.

**M — Method.**
Two distinct content classes, deliberately handled differently:

1. **Legal documents (T&C, Privacy Notice, Consent text).**
   - Stored as MDX files in the repository under `content/legal/{locale}/{doc}/{version}.mdx`, with frontmatter: `version`, `effective_date`, `locale`, `approved_by`, `approval_date`, `supersedes`.
   - Immutable once published. A change creates a new version file; the old file is never edited. This is what makes the Screen 4 "Stores accepted version, date and time" requirement and the `User Consent` §11 audit-record requirement satisfiable.
   - Build-time rendered to static routes with an auto-generated on-this-page nav (Screen 4's left rail) and a pre-rendered PDF of the exact accepted version (Screen 4's Download PDF).
   - Change control: merging a new legal version requires review from a `LEGAL_OWNERS` code-owners group. `[blocked]` — that group is currently unnamed.

2. **Clinical/educational content (marker explanations, "why we ask", recommendation rationale, domain copy).**
   - **Not** in the repository. Authored in the Module 22 admin console, stored in the database as structured records keyed by `content_key` with `locale`, `version`, `status` (draft/in-review/approved/published/retired), `approved_by_clinician_id`, and a linked `guideline_source`.
   - Body stored as a constrained Markdown subset (paragraphs, lists, bold, inline links to other `content_key`s — no raw HTML, no scripts, no images in v1), parsed server-side to an AST and served as JSON.
   - Published content is served from a versioned bundle so a rendered report can be replayed exactly as the user saw it.

**R — Result.**
Legal text and clinical text both become reviewable, versioned artefacts with named approvers, and the frontend contains no authored prose at all beyond UI chrome. A dispute about "what did the user actually agree to on 12 March" is answerable from data, which is precisely what `Content/2. User Consent.docx` §11 demands.

*Advantages:* separates the two governance regimes that genuinely differ — legal text changes rarely and needs git-grade immutability and lawyer review; clinical text changes often and needs a clinician-friendly editor and no deploy. Storing clinical content in the DB is what allows a threshold-and-wording change to ship as data, matching the module architecture's core principle.

*Disadvantages:* two content systems is real complexity, and the boundary will occasionally be ambiguous (is the emergency banner text legal or clinical? — it is both; **[proposed]** treat it as legal, since T&C §4 and the Consent §5 EMERGENCY WARNING fix its wording). The constrained Markdown subset will frustrate content authors within about a month and there will be pressure to allow raw HTML — which must be refused, because that reopens MHR-001 through the admin console instead of through the upload path. Building an editor in the admin console is a non-trivial sub-project easily underestimated at a week when it is nearer three.

**C — Consequence.**
Makes the Module 22 admin console a **Phase 1** requirement, not a "later" one, because without it clinical content has nowhere to live. Requires the content versioning tables in 3.5 and the report-replay guarantee in 2.7. Requires a `content_key` naming convention agreed with the medical owner before the first marker explanation is written, or the keyspace becomes unmanageable — this is a cheap decision now and an expensive migration later.

---

## 1.5 Backend-for-frontend and API surface

**M — Motivation.**
The browser must never hold a token that can call the rule engine directly, and the frontend must never be able to request another user's report by changing an ID — R1 in `Security/THREAT_MODEL.md` is ranked **Critical** and is described there as "the most likely incident by far."

**M — Method.**
- A thin **BFF** layer (Next.js Route Handlers) between the browser and the FastAPI core. Its jobs, and only these: terminate the session cookie, attach the internal service credential, enforce that every resource path is scoped to the authenticated subject, set security headers and CSP nonce, and shape responses for the screen.
- **Session transport:** `HttpOnly`, `Secure`, `SameSite=Lax` cookie holding an opaque session reference — no JWT in browser-accessible storage, no access token in `localStorage`. Refresh handled server-side.
- **Resource addressing:** every user-scoped route is `/api/me/...`. There is no `/api/users/{id}/reports`. The subject is taken from the session, never from the path. Where an ID must appear (a specific report), it is a random 128-bit identifier (see 3.2 and MHR-003) and the backend re-checks ownership on every access regardless — belt and braces, because path-shape discipline alone is not an authorisation control.
- **Sharing (Screen 16 "Share Securely", Screen 19 "Active Shares"):** a share is a first-class object with recipient, expiry, `allow_download`, and a revocation state — never an unguessable URL alone. The recipient view is a separate route requiring the token *and* an email-verification step, and every access is logged.
- **Rate limiting** at the BFF on auth, upload and share-access routes.

**R — Result.**
The browser's maximum authority is "act as the logged-in user". An IDOR attempt has no URL to manipulate, and the share feature has an audit trail and a kill switch (Screen 20 "Log out of all devices", Screen 16 "Manage shared access").

*Advantages:* directly retires the top-ranked risk in the existing threat model by construction rather than by review. Keeps CSP nonce generation and header policy in one place. Lets the API core stay a clean internal service with a single trust relationship.

*Disadvantages:* an extra network hop adds latency (~10–30 ms **[unverified]**) and an extra deployable to operate. It is also a genuine architectural risk: BFFs accrete business logic. The rule here is that **the BFF may not contain any conditional that depends on a clinical value** — if it needs to know an urgency level to decide anything, that decision belongs in the core. Opaque sessions need a session store (Redis), adding an operational dependency and a new place where a `user_id` lives.

**C — Consequence.**
Requires Redis or equivalent from Phase 1. Requires the API core to be network-isolated from the internet — it must not be reachable except from the BFF, which shapes the whole deployment topology in 2.8. Makes "one more thing in the BFF" a standing review question for the life of the project.

---

## 1.6 Client-side storage and offline posture

**M — Motivation.**
The prototype persists an entire patient scenario — lab values, questionnaire answers, generated analysis — to `localStorage`. That is correct for a `file://` demo and unacceptable for production: it leaves health data on a possibly shared device, outside the deletion path promised in Screen 20 and the Consent §8 rights, and it is exactly the "PHI-in-storage" pattern `Security/tools/dom-sink-scan.js` is written to flag.

**M — Method.**
- **Rule: no health data in `localStorage`, `sessionStorage` or IndexedDB. None.** No lab values, no analysis output, no profile fields, no uploaded file contents.
- Permitted client storage: locale preference, sidebar collapsed state, last-viewed tab, "remember this device" identifier (an opaque, revocable, server-side-tracked value — see 4.2), dismissed-banner flags. Each documented in a short `client-storage.md` allowlist; anything not on the list is a review failure.
- Draft state persists **server-side** (1.1), not locally.
- **Offline:** V1 is online-only **[proposed]**. No service worker caching of API responses. The mobile companion in `plan_model.md` may revisit this; the web app should not, because an offline cache of health data is a device-security problem the team is not staffed to own (A7).
- **Session hygiene:** idle timeout with a warning, absolute session lifetime, full client cache purge on logout, and a "Log out of all devices" server-side session invalidation (Screen 20).

**R — Result.**
A user on a shared or borrowed machine leaves no health data behind after logout, and the "delete my data" promise in Screen 20 is actually completable, because there is no second copy the server cannot reach.

*Advantages:* closes an entire class of finding before it exists, makes deletion honest, and simplifies the PDPA data-subject-rights story to "the server is the only copy."

*Disadvantages:* every navigation costs a network round trip, so perceived speed depends on caching in memory (TanStack Query) and on backend latency — the dashboard (Screen 6) aggregates a lot and will need a single composed endpoint rather than six requests. Losing offline capability is a genuine product cost in a market where mobile connectivity varies. Users who expect a form to survive a browser crash will occasionally lose a few seconds of typing between autosaves.

**C — Consequence.**
Forces the dashboard-composition endpoint in 2.2. Forces autosave endpoints and therefore draft tables (3.4). Makes backend latency a *user-visible* property, which raises the priority of the caching design in 2.5. Gives Section 6 a concrete automated test: after logout, assert that browser storage contains nothing matching a set of PHI patterns.

---

## 1.7 Web server, hosting and deployment

**M — Motivation.**
Where the frontend runs is a data-protection decision as much as a performance one: a server-rendered health page has PHI in its render path, so "just put it on a global edge CDN" silently exports health data (A3, and R9 in the threat model).

**M — Method.**
- **Split the surfaces.** The marketing/legal surface (Screens 1, 4 content, Privacy Notice) is static and may be served from a CDN anywhere. The authenticated application is served from compute in the **AWS Asia Pacific (Malaysia) region (`ap-southeast-5`)** **[proposed]** — the region is open ([AWS](https://aws.amazon.com/local/malaysia/)), but *which managed services are actually available there* must be verified against the AWS regional services list before this is committed **[unverified]**.
- **Runtime:** containerised Next.js (Node) on ECS Fargate or equivalent, behind an ALB and AWS WAF. Not a serverless-edge deployment, because edge functions execute in regions we do not control.
- **CDN:** CloudFront in front of static assets only, with the authenticated app path either bypassing cache entirely or cached with `private, no-store` and an origin in-region.
- **TLS:** 1.3 minimum, HSTS with preload, no TLS 1.0/1.1.
- **Environments:** `local` → `staging` (synthetic data only, per `Security/RULES_OF_ENGAGEMENT.md`) → `production`. Staging is credential-gated and never contains a real patient report — this is a standing rule already recorded in project memory.
- **Deploy:** immutable image tags, blue/green or rolling with health checks, one-command rollback. Every deploy records the image digest and the content-bundle version in the release log.

**R — Result.**
Health data renders and stays in one jurisdiction; the marketing site is fast globally; a bad release is reversible in minutes.

*Advantages:* the split gives the performance benefit of a CDN without the compliance cost. In-region compute makes the cross-border-transfer register (5.6) short and defensible. Containers keep the eventual desktop/mobile backends on the same deployment substrate.

*Disadvantages:* a newer region typically has a narrower service catalogue and sometimes higher unit prices than the mature Singapore region **[unverified — verify both]**; if a service the design needs is absent, the choice is a worse architecture or a cross-border transfer with a documented basis. Latency for non-Malaysian users is worse than an edge deployment, which matters if A2 stops holding. Running containers rather than a managed platform is more operational work for a team with no SRE (A7) — this is the single largest ongoing ops cost in the frontend plan and is worth trading for a managed platform *only if* that platform can run in-region.

**C — Consequence.**
Fixes the deployment region for the whole platform, since backend and database must sit beside it. Makes "is this service available in `ap-southeast-5`?" a standing question for every new AWS dependency in Sections 2, 3 and 8. Requires the WAF ruleset and the staging-data rule to be operational before any external testing (6.7).

---

## 1.8 Frontend keyword index

`Next.js App Router` · `React Server Components` · `TypeScript` · `Tailwind + CSS custom properties` · `design tokens` · `WCAG 2.2 AA` · `next-intl` · `Zod` · `React Hook Form` · `TanStack Query` · `Server-Sent Events` · `MDX` · `content versioning` · `Content-Security-Policy nonce` · `Trusted Types` · `eslint-plugin-boundaries` · `Storybook` · `Lighthouse CI` · `Recharts / visx` · `virtualised table` · `BFF pattern` · `HttpOnly SameSite cookies` · `IDOR / BOLA` · `AWS ap-southeast-5` · `CloudFront` · `AWS WAF` · `ECS Fargate` · `blue/green deployment`

---

# 2. Backend

## 2.0 The backend's one architectural rule

From the module architecture, restated because everything below depends on it: **the rule engine is the only component permitted to turn a number into a clinical meaning.** Upload, OCR, LLM extraction, the API layer, the report generator and the frontend are all *transport* around it. Nothing derived from untrusted text may reach the engine's decision inputs except as a value that a human has verified (Screen 8) or that the engine itself has range-checked.

---

## 2.1 Core logic modules — service decomposition

**M — Motivation.**
Twenty-six modules is a good *conceptual* decomposition and a bad *deployment* decomposition. Twenty-six services for a four-person team (A7) would spend the whole first year on inter-service plumbing. But collapsing them into one process loses exactly the property the architecture exists to protect: that clinical logic is separately versioned, separately reviewed and separately deployable from the app.

**M — Method.**
A **modular monolith with two hard seams** **[proposed]**:

```
┌───────────────────────────────────────────────────────────┐
│  API CORE  (FastAPI, Python)          — one deployable    │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ app/        identity, consent, profile, reports,    │  │
│  │             sharing, notifications  (Mod 1–5,19–21) │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ══════════ SEAM 1: clinical package boundary ══════ │  │
│  │ clinical/   lab dictionary, units, ranges,          │  │
│  │             classification, rule engine, question   │  │
│  │             triggers, risk, red flags, domains,     │  │
│  │             recommendations, education, trends      │  │
│  │             (Mod 6–18)                              │  │
│  │             PURE. No I/O. No network. No DB access. │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
        │                                    │
        │ ══════ SEAM 2: process boundary ══════
        ▼                                    ▼
┌──────────────────────┐          ┌──────────────────────────┐
│ WORKER (Celery/ARQ)  │          │ EXTRACTION SERVICE       │
│ analysis jobs,       │          │ OCR + LLM extraction     │
│ report render,       │          │ (Mod 5) — isolated,      │
│ notifications        │          │ no DB creds, no egress   │
└──────────────────────┘          │ except to the vendor     │
                                  └──────────────────────────┘
```

- **Seam 1 (package boundary, enforced by import-linter):** `clinical/` is a pure Python package. Given a `ClinicalInput` dataclass it returns a `ClinicalOutput` dataclass. It cannot import `sqlalchemy`, `httpx`, `os.environ` or anything in `app/`. This is what makes the whole engine unit-testable as a pure function and what makes "the rule engine cannot be influenced by an LLM" checkable rather than aspirational.
- **Seam 2 (process boundary):** extraction runs in its own container with **no database credentials, no access to the report store beyond a single signed, short-lived URL for the one file it is processing, and egress restricted to the model/OCR vendor endpoint**. Boundary B in the threat model — untrusted PDF content becoming model instructions — is contained here by construction: even a fully successful prompt injection reaches a process that cannot read another user's data or write a classification.
- **Language/framework:** Python + FastAPI **[established, `plan_model.md`]**, Pydantic v2 models as the single schema definition, emitting the OpenAPI spec that generates the frontend client (1.3).
- **Rule engine implementation:** thresholds and classifications are **data**, not code. A rule is a row: `rule_id`, `parameter`, `operator`, `boundary`, `unit`, `applies_to` (sex/age/pregnancy/treatment predicates), `classification_code`, `guideline_source`, `version`, `effective_from`. The engine is a small, heavily tested evaluator over that table. Formulas that cannot be expressed as thresholds (Framingham CV-02, Friedewald CV-04, AIP CV-05, Castelli CV-06/07) are versioned Python functions in a registry keyed by `calculator_id` + `version`, each with declared `required_inputs`, `exclusion_criteria` and `output_contract`, exactly as the CV specification's §11 register describes.
- **Ordering is fixed and non-negotiable**, taken from the CV spec §6 "Recommended interpretation sequence": safety and established disease → sample/unit/validity gates → classification → whole-person risk → advanced lipids and discordance → modifiers → supplementary indices → actions. The pipeline is a declared sequence, not an emergent one, so a reviewer can point at the code and see that safety runs first.
- **Red-flag engine (Module 13) runs first and can veto.** Its output is computed before any recommendation is generated, and a non-`ROUTINE` pathway suppresses reassuring wellness copy. The CV spec's §8 escalation matrix is the initial content.

**R — Result.**
One API deployable plus a worker plus an isolated extraction container. The clinical package can be extracted into its own service later without changing its callers, because it already has no I/O.

*Advantages:* the small team ships and operates three things, not twenty-six, while still getting the isolation that actually matters. `clinical/` being pure means the entire clinical test suite (6.2) runs in seconds with no fixtures, which is what makes exhaustive boundary testing affordable. Rules-as-data delivers the "update a threshold without redeploying" requirement directly.

*Disadvantages:* a modular monolith degrades if the seams are not enforced — one `from app.db import session` inside `clinical/` and the property is gone, which is why the import-linter check is a *blocking* CI gate rather than advisory. Rules-as-data moves complexity from code into a schema that must itself be validated, and a malformed rule row is now a clinical-safety bug in *data*, requiring the same review rigour as code (see 3.5 and 4.7). Python is slower than compiled alternatives for the evaluator, which is irrelevant at A6 scale and would matter at 10⁶ users.

**C — Consequence.**
Requires the clinical rules schema (3.5) and its approval workflow before any real analysis can run. Requires the extraction service's network policy to be defined at infrastructure level, not application level (4.6). Forces every calculator to carry version metadata into the report (2.7, 3.6), which the CV spec §10 already demands. Makes `import-linter` and the pure-package rule permanent constraints the team must defend in review.

---

## 2.2 Interface contracts — how the pieces connect

**M — Motivation.**
The connections between interfaces are where a health platform quietly loses correctness: a unit assumed rather than declared, a report ID trusted rather than checked, an LLM's free text landing in a field the engine reads.

**M — Method.**

| Boundary | Protocol | Contract |
|---|---|---|
| Browser ↔ BFF | HTTPS/JSON, session cookie | OpenAPI-generated TS client; Zod-validated |
| BFF ↔ API core | HTTPS/JSON, mTLS or signed service token, private network | Same OpenAPI spec; subject asserted by BFF, **re-verified** by core |
| API core ↔ worker | Redis-backed queue (Celery or ARQ), idempotency key per job | Typed job payloads; jobs carry `analysis_version` + `ruleset_version` |
| Worker ↔ extraction | HTTPS/JSON over private network, one signed file URL per call | Extraction returns **candidate values only** — never classifications, never urgency |
| Extraction ↔ model vendor | HTTPS, vendor SDK, no-training / zero-retention configuration | See 8.3; every call recorded in the transfer register (5.6) |
| Anything ↔ `clinical/` | In-process Python function call | `ClinicalInput` → `ClinicalOutput`; no side effects |

Three contract rules do the heavy lifting:

1. **Canonical units at every internal boundary.** A value crossing any boundary carries `(value, unit, canonical_value, canonical_unit, original_value, original_unit)`. The original laboratory value is never overwritten — **[established]**, module architecture §7. `clinical/` accepts canonical units only and raises on anything else. Lp(a) is the explicit exception the CV spec §5.3 demands: **no fixed mg/dL↔nmol/L conversion is ever applied**; the native unit is carried through and the band is selected per unit.
2. **The extraction interface is value-only.** The response schema physically has no field for a classification, a severity, a risk band or a recommendation. A model that emits one has nowhere to put it. `Security/sast/semgrep-mhr.yml` already carries `mhr-llm-output-drives-clinical-logic` to catch violations **[established]**.
3. **Idempotency everywhere it matters.** Upload, analysis-start and share-create all take an idempotency key; a retried request returns the original result rather than creating a second report.

**R — Result.**
Every boundary is typed, versioned and testable in isolation, and the two highest-consequence integrity risks (unit confusion, model output reaching clinical logic) are prevented by schema shape rather than by discipline.

*Advantages:* schema-level prevention survives staff turnover in a way that convention does not. Carrying both original and canonical values makes the Screen 8 "keeps the laboratory-provided range and standardises values only for analysis" promise literally true and auditable.

*Disadvantages:* six-field value objects are verbose and will feel like ceremony on simple markers. Strict canonical-unit enforcement will reject real reports that use uncommon or ambiguous units, pushing them to manual entry — a real user-facing failure that must be measured (6.6), not assumed away. mTLS between BFF and core is operational overhead a small team may reasonably defer to a signed service token plus network isolation **[proposed: start with the latter, document the deferral]**.

**C — Consequence.**
Requires the unit conversion table (Module 7) to be complete for every marker in the lab dictionary before that marker can be analysed — so adding a marker is a data task with a clinician sign-off, not a code task. Requires a manual-entry path (Screen 7 "Enter results manually") to be a first-class flow, not a fallback stub, because strict validation guarantees it will be used.

---

## 2.3 Asynchronous analysis pipeline

**M — Motivation.**
Screen 10 is explicit: the analysis is a multi-stage job with visible per-stage progress ("Validating report data ✓ / Aligning units ✓ / Assessing health domains ⟳ / Running safety checks / Building personalised actions"), it "usually takes less than one minute", and the user may leave and be notified. That is a job with a state machine, not a request.

**M — Method.**
- **Job stages**, mirroring the screen one-to-one so the progress UI is truthful rather than decorative: `VALIDATING` → `NORMALISING` → `DOMAIN_ASSESSMENT` → `SAFETY_SCREEN` → `RECOMMENDATION_BUILD` → `COMPLETE` (plus `FAILED`, `NEEDS_USER_INPUT`).
- Each stage transition writes a row to `analysis_stage_events` with a timestamp. The progress bar reads real state. If a stage is slow, the UI says so honestly rather than animating.
- **Queue:** Redis + Celery (or ARQ **[proposed]** — lighter, async-native, fewer moving parts for this workload). Jobs are idempotent and safely retryable; a retry re-runs from the last completed stage.
- **`NEEDS_USER_INPUT`** is a first-class terminal-ish state: if validation finds a biologically implausible value or a missing unit, the job parks and the user is returned to Verify with that row flagged — the framework's "We detected potassium 8.4 mmol/L, please confirm" behaviour **[established]**.
- **Determinism requirement:** given the same verified inputs and the same `ruleset_version`, the pipeline must produce byte-identical clinical output. This is what makes the golden-case suite (6.2) meaningful and disputes resolvable. The LLM does not participate in this stage — it has already finished its work upstream in extraction (2.1).
- **Failure policy:** a failed analysis never renders a partial report. A failure that occurs *after* a red flag has been detected still surfaces the red flag — safety output is committed before the wellness output is built, so a crash in recommendation generation cannot suppress an urgent finding.

**R — Result.**
Analyses complete in well under a minute at A6 scale **[unverified — must be measured, the rule evaluation itself is milliseconds; the time is dominated by extraction, which happens before this stage]**, survive worker restarts, and produce reproducible output.

*Advantages:* the state machine makes Screen 10 honest and gives operations a precise place to look when something is slow. Committing safety output first is a small design choice with a large safety payoff. Determinism turns "why did my report say that" into a replayable question.

*Disadvantages:* a queue is a new failure mode and a new thing to monitor — stuck jobs, poison messages, dead-letter handling. Resumable-from-stage retry means intermediate state must be persisted, adding write volume. Strict determinism forbids anything time-dependent or random inside the pipeline, which is a constraint that will occasionally be inconvenient (for example, no "tip of the day" selection inside the analysis).

**C — Consequence.**
Requires the notification channel (2.4) and the job tables (3.4). Requires Section 6's golden-case suite to be built against a frozen `ruleset_version`. Requires that anything non-deterministic — model calls, external lookups — be moved strictly outside the analysis boundary, which is a design rule Section 8 must respect.

---

## 2.4 "Realtime" — what it actually needs to be

**M — Motivation.**
The brief asks for "cloud service for realtime computation", "realtime update computation logic" and "realtime ping to ensure activation." It is worth being precise, because building genuine realtime infrastructure here would add cost and attack surface for no clinical benefit — and, more importantly, *SQUARE must not present itself as a monitoring service.* T&C §4 states plainly: "SQUARE does not continuously monitor your data and may not detect deterioration, urgent abnormalities or emergencies." A live-updating health dashboard would contradict the platform's own legal position.

So the honest decomposition is three different things, only one of which is realtime:

**M — Method.**

**(a) Near-realtime job progress — a push channel, not a computation engine.**
Server-Sent Events from the BFF, one stream per in-flight analysis, carrying stage transitions from 2.3. SSE rather than WebSockets: the traffic is one-directional, SSE is plain HTTP (so it inherits the existing auth, CSP and WAF posture), it auto-reconnects, and it needs no new protocol at the load balancer. **Polling every 3 s is the mandatory fallback** where SSE is blocked by a proxy. Push notification (web push / email) for "your analysis is ready" when the user has left the page (Screen 10's "Notify me when ready" toggle).

**(b) Interactive recomputation — synchronous, in-request, and bounded.**
Several screens change derived values instantly: editing height/weight on Screen 18 changes BMI; entering a home BP reading on Screen 14 changes the 7-day average on Screen 17; toggling report sections on Screen 16 changes the page count. These are *derivations*, and the rule is that they are computed **server-side in the request** by the same `clinical/` functions the batch pipeline uses — never reimplemented in JavaScript. A `POST /me/derive` endpoint takes a candidate profile patch and returns derived values plus their classifications, without persisting anything. Response budget ≤150 ms p95 **[proposed, unverified]**.
Crucially: a derivation **does not re-run the analysis**. Existing reports are immutable (Screen 18 says so: "Existing reports remain unchanged"). Changing your weight updates your profile and your *next* analysis; it does not silently rewrite last month's report. Re-analysis is an explicit user action.

**(c) Liveness and activation checks — the "realtime ping".**
Three distinct mechanisms, often conflated:

| Purpose | Mechanism | Failure action |
|---|---|---|
| Is the process alive? | `GET /healthz` — process up, no dependency checks. Container orchestrator probe, ~10 s. | Restart the container |
| Is it able to serve? | `GET /readyz` — DB reachable, Redis reachable, migrations applied, ruleset loaded and checksum-valid. Load-balancer probe, ~15 s. | Remove from rotation |
| Is the *user's* session still valid? | Session heartbeat on the SSE channel + idle-timeout countdown in the UI (4.2) | Warn, then log out and purge client cache |
| Are the workers actually consuming? | Worker heartbeat row + a synthetic canary analysis run every 15 min against a fixed synthetic patient, asserting a known-good output hash | Page/alert on divergence or timeout |

The canary is the most valuable of these and the one most often omitted: it detects not just "the worker is down" but "the worker is up and producing the *wrong answer*" — for example after a bad ruleset publish. **[proposed]**

**R — Result.**
Progress feels live, derived values update instantly, and an outage or a silent clinical regression is detected within ~15 minutes without a human watching a dashboard.

*Advantages:* SSE costs almost nothing to add and removes the temptation of WebSockets. Server-side derivation is the single most important choice here — it is what stops BMI classification or BP category logic from being reimplemented in the client, which is A4's rule applied to the one place teams reliably break it. The output-hash canary is a genuine safety control, not just an uptime check.

*Disadvantages:* SSE holds an open connection per active analysis, which constrains connection limits and complicates some proxies; at A6 scale this is not a problem and at large scale it would need reconsidering. Server-side derivation means a network round trip for something a client could compute in a microsecond, so a slow connection makes the profile form feel sluggish — the mitigation is optimistic display of the *raw* value with the *classification* arriving asynchronously, never the reverse. The canary needs a maintained synthetic fixture whose expected hash must be updated on every intentional ruleset change, which is friction that people will be tempted to disable; it must be treated as a release step, not an obstacle.

**C — Consequence.**
Makes the derive endpoint a required part of the API surface. Establishes the immutability of generated reports as a system-wide invariant (3.6) — nothing may update a completed report in place. Requires a synthetic canary patient fixture to be maintained alongside the ruleset for the life of the product, and gives Section 6 a natural production-safety probe.

---

## 2.5 Caching, performance and capacity

**M — Motivation.**
Because no health data is cached in the browser (1.6), backend latency is directly the user's experience — particularly on Screen 6, which composes health status, recommendations, anthropometrics, six domain summaries, three trend widgets and recent reports.

**M — Method.**
- **Composed endpoints** for dense screens: `GET /me/dashboard` returns one shaped payload rather than the frontend making six calls. Same for `/me/analyses/{id}/summary`.
- **Cache what is immutable, never what is live.** Completed analyses, generated reports and published content bundles are immutable and therefore cacheable server-side by content hash. Profile, consent state and drafts are never cached.
- **Cache keys always include `ruleset_version` and `content_version`,** so publishing a new ruleset invalidates by construction rather than by remembering to flush.
- **Redis** for session store, queue and the immutable-object cache. Encrypted at rest and in transit; no PHI in cache keys.
- **Capacity [unverified]:** at A6 (10³–10⁴ users, perhaps 1–3 reports per user per year), steady-state load is trivial — the sizing constraint is not throughput but the extraction step's latency and cost (Section 8) and the burst behaviour of PDF rendering. Plan for two API replicas, two workers, one Redis, one Postgres with a read replica, and treat everything above that as a scaling exercise to be sized against measured data, not guessed now.

**R — Result.**
Dashboard loads in a single round trip; repeat views of a completed report are served from cache; a ruleset change cannot serve stale clinical content.

*Advantages:* versioned cache keys eliminate the most common and most dangerous caching bug in this domain — showing a classification computed under an old threshold as if it were current. Composed endpoints are also easier to authorise, since there is one ownership check instead of six.

*Disadvantages:* composed endpoints couple the API to screen layout, which is the classic BFF-creep problem in a different place; the mitigation is to keep them thin projections over the same underlying reads. Caching by content hash needs discipline about what is genuinely immutable — getting that wrong in the direction of "cacheable" is a correctness bug, so the default must be no-cache with explicit opt-in.

**C — Consequence.**
Requires `ruleset_version` and `content_version` to be first-class values available everywhere (3.5). Requires a documented list of cacheable object types, reviewed whenever a new object is added.

---

## 2.6 Medical knowledge admin service (Module 22)

**M — Motivation.**
A4 says clinicians own thresholds. That is only real if clinicians can *change* thresholds without an engineer. Without this service, "clinician-owned" degrades into "an engineer edits a file after a WhatsApp message," which is both a governance failure and — per the threat model's R7 — a security one, because an unaudited change to a reference range silently changes a clinical classification.

**M — Method.**
- Separate admin surface, separate authentication, hardware-backed MFA required, on a distinct hostname, IP-restricted where practical, and **never sharing a session with the patient app**.
- Roles: `clinical_author` (draft), `clinical_approver` (approve — must be a registered practitioner, with the registration number recorded), `content_editor` (education copy only), `support` (read-only, no clinical edit, no bulk export), `engineer` (schema and deploys, **explicitly not** clinical approval).
- **Four-eyes on publish:** author ≠ approver, enforced by the service. A publish creates a new immutable `ruleset_version` and writes an audit record with both identities, the diff, the guideline citation and the effective date.
- **Diff preview against golden cases:** before publishing, the console runs the proposed ruleset against the golden-case corpus (6.2) and shows exactly which cases change classification or urgency. A change that flips any case from a higher urgency to a lower one is highlighted in red and requires an explicit typed justification. This is the single most valuable feature in the admin console.
- Publishing is a *data* change but is treated with release discipline: staged to staging first, canary-checked (2.4c), rollback = re-point to the previous `ruleset_version`.

**R — Result.**
A clinician can update the MOH hypertension thresholds, see that it moves 14 golden cases from "Above optimal" to "Raised — confirmation required" and none downward, cite the guideline edition, and publish — with a permanent record of who approved what, when, and why.

*Advantages:* directly closes the SWOT's most-cited weakness ("no matrix-maintenance or versioning process") and the threat model's R7. The golden-case diff turns an abstract governance promise into a concrete, visible artefact at the moment of decision.

*Disadvantages:* this is a substantial sub-product — realistically several weeks of engineering that produces nothing a patient ever sees, which makes it the thing most likely to be deferred under delivery pressure. Deferring it is a mistake: every week without it accumulates rules edited by engineers, which is precisely the state the architecture exists to prevent. It also creates a high-value target — an attacker who compromises a `clinical_approver` account can change clinical logic for every user, which is why the MFA and four-eyes requirements are not negotiable.

**C — Consequence.**
Requires the ruleset and content versioning schema (3.5) and the golden-case corpus (6.2) to exist first — so those become Phase 1, ahead of most patient-facing polish. Adds a second frontend to build and maintain. Makes clinician availability a delivery dependency: no approver, no publishable clinical content **[blocked]**.

---

## 2.7 Report generation and export

**M — Motivation.**
Screen 16 shows a 12-page PDF with selectable sections, optional password protection, and secure sharing with expiry. The report is simultaneously the product's most valuable artefact and its highest-consequence leak (the threat model ranks generated reports at the top of breach severity, alongside source uploads).

**M — Method.**
- **Rendered server-side in the worker**, in a sandboxed headless browser with **no network access**, from a template that consumes the same design tokens (1.2) and the same content bundle as the app.
- **Content-addressed and immutable.** A generated report is stored under a hash; regenerating with different section selections creates a *new* artefact rather than mutating the old one. Version history (Screen 16 "Report version history", Screen 19 "View version history") is therefore free and truthful.
- **Every report embeds its provenance block** — `ruleset_version`, each `calculator_id@version` used, `content_version`, generation timestamp, and the source report identity. The CV spec §10 requires exactly this, and it is what makes a report replayable years later.
- **Storage:** object storage with SSE-KMS, private buckets, no public ACLs possible (account-level block), access only via short-lived signed URLs issued after an authorisation check. **Never** a long-lived or guessable URL — threat model R4.
- **Password protection** (Screen 16): applied at PDF encryption level; the password is never stored server-side in recoverable form and never sent in the same channel as the link.
- **Sharing:** as in 1.5 — a first-class object with recipient, expiry (default 7 days per the mockup), download permission, revocation, and per-access logging surfaced to the user in Screen 20's "Sharing & Access".

**R — Result.**
A portable, professional report the user controls; a share that can be revoked; a permanent, replayable record of what the platform concluded and on what basis.

*Advantages:* the no-network sandbox kills SSRF and external-resource-leak risks in one move. Content-addressing makes immutability and version history the same mechanism. The provenance block is the artefact that makes a dispute or an incident investigation tractable, and it is nearly free to add now and impossible to backfill later.

*Disadvantages:* headless-browser rendering is memory-hungry and is the most likely source of worker resource exhaustion — it needs its own queue with concurrency limits and a hard timeout, and it is a meaningful DoS vector if report generation is user-triggerable without rate limiting (it must be). PDF password protection gives users a false sense of strength (PDF encryption is only as good as the password chosen) and the UI should not overstate it. Every stored report is a permanent liability under the retention schedule, which makes 3.7's deletion design load-bearing.

**C — Consequence.**
Requires object storage, KMS and signed-URL infrastructure. Requires the retention and deletion machinery (3.7) to cover object storage, not just the database — a deletion that leaves the PDF behind is not a deletion. Requires the share object model in the schema (3.6).

---

## 2.8 Deployment topology and operations

**M — Motivation.**
A small team (A7) needs a topology it can reason about at 2 a.m., and one where the network layout itself enforces the trust boundaries from Section 5 rather than relying on application code.

**M — Method.**

```
Internet
   │  TLS 1.3
   ▼
[ WAF ] ── [ ALB ] ──► BFF (Next.js, public subnet, no DB creds)
                          │  private, service token / mTLS
                          ▼
                    API CORE (private subnet)
                     │        │          │
              Postgres    Redis     Object store (VPC endpoint)
               (private)  (private)
                          ▲
                          │ queue
                    WORKERS (private subnet, no inbound)
                          │  single signed file URL
                          ▼
                 EXTRACTION SVC (isolated subnet,
                   no DB creds, egress allowlist:
                   model/OCR vendor only)
                          │
                          ▼
                   [ vendor API ]   ← the only cross-border hop
```

- Everything except the BFF sits in private subnets with no inbound internet route.
- Egress is **default-deny** with an explicit allowlist per service. The extraction service's allowlist has exactly one entry.
- Secrets in a managed secret store with rotation; nothing in environment files in the repository; secret scanning in CI (Stage 1 of `Security/README.md`'s staged plan).
- Observability: structured JSON logs with a **PHI-redaction filter applied at the logger**, not at the call site (see 4.8); metrics for queue depth, stage durations, extraction latency/cost, canary status; traces across BFF → core → worker.
- Backups: Postgres PITR, object-store versioning, and — the part usually skipped — a **quarterly documented restore rehearsal** into an isolated environment with synthetic data.

**R — Result.**
A topology where the compromise of the internet-facing component yields no database credentials, and where the component handling untrusted attacker-controlled content is the most isolated thing in the system.

*Advantages:* the network diagram *is* the trust-boundary diagram (Section 5), so they cannot drift apart. Default-deny egress is the control that most reliably limits the blast radius of a compromised dependency — threat model's "compromised dependency or OCR/model vendor" adversary.

*Disadvantages:* private subnets, VPC endpoints and egress allowlists are meaningful setup work and a recurring source of "why can't this service reach that" debugging, which is a real tax on a team with no SRE. The extraction service's isolation makes it harder to debug — it cannot query the database to explain itself, so it must be diagnosable purely from its own structured logs. Restore rehearsals are the first thing dropped when busy; scheduling them as a calendar obligation with a named owner is the only thing that keeps them happening.

**C — Consequence.**
Fixes the infrastructure-as-code scope for Phase 1 (Terraform or CDK, in-repository, reviewed like application code). Makes the egress allowlist a change-controlled artefact — adding a vendor is a security review, not a config tweak. Requires the PHI-redaction logging filter before any production logging exists, because retrofitting redaction after logs contain PHI means purging log storage.

## 2.9 Backend keyword index

`FastAPI` · `Pydantic v2` · `modular monolith` · `import-linter` · `hexagonal / ports-and-adapters` · `rules-as-data` · `calculator registry` · `Celery / ARQ` · `Redis` · `idempotency keys` · `job state machine` · `Server-Sent Events` · `liveness vs readiness probes` · `synthetic canary` · `deterministic pipeline` · `content-addressed storage` · `SSE-KMS` · `signed URLs` · `four-eyes approval` · `golden-case diff` · `default-deny egress` · `VPC endpoints` · `structured logging with PHI redaction` · `OpenTelemetry` · `PITR backups` · `restore rehearsal`

---

# 3. Database

## 3.0 Modelling principles

Four rules govern every table below. They come from the module architecture and the CV specification, and they are the difference between a schema that can support a clinical audit and one that cannot.

1. **Raw ≠ derived ≠ classified.** The laboratory's value, the canonical value, and the classification are three separate stored things with three different provenances. Never overwrite the first with the second.
2. **Facts are append-only; opinions are versioned.** Measurements and uploads are immutable events. Classifications, recommendations and reports record the ruleset version that produced them.
3. **`NULL` is not an answer.** The module architecture is explicit: four states — `YES`, `NO`, `UNKNOWN`, `NOT_APPLICABLE` — plus `PREFER_NOT_TO_SAY`, which Screen 9 shows as a distinct option and which is *not* the same as unknown.
4. **Everything joins on `user_id`, and `user_id` is the deletion key.** If a table holds user data and cannot be reached from `user_id`, deletion is not possible and the table is a compliance defect.

**Engine:** PostgreSQL **[established]**, in-region (1.7), encrypted at rest with a customer-managed key, TLS-only connections, row-level-security policies as a second line behind application authorisation.

---

## 3.1 Identity and account registration

**M — Motivation.**
Screens 2 and 3 define a deliberately minimal registration — name, email, password, country, language, T&C checkbox, plus "Continue with Google" — with health questions explicitly deferred ("Your health profile will be completed securely after registration"). The schema must support that minimalism *and* the eligibility, representative-consent and identity-verification requirements that T&C §1–2 and Consent §9 impose.

**M — Method.**

```
users               user_id (uuid pk) · email_normalised (citext, unique)
                    · email_verified_at · full_name · country · locale
                    · status (ACTIVE|SUSPENDED|PENDING_DELETION|DELETED)
                    · created_at · last_login_at
                    · eligibility_confirmed_at   -- T&C §2, 18+
                    · is_representative_account (bool) + represented_subject_id?

credentials         credential_id · user_id · type (PASSWORD|OIDC_GOOGLE|PASSKEY)
                    · secret_hash (argon2id, PASSWORD only) · provider_subject
                    · created_at · last_used_at · revoked_at

mfa_factors         factor_id · user_id · type (TOTP|WEBAUTHN|SMS)
                    · enrolled_at · last_verified_at · revoked_at

sessions            session_id · user_id · device_fingerprint_hash
                    · created_at · last_seen_at · expires_at · revoked_at
                    · ip_country (coarse; NOT precise location)

auth_events         event_id · user_id? · type (LOGIN_OK|LOGIN_FAIL|RESET|
                    MFA_CHALLENGE|LOCKOUT|LOGOUT_ALL) · at · ip_hash · ua_hash
```

- Password hashing: **argon2id** with tuned parameters; never a fast hash. Breached-password check against a k-anonymity API at set-time **[proposed]**.
- Google OIDC (`Continue with Google`) links to the same `users` row via `credentials`; the email must be verified by the provider, and an account created via OIDC still has to pass the T&C/Consent gates before any health data can be stored.
- `is_representative_account` exists because T&C §1 and Consent §9 both contemplate acting for another person. V1 **[proposed]** does not enable it, but the column and the constraint exist so that enabling it later is not a migration of every downstream table.
- `ip_country` is coarse and derived; **precise location is never stored**, and the roadmap treats real-time location as out of scope entirely.

**R — Result.**
An account model that supports minimal signup, social login, MFA, device management (Screen 20 "Authorised devices", "Log out of all devices"), and a complete authentication audit trail.

*Advantages:* separating `credentials` from `users` makes adding passkeys later a row type rather than a schema change — and passkeys are the strongest realistic answer to credential stuffing for a consumer health product. `auth_events` gives the incident-response story a factual basis.

*Disadvantages:* `email_normalised` uniqueness creates the classic account-linking dilemma when someone registers with a password and later uses Google with the same address — the safe resolution (require password login, then link) is more friction than users expect, and the unsafe one (auto-link on email match) is an account-takeover vector. Storing `device_fingerprint_hash` for "Remember me" is a small privacy cost that must be disclosed. The representative-account columns are dead weight until enabled, and dead columns attract misuse.

**C — Consequence.**
Fixes the authentication design in 4.2. Requires session invalidation to cascade to the SSE channel (2.4). Makes `user_id` the deletion root — every table below must be reachable from it.

---

## 3.2 Consent, terms and legal record

**M — Motivation.**
`Content/2. User Consent.docx` §11 specifies the audit record almost as a schema already: "store each consent as a separate, versioned event rather than one bundled acceptance", including account identifier, exact consent text and document version, per-item choice, timestamp and time zone, collection channel, language, interface version, authentication method, and any later withdrawal with its effective time and downstream actions. The threat model rates forging a consent record as *worse than losing data*. This is the highest-integrity table in the system.

**M — Method.**

```
legal_documents     doc_id · kind (TERMS|PRIVACY|CONSENT) · version
                    · locale · effective_date · content_hash
                    · approved_by · approved_at        -- immutable
consent_items       item_id · doc_id · item_key · requirement (REQUIRED|OPTIONAL)
                    · text_hash                         -- exact wording shown
consent_events      event_id · user_id · item_key · doc_id
                    · choice (GRANTED|DECLINED|WITHDRAWN)
                    · occurred_at (timestamptz) · timezone_offset
                    · channel (WEB|MOBILE|SUPPORT) · locale · ui_version
                    · auth_method · session_id · text_hash
                    · representative_id? · representative_authority?
                    · superseded_by?                    -- APPEND ONLY
```

- The five items are exactly those in the Consent document and Screen 5: three **required** (`process_health_data`, `non_diagnostic_ack`, `professional_care_ack`) and two **optional** (`research_deidentified`, `communications`), with communications sub-channels (email/SMS/in-app) as separate keys.
- **Append-only, enforced at the database level:** no `UPDATE`, no `DELETE`, revoked via a trigger and a role that lacks those grants. A withdrawal is a new `WITHDRAWN` event, never a mutation.
- `text_hash` pins the *exact wording the user saw*, so the record survives a later rewording of the document.
- **Current state is a computed view, never a stored flag.** `consent_state(user_id)` derives the live position from the event log. A cached `has_consent` boolean anywhere in the codebase is a bug — it is how "consent revoked but processing continued" (threat model R6) actually happens.
- Optional consents must default to unticked and must not gate core access — Consent §2 and the T&C implementation sheet both require this, and the schema enforces it by making `requirement` a property of the item, checked at the API layer.

**R — Result.**
The platform can answer, for any moment in the past, exactly what a user agreed to and in what words — the auditability requirement stated in the T&C implementation sheet and the Consent §11 list.

*Advantages:* append-only plus text hashing makes the record defensible without relying on document archaeology. Deriving state from events makes revocation instantaneous and total by construction.

*Disadvantages:* deriving consent state on every request is a hot path; it needs a materialised view or a carefully invalidated cache, and *that cache is the exact thing R6 warns about* — so it must be invalidated by the same transaction that writes the event, never by a background job. Append-only conflicts with a naive reading of the "right to erasure": the resolution is that consent records are retained as legal-obligation evidence even after health data is deleted, with the user informed **[blocked — needs counsel confirmation]**. Storing `text_hash` rather than full text means the `legal_documents` content must never be lost, making that table a backup-critical asset.

**C — Consequence.**
Every read of health data must pass a consent check derived from this table, which means the check belongs in one enforced place (a repository-layer guard), not scattered. Requires the legal MDX pipeline (1.4) to compute and register `content_hash` at build time. Requires a documented, tested "consent withdrawn" workflow: what stops immediately, what is deleted, what is retained and why (3.7).

---

## 3.3 Uploaded documents and extraction lineage

**M — Motivation.**
The uploaded PDF or photo is the richest asset in the system — it carries name, IC number, referring doctor, laboratory identity and the full panel, more than the extracted values do — and the threat model ranks it first for breach severity. It is also the untrusted input that boundary A and boundary B exist to contain. And Screen 19 states the requirement plainly: "Original laboratory reports and SQUARE analyses are stored separately to preserve traceability."

**M — Method.**

```
source_documents    doc_id (random 128-bit) · user_id · storage_key
                    · sha256 · mime · bytes · page_count
                    · uploaded_at · upload_channel (FILE|CAMERA|MANUAL)
                    · lab_id? · report_date? · report_type?
                    · scan_status (PENDING|CLEAN|QUARANTINED)
                    · av_scanned_at · retention_class · delete_after

extraction_runs     run_id · doc_id · engine (OCR_VENDOR|LLM|MANUAL)
                    · engine_version · model_id? · prompt_version?
                    · started_at · finished_at · status
                    · token_cost? · vendor_request_id?
                    · cross_border (bool) · transfer_basis?

extracted_candidates candidate_id · run_id · page · bbox
                    · raw_test_name · raw_value · raw_unit · raw_range
                    · raw_flag · confidence numeric(4,3)
                    · mapped_test_code? · mapping_confidence?
                    -- CANDIDATES ONLY. No classification. No urgency.

verified_results    result_id · user_id · doc_id · candidate_id?
                    · test_code (FK lab_test_dictionary)
                    · original_value · original_unit
                    · canonical_value · canonical_unit · conversion_id
                    · lab_range_low · lab_range_high · lab_range_text
                    · lab_flag · specimen_date · fasting_status
                    · entry_mode (EXTRACTED_CONFIRMED|EXTRACTED_EDITED|MANUAL)
                    · verified_by_user_at · verification_session_id
```

- **`extracted_candidates` is quarantined data.** Nothing downstream reads it. The rule engine reads `verified_results` only, and a `verified_results` row cannot exist without `verified_by_user_at` — the Screen 8 attestation is a database constraint, not a UI convention. This is the structural implementation of A5.
- `entry_mode` records whether the user accepted, edited or hand-entered each value — which is the raw material for measuring extraction accuracy in production (6.6) without needing a separate labelling exercise.
- Files are stored in object storage, never in the database. `storage_key` is opaque and unguessable; `sha256` enables duplicate detection (Screen 19 shows a repeat-upload scenario) and integrity verification.
- **Antivirus and structural validation before any parsing**: file-type sniffing (not extension trust), page-count and size caps (Screen 7 says 20 MB), decompression-bomb limits, and rejection of PDFs with embedded JavaScript or external references — threat model R8.
- `cross_border` and `transfer_basis` on every extraction run make the PDPA transfer register (5.6) a query rather than a spreadsheet.

**R — Result.**
Complete lineage from a pixel on page 2 of a PDF to a number in a report, with the human verification step recorded, and with a structural guarantee that unverified machine output never reaches clinical logic.

*Advantages:* the candidate/verified split is the single most important safety decision in the data model. `bbox` enables the Screen 8 behaviour "select a row on the right to highlight it in the report", which is also the thing that makes verification genuinely easy rather than nominal — and A5 depends on verification being easy. Recording `engine_version`, `model_id` and `prompt_version` per run means an extraction regression can be traced to a specific model change.

*Disadvantages:* storing candidates indefinitely doubles the health-data footprint for data the user has already superseded; **[proposed]** candidates are purged 30 days after verification, retaining only aggregate accuracy statistics — but that trade sacrifices some forensic capability. Retaining the original document is legally and clinically justified (T&C §5 requires comparison against the original) but is the largest breach liability in the system, so its retention class must be short and explicit. Duplicate detection by hash fails on re-scans of the same paper report, which will produce user-visible duplicates.

**C — Consequence.**
Requires object storage with lifecycle policies keyed to `delete_after`. Requires the AV/validation step before the extraction service is ever invoked. Makes `lab_test_dictionary` (3.5) a prerequisite for any verified result to exist. Ties directly to Section 8: the extraction service's contract is defined by this schema, and it physically cannot return a classification.

---

## 3.4 Profile, history, questionnaire and drafts

**M — Motivation.**
Screen 18 shows a profile with per-field *source* labels (self-reported / device-measured / report-extracted / calculated), per-field last-updated timestamps, per-field review status, and a "profile completeness 82%" figure. That is not a flat user table; it is a temporal, provenance-tagged measurement store.

**M — Method.**

```
measurements        measurement_id · user_id · quantity_code
                    (HEIGHT|WEIGHT|WAIST|HIP|SBP|DBP|HR|...)
                    · value · unit · canonical_value · canonical_unit
                    · source (SELF|DEVICE|REPORT|CALCULATED|CLINICIAN)
                    · measured_at · recorded_at · context (e.g. BP setting,
                      readings_count, cuff, rest_period)
                    · superseded_by?          -- APPEND ONLY
                    · derived_from[]          -- for CALCULATED (BMI ← H,W)

health_history      answer_id · user_id · question_code
                    · answer (YES|NO|UNKNOWN|NOT_APPLICABLE|PREFER_NOT_TO_SAY)
                    · value_detail jsonb?  · asked_because (trigger_id)
                    · answered_at · source_screen · superseded_by?

medications         med_id · user_id · name_raw · rxnorm_or_local_code?
                    · class · started_at? · ongoing · reported_at
family_history      fh_id · user_id · relation · condition_code
                    · age_at_onset? · reported_at

drafts              draft_id · user_id · kind (VERIFY|QUESTIONNAIRE|PROFILE)
                    · subject_id · payload jsonb (encrypted)
                    · updated_at · device_label · expires_at
```

- **Append-only with `superseded_by`.** Editing a weight does not overwrite it; it inserts a new measurement and marks the old superseded. This is what makes Screen 17's trends, Screen 18's "View Change History", and the immutability of past reports all work off one mechanism.
- **BP is stored as individual readings with context, never pre-averaged** — the CV spec §2 is explicit: "store individual readings; do not average away a single extreme value before safety screening." The 7-day average shown on Screens 17 and 18 is a derived view over readings, computed at read time.
- `context` carries the CV spec's confirmation-logic inputs: measurement setting (clinic/home), number of readings, rest period, cuff size, recent caffeine/exercise.
- Drafts are encrypted at the column level and expire; they are the server-side counterpart of the no-local-storage rule (1.6).

**R — Result.**
Every quantity the platform records is a first-class, timestamped, provenance-tagged, append-only fact, usable identically for display, for trends and for analysis input.

*Advantages:* one uniform measurement model instead of a wide profile table means adding a new quantity (grip strength, HbA1c-from-device, sleep hours) is a dictionary row, not a migration. Provenance labels are directly required by Screen 18 and are also what let the confidence model (3.6) weight self-reported values differently from report-extracted ones. Append-only makes "existing reports remain unchanged" (Screen 18) true without any special handling.

*Disadvantages:* an EAV-shaped measurement table is harder to query than columns, needs careful indexing (`user_id, quantity_code, measured_at desc`), and loses some database-level type checking — the dictionary must therefore constrain unit and plausible range per `quantity_code`, and that constraint must be enforced on write. Append-only growth is unbounded for a user who edits often; acceptable at A6 scale, worth revisiting later. Free-text medication names without a coded vocabulary limit what the engine can do with them — coding medications properly is a real project **[proposed: V1 stores raw text plus a coarse class, and does not attempt interaction checking, which the Version 1 scope boundary already excludes]**.

**C — Consequence.**
Requires a `quantity_dictionary` alongside the lab dictionary (3.5). Makes the derive endpoint (2.4b) the only legitimate place to compute BMI, waist-to-height, BP category and 7-day averages. Requires column-level encryption support and key management for drafts.

---

## 3.5 Clinical knowledge base and versioning

**M — Motivation.**
This is the "medical knowledge database" of the module architecture and the "Four Master Matrices" of the framework. The SWOT identifies its absence as the framework's biggest weakness. It is also, per threat model R7, a security asset: tampering with a row here silently changes a clinical classification for every user.

**M — Method.**

```
lab_test_dictionary  test_code (LAB_LDL_C, ...) · standard_name
                     · aliases[] · loinc_code? · canonical_unit
                     · plausible_min/max · category · active

unit_conversions     conversion_id · test_code · from_unit · to_unit
                     · factor numeric · formula? · notes
                     · forbidden (bool)   -- e.g. Lp(a) mg/dL↔nmol/L

lab_reference_ranges range_id · lab_id · test_code · sex · age_low/high
                     · pregnancy · method? · low · high · unit
                     · effective_from · version
                     -- "is this outside THIS LAB's range?"

clinical_thresholds  rule_id · parameter · operator · boundary · unit
                     · predicate jsonb (sex/age/treated/diabetes/...)
                     · classification_code · urgency_level
                     · guideline_source · guideline_edition
                     · version · effective_from · retired_at
                     -- "does this meet a CLINICAL threshold?" — NEVER mixed
                        with lab_reference_ranges

calculators          calculator_id (CV-01..CV-14) · name · version
                     · required_inputs[] · exclusion_criteria jsonb
                     · output_contract jsonb · implementation_ref
                     · guideline_source · status (ACTIVE|RETIRED)

question_triggers    trigger_id · condition jsonb · question_codes[]
                     · priority · version
recommendations      rec_code (REC_DIET_001...) · trigger_condition jsonb
                     · content_key · priority_weight · contraindications jsonb
                     · version
education_content    content_key · locale · body_ast jsonb · status
                     · version · approved_by · approved_at

rulesets             ruleset_version · created_at · published_at
                     · author_id · approver_id · notes · content_checksum
                     · golden_case_diff jsonb
```

- **The two-range distinction is structural**, and it is the single most commonly botched thing in cross-lab health platforms: `lab_reference_ranges` answers "outside this laboratory's interval"; `clinical_thresholds` answers "meets a clinical decision threshold". They live in different tables, are surfaced differently in the UI (Screen 12 shows the laboratory range and a separate interpretation), and must never be joined into one concept. **[established]** — module architecture §8–9.
- `unit_conversions.forbidden` exists specifically for the CV spec's Lp(a) safeguard: the row's existence with `forbidden = true` makes an attempted conversion a loud error rather than a silent wrong answer.
- A **`ruleset_version` is an immutable snapshot** of every row above, checksummed. The engine loads one ruleset by version; it never reads "current" rows directly. Publishing is the four-eyes flow in 2.6.
- Every clinical row carries `guideline_source` and `guideline_edition` — MOH Hypertension 5th ed. (2018), D'Agostino 2008, ESC/EAS, KDIGO 2024, as cited in the CV spec §12 — so a guideline update produces a searchable list of affected rows.

**R — Result.**
A clinician-owned, versioned, checksummed knowledge base that the engine consumes as data, and against which "what changed and who approved it" is a query.

*Advantages:* closes the SWOT's central weakness. Makes guideline drift detectable: a report can flag "this ruleset cites MOH Hypertension 5th ed.; a 6th edition exists" as an operational alert. Checksums make R7 tampering detectable.

*Disadvantages:* this schema is large and is the highest-effort part of the data model, and it produces zero user-visible value until populated — which is why it is the most likely thing to be short-changed. The `predicate jsonb` field is powerful and dangerous: arbitrary JSON conditions are hard to validate and easy to get subtly wrong, so the predicate grammar must be closed and small (a fixed set of variables and operators), validated on write, and covered by the golden-case diff. Snapshotting whole rulesets duplicates data; acceptable, and far cheaper than the alternative of being unable to reproduce an old report.

**C — Consequence.**
Nothing clinical can ship until this is populated for at least the cardiovascular domain, which is why Section 7 makes CV-only the Phase 1 clinical scope. Makes the admin console (2.6) and the golden-case corpus (6.2) hard prerequisites. Gives Section 4 a concrete integrity target: ruleset checksums verified at load, and any mismatch failing `readyz` closed.

---

## 3.6 Analysis output, confidence, and completeness classification

**M — Motivation.**
This is the part of the brief that most needs a real design rather than a gesture: *"classification of user according to completeness of data for confidence level."* The mockups already demand it in three places — Screen 18's "Profile completeness 82%", Screen 13's "10-year ASCVD risk not calculated… SQUARE focuses on individual risk factors", and Screen 11's "18 markers reviewed / 4 domains assessed / 2 findings need attention". The CV spec makes it a contract: the standard output must state "criteria met and missing inputs", and metabolic syndrome must display "cannot fully determine" when a missing component could change the result.

The danger to design against is the obvious one: **a single global "confidence: 82%" score is worse than useless.** It invites a user to read a low number as "my health is uncertain" and a high number as "this is reliable", when neither follows. Confidence must be *per-output* and *actionable*.

**M — Method.**

```
analyses            analysis_id · user_id · doc_id? · created_at
                    · ruleset_version · content_version · engine_version
                    · status · safety_pathway (ROUTINE|MEDICAL_REVIEW|
                      PROMPT|URGENT|EMERGENCY)
                    · input_snapshot_hash        -- IMMUTABLE once COMPLETE

analysis_findings   finding_id · analysis_id · scope (MARKER|DOMAIN|RISK|
                      PATTERN) · subject_code (test_code | domain | calc_id)
                    · classification_code · urgency_level
                    · rule_ids[] · calculator_id? · calculator_version?
                    · inputs_used jsonb · inputs_missing[]
                    · eligibility (COMPUTED|NOT_ELIGIBLE|INSUFFICIENT_DATA)
                    · eligibility_reason_key
                    · confidence_band (A|B|C|D)
                    · content_key

analysis_actions    action_id · analysis_id · rec_code · rank
                    · content_key · target jsonb · status

decision_log        log_id · analysis_id · step_seq · step
                    · inputs_hash · rule_id? · output · ruleset_version · at
```

**The completeness / confidence model — four bands, computed per finding, never globally:**

| Band | Definition | UI treatment | Example |
|---|---|---|---|
| **A — Computed** | All `required_inputs` present, in-date, in canonical units, and no exclusion criterion met | Full result and interpretation | FRS with age, sex, TC, HDL-C, SBP, treatment status, smoking, diabetes all present |
| **B — Computed with caveats** | All required inputs present, but one or more is degraded: self-reported rather than report-extracted, stale beyond the marker's validity window, single reading where the guideline expects repeats, or non-fasting where fasting is preferred | Result shown **with the named caveat attached to it**, not in a footnote | AIP computed from a non-fasting triglyceride — CV spec §4.3 "prefer a fasting sample" |
| **C — Cannot fully determine** | A missing input *could change the classification*. The partial result is shown with what was met and what is missing | "Cannot fully determine — 2 of 5 components met; waist and fasting glucose missing" | Metabolic syndrome, exactly as CV spec §7.1 requires |
| **D — Not eligible / not calculated** | An exclusion criterion applies, or the model is not validated for this person | The calculation is **not shown at all**; the reason is | "10-year risk not calculated" at age 35, or FRS suppressed because established ASCVD is present — CV spec §3 "DO NOT CALCULATE" |

Rules that make this honest rather than decorative:

- **Band D is a suppression, not a low score.** When a calculator is ineligible, SQUARE shows *no number*. Screen 13's mockup already does this correctly and it must not regress into "risk: low confidence".
- **Band C requires naming the missing inputs and what they would change.** "Missing: waist circumference" plus a direct action to supply it (Screen 18's "Review Missing Information" and the "3 items need review" pill).
- **Confidence never upgrades urgency, and low confidence never downgrades a red flag.** A safety trigger fires on the values present; missing data cannot make an urgent finding routine. This is the asymmetry that keeps the model safe.
- **Profile completeness (the 82% on Screen 18) is a separate, explicitly non-clinical metric**: the fraction of *analysis-relevant* profile fields that are present and in-date, presented as "what would unlock more analysis", never as a health score. Its formula is stored as data (which fields, what weight, what staleness window) so a clinician owns it.
- `input_snapshot_hash` freezes the exact inputs; combined with `ruleset_version`, an analysis is fully replayable, which is what makes `decision_log` a real audit trail rather than a log file.

**R — Result.**
Every number on screen carries a truthful statement of how much it can bear, and the platform can explain — per finding — exactly what it used, what it lacked, and why it declined to compute something.

*Advantages:* directly satisfies the CV spec's standard output contract and its "cannot fully determine" requirement. Turns missing data into a specific, actionable prompt rather than a vague nag, which is also the strongest driver of profile completion. The suppression rule (Band D) is what keeps SQUARE on the safe side of the line the T&C draws.

*Disadvantages:* four bands per finding is more UI surface and more clinical copy to write and translate — every Band C and D needs an approved reason string in two languages, which is a real content burden **[blocked on the BM clinical translation owner]**. There is a genuine risk that users read Band B caveats as noise and stop seeing them; caveat fatigue is real and only measurable through user testing, not design review. Staleness windows per marker are another clinician-owned dataset that does not exist yet. And the honest limitation: **these bands describe input completeness, not predictive accuracy.** A Band A Framingham score is still a population estimate with wide individual uncertainty, and the confidence model must never be allowed to imply otherwise — the CV spec's own wording ("a population-based estimate, not a prediction of what will definitely happen to you") should sit next to any Band A risk output.

**C — Consequence.**
Requires per-marker validity windows and per-calculator `required_inputs`/`exclusion_criteria` (3.5) before any band can be computed. Requires the frontend to have a component that cannot render a finding without its band. Gives Section 6 a precise test class: for every calculator, assert the correct band for present / degraded / partial / excluded input sets.

---

## 3.7 Retention, deletion and data-subject rights

**M — Motivation.**
Consent §8 and Screen 20 promise access, correction, withdrawal, export and deletion. Threat model R6 flags "consent revoked but processing continues; no deletion path" as High. A deletion that misses object storage, backups, caches, logs or the search index is not a deletion.

**M — Method.**
- **Retention classes** on every data type, with a default and an owner: source documents (shortest), extracted candidates (30 days post-verification), verified results and analyses (retention schedule, **[blocked — needs counsel]**), consent records (legal-obligation retention, longer), auth events (security retention), operational logs (short, PHI-redacted).
- **Deletion is a job, not a `DELETE`:** `PENDING_DELETION` → identity confirmation (Screen 20: "Deletion requires identity confirmation and a final review") → grace period → cascade across Postgres, object storage, Redis, search index, and the backup-exclusion register → a `deletion_certificate` row retained as proof.
- **Backups are the honest hard part.** Point-in-time backups will contain deleted data until they age out. The defensible position is a documented, disclosed maximum backup horizon after which the data is gone, plus a rule that a restored backup is re-processed against the deletion register before being brought online. This must be stated in the Privacy Notice **[blocked]**.
- **Export** (Screen 20 "Download my data"): a machine-readable archive of profile, measurements, verified results, analyses, consents and generated reports, produced by the same worker infrastructure, delivered via a short-lived authenticated link, rate-limited (it is also an attacker's ideal exfiltration tool).
- **Withdrawal ≠ deletion.** Withdrawing `process_health_data` stops processing and blocks new analyses immediately, and the UI must state plainly, as Consent §8 does, that "SQUARE can no longer provide some or all core functions."

**R — Result.**
A tested, evidenced path from "delete my account" to "no recoverable copy outside a disclosed backup horizon", and an export a user can actually use.

*Advantages:* treating deletion as an orchestrated job with a certificate is the only version that survives an audit. Handling withdrawal and deletion as distinct flows avoids the common bug of treating a consent toggle as an erasure request.

*Disadvantages:* deletion cascades are fragile — every new data store added later must be registered in the cascade, and forgetting one is silent. This needs an automated test that creates a user, populates every table and bucket, deletes, and asserts absence everywhere (6.5). The backup horizon is a genuine, irreducible compliance compromise that must be disclosed rather than glossed. Export endpoints are a favourite exfiltration route and need rate limiting plus re-authentication.

**C — Consequence.**
Makes "which store did we just add?" a permanent checklist item. Requires the Privacy Notice to state the retention schedule and backup horizon — so the schedule is a *launch blocker*, not a post-launch tidy-up. Requires Section 6 to own a deletion-completeness test.

## 3.8 Database keyword index

`PostgreSQL` · `row-level security` · `argon2id` · `citext` · `append-only tables` · `temporal / bitemporal modelling` · `event sourcing (consent)` · `EAV measurement store` · `provenance tagging` · `LOINC` · `unit canonicalisation` · `reference range vs clinical threshold` · `ruleset snapshot + checksum` · `jsonb predicate grammar` · `content-addressed artefacts` · `decision log / clinical audit trail` · `confidence banding` · `eligibility suppression` · `retention class` · `deletion cascade + certificate` · `PITR backup horizon` · `data-subject access request (DSAR)` · `PDPA sensitive personal data`

---

# 4. Cybersecurity

## 4.0 The security thesis for this product

SQUARE is not a typical SaaS application with a security requirement bolted on. Two properties make its threat picture unusual, and both are already recorded in `Security/THREAT_MODEL.md`:

1. **The most valuable asset is the uploaded source document**, not the account. A lab PDF carries name, IC number, ordering doctor, laboratory and the full panel — more than the structured extract does.
2. **Integrity matters as much as confidentiality, because the output is a clinical pathway.** An attacker who *downgrades* an URGENT finding to ROUTINE causes harm without stealing anything. Most security programmes have no control for this. SQUARE must.

Everything below serves those two facts, layered on the staged harness that already exists (`Security/README.md` Stages 0–4) rather than replacing it.

---

## 4.1 Compliance frame and the obligations that are already binding

**M — Motivation.**
Health data is **sensitive personal data** under Malaysia's PDPA, and the 2024 amendment added obligations that are already in force — this is not future work.

**M — Method.**
Confirmed obligations to design against **[verified against published guidance; confirm the final application with counsel]**:

| Obligation | Requirement | Design consequence |
|---|---|---|
| Breach notification to the Commissioner | As soon as practicable and **within 72 hours** of the breach | Detection, triage and a pre-drafted notification pack must be operable inside 72 h — see 4.9 |
| Breach notification to data subjects | Without unnecessary delay, **within 7 days** of notifying the Commissioner | Need the ability to identify affected subjects precisely and contact them — which requires the lineage in 3.3 |
| DPO appointment | Mandatory where sensitive personal data of **more than 10,000 individuals** is processed (also >20,000 individuals for ordinary personal data, or regular and systematic monitoring) | SQUARE crosses this at 10,000 users. **[blocked — name the DPO before that point, not after]** |
| Express consent for sensitive personal data | Separate, specific, unbundled, withdrawable | The consent event model in 3.2 |
| Cross-border transfer | Requires a documented basis | The transfer register in 5.6 |

In force since **1 June 2025** for the breach-notification and DPO provisions ([DLA Piper Privacy Matters](https://privacymatters.dlapiper.com/2025/03/malaysia-guidelines-issued-on-data-breach-notification-and-data-protection-officer-appointment/)).

Alongside this: MMC guidance on telemedicine and on the ethical use of AI in medical practice, cited in the T&C's drafting references, governs how the platform may present automated output.

**R — Result.**
A short, concrete obligations list with dates, thresholds and owners, rather than a vague "be PDPA compliant".

*Advantages:* the 72-hour clock is the single most useful design forcing function in this section — it makes detection and evidence quality (4.8) an engineering requirement rather than a maturity aspiration.

*Disadvantages:* this roadmap is written by an engineer, not counsel; the mapping from obligation to control is a good-faith engineering reading and **must not be relied on as a compliance opinion**. Some obligations (retention periods, the lawful basis for a specific vendor transfer) genuinely cannot be resolved without legal input, and the roadmap marks them rather than inventing answers.

**C — Consequence.**
The DPO threshold makes user growth a compliance trigger — the team needs a tripwire at, say, 7,500 users. The 72-hour clock makes an incident runbook and a contactable on-call a launch requirement, not a Series-A requirement.

---

## 4.2 Authentication

**M — Motivation.**
Screens 2, 3 and 20 define the surface: email+password, Google OIDC, "Remember me", forgotten-password recovery, "future multifactor authentication", authorised-device management and "Log out of all devices". Credential stuffing against a consumer health login is the highest-volume realistic attack.

**M — Method.**
- **Passwords:** argon2id; minimum 12 characters with no composition rules (length beats character classes); breached-password rejection at set-time via k-anonymity range query. The mockup's "At least 8 characters" hint should be raised to 12 **[proposed — a design change to request]**.
- **MFA:** TOTP and WebAuthn/passkeys at launch as *available*, mandatory for staff and admin accounts, strongly prompted for users who enable sharing. SMS OTP only as a last resort (SIM-swap risk), and never as the sole factor for an admin.
- **Passkeys as the strategic target.** They eliminate phishing and credential stuffing for the users who adopt them, and the `credentials` table (3.1) already accommodates them.
- **Account recovery is the real attack surface.** Single-use, short-TTL, hashed-at-rest reset tokens; the reset link never reveals whether an account exists; a reset invalidates all sessions and notifies the account by email; recovery cannot bypass MFA without a documented, rate-limited, manually reviewed process.
- **Rate limiting and lockout:** per-IP and per-account exponential backoff, with a device-reputation signal; CAPTCHA only after repeated failure, never as a default barrier.
- **"Remember this device"** = an opaque server-side-tracked token bound to the session family, revocable individually from Screen 20's "Authorised devices", with a hard absolute lifetime.
- **Google OIDC:** verify `iss`, `aud`, `nonce` and `email_verified`; never auto-link to an existing password account by email match alone.
- **Session policy:** idle timeout (30 min **[proposed]**) with warning, absolute lifetime (12 h **[proposed]**), rotation on privilege change, and full server-side invalidation on "log out of all devices".

**R — Result.**
Authentication that is materially resistant to the two attacks that actually happen — credential stuffing and password-reset abuse — without imposing MFA friction on a first-time user uploading one report.

*Advantages:* keeping MFA optional for consumers but mandatory for admins puts the friction exactly where the blast radius is. Passkey support now costs little and ages well.

*Disadvantages:* optional consumer MFA means most accounts will have one factor, and a breached-password check is a partial mitigation, not a substitute. Raising the minimum password length contradicts a shipped mockup and needs a design decision. Every recovery-hardening measure increases genuine lockout for real users, and a health product locking someone out of their own results is a real harm — a documented, identity-verified manual recovery path is therefore necessary and is itself a social-engineering target that needs a written procedure.

**C — Consequence.**
Requires the credential, MFA, session and auth-event tables (3.1). Requires an email delivery path that is itself secured (SPF/DKIM/DMARC), since reset and share flows depend on it. Requires a written, rehearsed manual-recovery procedure before support staff exist.

---

## 4.3 Authorisation

**M — Motivation.**
R1 in the threat model — broken object-level authorisation — is ranked Critical and described as the most likely incident. It is also the most common serious flaw in health applications generally, because it is invisible in normal use.

**M — Method.**
Defence in depth, four layers, deliberately redundant:

1. **Path shape.** All user data is at `/api/me/...`; the subject comes from the session, never the URL (1.5).
2. **Repository-layer enforcement.** Every data-access function takes an explicit `actor` and filters by it. There is no `get_report(report_id)` in the codebase — only `get_report(actor, report_id)`. Enforced by a lint rule and code review.
3. **Postgres row-level security** as an independent backstop: policies on every user-scoped table keyed to a session variable set per transaction. If the application layer has a bug, the database still refuses. This is the layer that turns an IDOR from a breach into a 404.
4. **Consent gate.** A read of health data checks derived consent state (3.2) in the same repository layer, so "consent withdrawn but processing continued" (R6) is structurally prevented.

Plus:
- **Roles** (3.1 / 2.6): `user`, `support` (read-only, no clinical data by default, break-glass access with justification and notification to the user), `clinical_author`, `clinical_approver`, `engineer`, `dpo`. No role has both clinical approval and deployment rights.
- **No implicit admin.** Admin capability is a separate service, separate host, separate session, MFA-required.
- **Automated authorisation testing** is mandatory, not optional: for every user-scoped endpoint, a generated test asserts that user B receives 404 for user A's object. This runs in CI on every commit — it is the only reliable way to keep R1 closed as the API grows. `Security/checklists/authz-and-business-logic.md` already exists as the manual counterpart.

**R — Result.**
Four independent controls, any one of which prevents cross-tenant access, and a test suite that fails the build the moment a new endpoint forgets one.

*Advantages:* RLS is the highest-value single control here because it is enforced below the application and survives application bugs. The generated cross-tenant test suite is cheap and catches the exact regression class that manual review misses.

*Disadvantages:* RLS adds query-planning overhead and can be bypassed by a superuser connection or a poorly scoped migration — so the application's database role must never be superuser, and migrations need their own review. Break-glass support access is a genuine backdoor by design; it is only acceptable with mandatory justification, automatic user notification, and DPO-visible logging. Four layers means four places to update when a new resource type is added, and the temptation to skip one grows with delivery pressure.

**C — Consequence.**
Requires a non-superuser application role and RLS policies written alongside every table in Section 3 — a Phase 1 schema task, painful to retrofit. Requires the generated authorisation test harness in Section 6.

---

## 4.4 The SaaS security framework

**M — Motivation.**
"SaaS framework" here means the operating model that makes security continuous rather than a pre-launch event: which control framework the team maps to, how tenancy is handled, how vendors are governed, and what evidence accumulates for an eventual enterprise or clinical partner.

**M — Method.**
- **Tenancy model.** V1 is single-tenant-per-user within a shared database, isolated by RLS (4.3). If the employer-wellness or clinic route in the SWOT's opportunities is pursued, an *organisation* tenancy layer is needed — and retrofitting one is expensive. **[proposed]** Add `org_id` (nullable) to user-scoped tables now, even though nothing populates it, so the eventual migration is a backfill rather than a redesign. This is a cheap option to buy today.
- **Control framework:** map to **OWASP ASVS Level 2** for application controls and **CIS Benchmarks** for infrastructure as the day-one baseline; treat **ISO 27001** or **SOC 2 Type I** as the artefact to pursue only when a customer asks for it, since certification effort is significant and premature for a pre-launch team (A7). The ASVS mapping is the useful part — it is a checklist an engineer can act on.
- **Secure SDLC:** the staged plan in `Security/README.md` is the backbone and is already correct. Concretely: Semgrep + secret scanning in CI from the first server-side commit (Stage 1); dependency scanning and SBOM generation on every build; ZAP baseline nightly against staging (Stage 2); promptfoo evaluation and red-team runs per model change (Stage 3); agentic pentest then an independent external assessment before real patient data (Stage 4).
- **Vendor governance.** Every third party that can touch health data (model/OCR vendor, email provider, error tracker, analytics) requires: a data-processing agreement, a documented lawful basis for any cross-border transfer, a zero-retention / no-training configuration where the data is health data, and an entry in the transfer register (5.6). **Error trackers and product analytics are the most commonly forgotten processors and the most likely to leak PHI by accident** — see 4.8.
- **Change control.** Infrastructure as code, reviewed; clinical rulesets under the four-eyes flow (2.6); production access requiring MFA and generating an audit event.

**R — Result.**
A security programme sized for a four-person team that nonetheless produces the evidence trail (`Security/evidence/`) an enterprise buyer or clinical partner will ask for.

*Advantages:* ASVS L2 gives concrete, testable requirements rather than aspirational policy. The nullable `org_id` is an unusually high-value cheap decision. Continuous automated scanning means the eventual paid assessment finds interesting findings rather than obvious ones — which is exactly how `Security/README.md` frames it.

*Disadvantages:* ASVS L2 is a substantial checklist and a small team will not complete it before launch; the honest approach is to score it, publish the gaps, and close them on a schedule rather than claim conformance. Vendor governance is ongoing work nobody owns by default. Adding `org_id` now creates an unused column that must be defended in review for a year.

**C — Consequence.**
Requires a named security owner even at part-time capacity — with no owner, the staged plan degrades into scanners nobody reads. Makes the ASVS gap register a living document reviewed each phase gate (7.4).

---

## 4.5 Protecting the untrusted-input path

**M — Motivation.**
Boundaries A and B — file parsing and model prompting — are where an attacker gets to send content of their choosing into the system. Threat model R2 (prompt injection altering extracted values or classification) and R8 (malicious PDF) both live here, and R2 is ranked Critical.

**M — Method.**
- **Before parsing:** magic-byte type detection (never extension trust), size and page caps, decompression-bomb limits, rejection of PDFs containing JavaScript, embedded files or external references, image dimension caps, AV scan, and rendering/parsing in the isolated extraction container with no database credentials and a single-entry egress allowlist (2.8).
- **Against prompt injection (the structural answer):** the defence is not a better prompt, it is the architecture. Model output can only populate `extracted_candidates`, whose schema has no classification field; candidates cannot reach the rule engine without human verification (3.3); and `clinical/` is a pure package that takes typed values, not text. A perfectly successful injection therefore yields, at worst, *wrong candidate values presented to the user for verification* — which is bad, and is exactly what Screen 8 exists to catch, and is why A5 is a load-bearing assumption.
- **In addition, not instead:** delimiter/structure discipline in prompts, an instruction-ignoring system prompt, output schema validation with rejection on violation, plausibility range checks per marker (a potassium of 84 fails before a human sees it), and the promptfoo injection corpus already in `Security/llm/` run per model or prompt change.
- **Rendering untrusted strings:** lab names and free text from a report are attacker-controlled and are rendered in the app and the PDF. MHR-001 is the existing finding; the fix is React's default escaping plus a ban on HTML string construction (1.3), and `Security/tools/xss-probe.js` is the regression test.
- **Server-side rendering of the report** happens with no network access, so an injected external reference cannot exfiltrate (2.7).

**R — Result.**
The worst realistic outcome of a hostile upload is a bad candidate value shown to the user for verification, not a changed classification, not code execution, not data egress.

*Advantages:* placing the defence in the schema and the process boundary rather than the prompt is what makes it durable across model changes — a new model version cannot weaken it. The plausibility gate is cheap and catches both attacks and ordinary OCR errors.

*Disadvantages:* the guarantee rests on A5 (users actually verify). If verification becomes a reflexive click-through — and at scale it will for many users — then extraction accuracy is doing safety work it was not designed for. The mitigations are: make high-risk values (anything that would trigger a red flag, anything implausible) *require* explicit per-row confirmation rather than a single blanket attestation, and measure edit rates in production (6.6). Strict file rejection will refuse some legitimate reports, particularly phone photographs and unusual lab PDFs, pushing users to manual entry.

**C — Consequence.**
Requires per-marker plausible ranges in the dictionary (3.5). Requires a per-row confirmation UX for high-risk values — a change to Screen 8's single-checkbox design **[proposed — a design decision to raise]**. Makes promptfoo a CI gate once extraction is live (Stage 3).

---

## 4.6 Platform and transport hardening

**M — Motivation.**
The cheap, high-value controls that are almost free at build time and expensive to retrofit.

**M — Method.**
- **Headers:** CSP with per-request nonce, no `unsafe-inline`, `strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`; Trusted Types where supported; HSTS with preload; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` denying camera except on the upload route (Screen 7 "Take a Photo"), and denying geolocation entirely; `X-Content-Type-Options: nosniff`; `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy`.
- **Cookies:** `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` prefix, no domain attribute.
- **CSRF:** double-submit token plus origin checking on state-changing routes, in addition to `SameSite`.
- **TLS:** 1.3 only where clients permit; modern cipher suites; certificate automation.
- **Encryption at rest:** customer-managed KMS keys for the database, object storage and backups; column-level encryption for drafts and any free-text symptom fields; documented key rotation.
- **Secrets:** managed secret store, rotation, no secrets in the repository, secret scanning in CI and in pre-commit.
- **Dependencies:** lockfiles committed, automated update PRs, SBOM per build, and a policy that a new runtime dependency in the extraction service — the most sensitive process — requires explicit review.
- **Identifiers:** 128-bit cryptographically random IDs for every externally visible object; `Math.random` is banned (MHR-003) and caught by the existing DOM sink scanner.

**R — Result.**
A platform where the standard automated attacks — XSS, CSRF, clickjacking, mixed content, enumeration by sequential ID — have no purchase.

*Advantages:* almost all of this is one-time configuration with permanent benefit, and a strict CSP is the second line of defence behind React escaping for the MHR-001 class of bug.

*Disadvantages:* strict CSP breaks third-party embeds and inline scripts, which will cause friction the first time marketing wants an analytics or chat widget — and the correct answer will sometimes be "no", which is an organisational cost, not a technical one. Customer-managed keys add operational responsibility: losing a key loses the data. Aggressive dependency updates introduce their own risk and need staging soak time.

**C — Consequence.**
Requires a documented key-management procedure and an owner. Makes the camera permission route-scoped, which constrains where upload-by-photo can live in the IA. Adds SBOM storage to the evidence trail.

---

## 4.7 Clinical integrity as a security control

**M — Motivation.**
This is the section most security programmes do not have, and for SQUARE it is arguably the most important. `Security/THREAT_MODEL.md` §5 states it directly: an attacker who downgrades an URGENT pathway causes harm without stealing data. The project's own memory records the rule that model output must never set a severity, pathway or risk band.

**M — Method.**
- **Ruleset integrity:** each `ruleset_version` is checksummed at publish; the engine verifies the checksum at load and **fails `readyz` closed** on mismatch. A tampered ruleset takes the service out of rotation rather than serving wrong classifications.
- **Signed publication:** the publish action is signed by the approver's credential and recorded with author, approver, diff and guideline citation (2.6).
- **Downgrade logging:** any analysis whose safety pathway is lower than the same inputs would have produced under the previous ruleset is logged as a distinct event and surfaced in the golden-case diff before publication, not discovered afterwards.
- **Non-influence invariant:** `clinical/` is a pure package with no I/O (2.1), so nothing derived from untrusted text can reach it except as a verified value. `mhr-llm-output-drives-clinical-logic` in `Security/sast/semgrep-mhr.yml` fails the build on violations **[established]**.
- **Production canary** (2.4c): a synthetic patient analysed every 15 minutes with an asserted output hash. This detects a silent clinical regression — from a bad publish, a corrupted cache or a tampered ruleset — within minutes.
- **Decision log** (3.6): every conclusion retains its inputs, rule IDs and versions, so an incident can be reconstructed rather than argued about.

**R — Result.**
Integrity of clinical output is monitored, versioned, signed and continuously verified — treated with the same seriousness as confidentiality of the data.

*Advantages:* the canary plus checksum pair covers both malicious tampering and the far more likely cause, an honest mistake in a threshold edit. Fail-closed on checksum mismatch is the right default for a health product: no analysis is strictly better than a wrong analysis.

*Disadvantages:* fail-closed means a corrupted ruleset takes the platform down rather than degrading, which is an availability cost the team must consciously accept. The canary's expected hash must be updated deliberately on every intentional change, and a team under pressure will be tempted to auto-update it — which would destroy its value entirely. Downgrade detection requires running both old and new rulesets, doubling compute on the diff step.

**C — Consequence.**
Makes `readyz` depend on ruleset validity (2.4c). Makes canary-hash update a mandatory, reviewed step of the ruleset release checklist (7.6). Requires retaining the previous ruleset live for diffing.

---

## 4.8 Logging, monitoring and the PHI-in-logs problem

**M — Motivation.**
R5 — PHI in logs, error messages, analytics or LLM provider traces — is ranked High, and it is the failure that happens by accident rather than by attack: a developer adds `logger.info(f"analysing {result}")` during debugging and health data lands in a third-party log aggregator, possibly outside Malaysia.

**M — Method.**
- **Redaction at the logger, not at the call site.** A structured-logging processor that (a) allows only an explicit allowlist of field names into log records, (b) replaces any value matching PHI-shaped patterns (long decimals with units, IC-number formats, email addresses) with a token, and (c) refuses to serialise domain objects. Call-site discipline is not a control; the pipeline is.
- **Identifiers, not values.** Logs reference `user_id`, `analysis_id`, `test_code`. They never contain a lab value, a name, or a free-text answer.
- **Error tracking:** Sentry or equivalent configured with `send_default_pii = false`, request-body capture off, breadcrumbs scrubbed, and — if the vendor is offshore — a documented transfer basis or, preferably, self-hosting.
- **Product analytics:** event names and coarse properties only; no health values, ever. Screen-view and funnel analytics are fine; "user viewed LDL 3.6" is not.
- **Model vendor traces:** zero-retention configuration required (8.3); if a vendor cannot provide it, that vendor is unusable for this data.
- **Audit log** (distinct from operational logs): append-only, tamper-evident, retained per the security schedule, covering auth events, authorisation denials, break-glass access, consent changes, ruleset publishes, share creation/access, exports and deletions. This is the evidence base for the 72-hour breach assessment.
- **Alerting:** ruleset checksum failure, canary divergence, authorisation-denial spikes, unusual export volume, extraction-cost anomalies, queue depth, error-rate SLOs.
- **A CI test that greps a synthetic log run for PHI patterns** and fails the build. This is the only measure that actually keeps redaction working over time.

**R — Result.**
Operational visibility sufficient to detect and scope an incident within the 72-hour window, without the logs themselves becoming a second health-data store.

*Advantages:* allowlist-based redaction is the only approach that degrades safely — an unknown field is dropped rather than leaked. Separating the audit log from operational logs lets each have the right retention and the right access control.

*Disadvantages:* aggressive redaction makes debugging harder, and engineers will feel it weekly; the mitigation is good identifiers plus the ability to reproduce from a synthetic fixture, not relaxing redaction. Tamper-evident audit logging adds cost and complexity. The CI PHI-grep will produce false positives and needs tuning to stay credible.

**C — Consequence.**
Must exist before the first production log line, since retrofitting means purging log storage. Constrains vendor choice for error tracking and analytics. Provides Section 6 with a concrete automated test.

---

## 4.9 Incident response

**M — Motivation.**
72 hours is not long, and a team of four with no on-call rota will not meet it by improvisation.

**M — Method.**
- **Named roles** (can be the same people wearing labelled hats): incident lead, technical lead, DPO/privacy lead, communications. Written contact tree, out-of-hours reachable.
- **Severity ladder** with SQUARE-specific criteria — notably a severity class for *clinical integrity* incidents (a wrong classification served to users), which is not a data breach but is a serious incident with its own notification and remediation path.
- **Runbook** covering: detect → contain → preserve evidence → assess scope (which users, which data — answerable from the lineage in 3.3) → 72-hour Commissioner notification decision with a written rationale either way → 7-day data-subject notification → remediation → post-incident review.
- **Pre-drafted notification templates** for both audiences, reviewed by counsel in advance **[blocked]**. Drafting these under time pressure is how deadlines are missed.
- **Rehearsal:** one tabletop exercise per quarter, one of which each year is a clinical-integrity scenario (a bad threshold published to production), not a data-theft scenario.
- **Evidence:** `Security/evidence/` continues to be the audit trail, one folder per incident and per test run **[established]**.

**R — Result.**
A team that can start the clock knowingly, scope accurately and notify within the statutory window.

*Advantages:* the clinical-integrity severity class is the piece most incident plans lack and the one most relevant to SQUARE's actual risk. Pre-drafted templates convert a legal exercise into a form-filling exercise at the worst possible moment.

*Disadvantages:* incident readiness decays without rehearsal, and rehearsals are the first thing cancelled. A small team has no genuine 24/7 coverage, so the honest position is a documented best-effort response window disclosed internally, rather than an implied SLA nobody can meet.

**C — Consequence.**
Requires the audit log (4.8) and the data lineage (3.3) to be good enough to answer "who was affected" quickly. Requires counsel engagement before launch, not after an incident. Adds a recurring quarterly obligation to the team calendar.

## 4.10 Cybersecurity keyword index

`PDPA (Act 709) + Amendment 2024` · `sensitive personal data` · `72-hour breach notification` · `DPO threshold 10,000` · `OWASP ASVS L2` · `OWASP Top 10` · `OWASP LLM Top 10` · `CIS Benchmarks` · `argon2id` · `WebAuthn / passkeys` · `TOTP` · `OIDC` · `BOLA / IDOR` · `row-level security` · `break-glass access` · `CSP nonce + Trusted Types` · `HSTS preload` · `CSRF double-submit` · `KMS customer-managed keys` · `SBOM` · `Semgrep` · `OWASP ZAP` · `promptfoo` · `prompt injection` · `zero-retention model configuration` · `PHI redaction pipeline` · `tamper-evident audit log` · `ruleset checksum + fail-closed` · `synthetic canary` · `data processing agreement` · `cross-border transfer register` · `tabletop exercise`

---

# 5. Data and information flowmap

## 5.0 Purpose

Sections 1–4 describe components. This section describes what moves between them, at what classification, across which trust boundary, and what watches it. It extends the five boundaries already named in `Security/THREAT_MODEL.md` §3 rather than introducing a competing model.

---

## 5.1 Data classification

Every field in the system carries exactly one class, declared in the schema and enforced by the logging and export tooling.

| Class | Contents | Rules |
|---|---|---|
| **C4 — Health / sensitive personal data** | Lab values, uploaded reports, generated analyses and reports, questionnaire answers, medications, family history, anthropometrics, symptoms | In-region only. Encrypted at rest with CMK. Never in logs, analytics, error traces or cache keys. Cross-border only via a registered transfer with a documented basis. Consent-gated on every read. |
| **C3 — Identity** | Name, email, phone, DOB, account identifiers | In-region. Encrypted at rest. Pseudonymised in analytics. Not in logs beyond `user_id`. |
| **C2 — Governance** | Consent events, audit log, ruleset versions, decision log | Append-only. Longest retention. Highest integrity requirement. Restricted read. |
| **C1 — Operational** | Metrics, redacted logs, queue depth, timings, error classes | May leave region if the vendor is registered. Must contain no C3/C4 values. |
| **C0 — Public** | Marketing copy, published legal documents, education content | No restriction. |

**Working rule:** any field whose class is unclear is C4 until a named owner classifies it downward in writing.

---

## 5.2 End-to-end flow — the primary journey

```
 ┌─ B0 · PUBLIC INTERNET ────────────────────────────────────────────────┐
 │                                                                       │
 │  [1] Welcome ──► [2] Register ──► [3] Login                           │
 │        C0            C3               C3                              │
 └──────────────────────────┬────────────────────────────────────────────┘
                            │  TLS 1.3 · session cookie
 ┌─ B1 · AUTHENTICATED SESSION (BFF) ────────────────────────────────────┐
 │                                                                       │
 │  [4] T&C ──► [5] Consent ─────► consent_events (C2, append-only)      │
 │                    │                                                  │
 │                    ▼  ◄── CONSENT GATE: no C4 may be stored or read   │
 │                            until process_health_data = GRANTED        │
 │  [6] Dashboard ◄── composed read (C4) ── consent-checked repository   │
 │        │                                                              │
 │        ▼                                                              │
 │  [7] Upload ──► file (C4) ──► object store (CMK) ──► source_documents │
 └──────────────────────────┬────────────────────────────────────────────┘
                            │  signed single-file URL, 5-min TTL
 ┌─ B2 · EXTRACTION (isolated: no DB creds, egress allowlist = 1) ───────┐
 │                                                                       │
 │   AV + structural validation ──► OCR ──► LLM structuring              │
 │                                          │                            │
 │                    ┌─────────────────────┴──────────────┐             │
 │                    │  ⇢ cross-border hop (if vendor is  │             │
 │                    │    offshore) — TRANSFER REGISTER    │            │
 │                    └────────────────────────────────────┘             │
 │   OUTPUT SCHEMA: candidates only — value, unit, range, confidence,    │
 │   page, bbox.  NO classification. NO urgency. NO recommendation.      │
 └──────────────────────────┬────────────────────────────────────────────┘
                            │  extracted_candidates (C4, quarantined)
 ┌─ B3 · HUMAN VERIFICATION ─────────────────────────────────────────────┐
 │                                                                       │
 │  [8] Verify ── user confirms / edits each row ──► verified_results    │
 │       ⇡ THE ONLY GATE THROUGH WHICH MACHINE OUTPUT BECOMES            │
 │         CLINICAL INPUT.  verified_by_user_at is NOT NULL by constraint│
 │                                                                       │
 │  [9] Triggered questions ──► health_history (C4)                      │
 └──────────────────────────┬────────────────────────────────────────────┘
                            │  ClinicalInput (typed, canonical units)
 ┌─ B4 · CLINICAL LOGIC (pure package, no I/O) ──────────────────────────┐
 │                                                                       │
 │   ① SAFETY / red-flag screen  ── can veto everything downstream       │
 │   ② validity gates (units, fasting, TG ≥ 4.5 ⇒ no Friedewald)         │
 │   ③ classification vs lab range AND vs clinical threshold (separate)  │
 │   ④ risk calculators + eligibility ⇒ confidence band A/B/C/D          │
 │   ⑤ discordance + modifiers ⑥ supplementary indices (labelled)        │
 │   ⑦ domain integration  ⑧ prioritised actions  ⑨ referral level       │
 │                                                                       │
 │   Inputs: verified values + profile + answers + ruleset_version       │
 │   Outputs: classification_code, urgency_level, content_key, rule_ids  │
 │   Side effects: NONE                                                  │
 └──────────────────────────┬────────────────────────────────────────────┘
                            │  analysis + findings + decision_log (C4/C2)
 ┌─ B5 · PRESENTATION & EXPORT ──────────────────────────────────────────┐
 │                                                                       │
 │  [10] Progress ──SSE── [11] Summary ─► [12] Markers ─► [13] Domains   │
 │                                     ─► [14] Plan    ─► [15] Referral  │
 │  [16] Report render (sandboxed, NO NETWORK) ──► PDF (C4, CMK)         │
 │            │                                                          │
 │            ├─► download (signed URL, short TTL, authorised)           │
 │            └─► share object: recipient · expiry · download flag       │
 │                    · revocable · every access logged                  │
 └──────────────────────────┬────────────────────────────────────────────┘
                            │
 ┌─ B6 · LONGITUDINAL & GOVERNANCE ──────────────────────────────────────┐
 │  [17] Trends  [18] Profile  [19] Library  [20] Settings               │
 │  retention clocks · consent withdrawal · export · deletion cascade    │
 └───────────────────────────────────────────────────────────────────────┘
```

**The four gates that carry the safety and privacy properties:**

| Gate | Location | What it guarantees | What breaks if bypassed |
|---|---|---|---|
| **Consent gate** | B1, repository layer | No C4 read or write without a live `GRANTED` state derived from the event log | R6 — processing after withdrawal |
| **Isolation gate** | B2 | Untrusted content is processed by a component with no database credentials and one egress destination | R2 escalates from "bad values" to "data breach" |
| **Verification gate** | B3, DB constraint | Machine output becomes clinical input only after a human confirms it | R2 escalates from "bad values" to "wrong clinical pathway" |
| **Purity gate** | B4, import-linter | Clinical decisions depend only on typed, verified values | A4 becomes unenforceable |

---

## 5.3 Flow optimisation

**M — Motivation.**
Two optimisation targets, and they pull in the same direction for once: user-perceived latency, and the volume of C4 data in motion. Moving less health data is both faster and safer.

**M — Method.**
- **Minimise at the boundary.** The extraction service receives one file and returns candidates; it never receives the profile, the history or any other report. The model prompt contains the document and a schema — never the user's name, never their history. Data minimisation here is a security control and a token-cost control simultaneously (8.4).
- **Compose, don't chatter.** One `/me/dashboard` call rather than six (2.5). Fewer round trips means fewer authorisation checks, fewer logs and less latency.
- **Move computation, not data.** Trends (Screen 17) are computed in the database with window functions over `measurements`, returning aggregates rather than shipping the full series to the API layer for every chart.
- **Cache only the immutable** (2.5), keyed by `ruleset_version` so clinical staleness is impossible.
- **Defer the expensive.** Report PDF rendering happens on request, not automatically at analysis completion — most analyses are never downloaded, and rendering every one wastes compute and creates a C4 artefact nobody asked for. This is a privacy optimisation as much as a cost one.
- **Front-load cheap validation.** Client-side format checks and server-side plausibility checks reject a bad upload before it reaches the paid extraction step.

**R — Result.**
Fewer copies of health data, fewer network hops carrying it, and the expensive external call made once per document rather than per view.

*Advantages:* the "minimise at the boundary" rule is the rare optimisation that improves cost, latency, privacy and blast radius at once. Not pre-rendering reports removes a large class of unnecessary C4 artefacts.

*Disadvantages:* on-demand PDF rendering makes the first download slow (a few seconds), which users will notice on Screen 16; mitigated by rendering optimistically when the user opens the preview rather than when they click download. Database-side aggregation moves logic into SQL, which is harder to unit-test than Python and easier to get subtly wrong — those queries need their own test fixtures.

**C — Consequence.**
Requires the derive endpoint and composed endpoints from Section 2. Requires trend queries to be treated as tested code, not ad-hoc SQL.

---

## 5.4 Trust borders — the explicit register

| Border | Between | Direction of distrust | Controls |
|---|---|---|---|
| **B0/B1** | Internet ↔ authenticated app | Everything inbound is hostile | TLS, WAF, rate limits, CSRF, CSP, session integrity, input validation |
| **B1/B2** | App ↔ extraction | *Both* directions. The app distrusts what extraction returns; extraction is assumed potentially compromised by its input | Single signed file URL; no DB creds; egress allowlist of one; candidate-only output schema; output schema validation; plausibility gates |
| **B2/vendor** | Extraction ↔ model/OCR provider | The vendor is a processor, not a trusted party | DPA, zero-retention config, no-training config, transfer register entry, minimal payload, no identity in prompt |
| **B3** | Machine candidates ↔ verified results | Machine output is untrusted until a human confirms | DB constraint on `verified_by_user_at`; per-row confirmation for high-risk values; edit-rate telemetry |
| **B4** | Application ↔ clinical package | The clinical package distrusts everything it is handed | Typed inputs, canonical units only, purity enforced by import-linter, ruleset checksum verified at load |
| **B5** | Platform ↔ recipient of a shared report | The recipient is outside the system entirely | Share object with expiry, revocation, recipient verification, access logging, optional PDF password, watermarking **[proposed]** |
| **B6** | Platform ↔ staff | Staff are trusted but audited; no staff role reads C4 casually | RBAC, MFA, break-glass with justification + user notification, admin on separate host, all access audited |
| **Region** | Malaysia ↔ anywhere else | Every crossing is an event to be justified | Transfer register (5.6), in-region default, offshore only with documented basis |

Note that **B1/B2 is bidirectional distrust**, which is unusual and important: most designs trust their own internal services. Here the extraction service consumes attacker-supplied content, so the application treats it as potentially hostile, and that assumption is what justifies the candidate-only schema.

---

## 5.5 Access monitoring

**M — Motivation.**
The controls in Section 4 prevent the expected attacks. Monitoring exists for the unexpected one, and for the insider case, which no preventive control fully addresses.

**M — Method.**
- **Log every C4 access**, not just failures: who, which subject, which object, when, from where, and under what role. For user self-access this is high-volume and can be sampled/aggregated; for staff access it is exhaustive and never sampled.
- **Surface it to the user.** Screen 20 already has "View activity history" and "Authorised devices"; Screen 19 shows sharing status. Making access visible to the data subject is both a rights feature and a genuine detection mechanism — users notice things monitoring does not.
- **Behavioural alerts** worth having, in rough priority order: staff access to a record with no support ticket; export volume anomaly; a share created and accessed from an unusual country; authorisation-denial spike (an IDOR probe); a single session touching an unusual number of distinct `user_id`s; extraction cost or volume anomaly (cost is a surprisingly good exfiltration signal); ruleset checksum mismatch.
- **Weekly review** of a short, curated access report by the security owner — a 15-minute recurring obligation that catches drift that alerting misses.
- **Retention** of access logs per the security schedule, held separately from operational logs with distinct access control.

**R — Result.**
Anomalous access is visible to both the operator and the data subject, and the evidence needed for a 72-hour scope assessment exists before the incident.

*Advantages:* user-visible access history is unusually high-leverage — it costs little and creates a detection channel independent of the operator's own tooling. Cost-anomaly alerting on the extraction path doubles as a billing control.

*Disadvantages:* logging every C4 access creates a large, sensitive dataset that itself needs protecting — the access log is a map of who has what health data. It must be C2, tightly restricted, and must not contain values. Behavioural alerting on a small user base produces mostly false positives until baselines stabilise, so thresholds need patience and tuning rather than immediate strictness.

**C — Consequence.**
Requires the audit-log infrastructure (4.8) and a user-facing activity-history screen backed by it. Adds a standing weekly review obligation with a named owner.

---

## 5.6 Leakage prevention and the cross-border register

**M — Motivation.**
Health data leaves by accident far more often than by theft: into a log, an error trace, an analytics event, a support screenshot, a CSV a developer exported to debug something, or a model vendor's retained trace in another jurisdiction.

**M — Method.**

| Leak path | Control |
|---|---|
| Application logs | Allowlist redaction at the logger; CI PHI-grep test (4.8) |
| Error tracking | PII capture disabled, bodies off, breadcrumbs scrubbed; self-host if the vendor is offshore |
| Product analytics | Event names and coarse properties only; a schema-enforced allowlist; no values |
| Model vendor | Zero-retention + no-training config; minimal payload; no identity in prompt; register entry |
| Report sharing | Expiry, revocation, recipient verification, access logging, optional watermark |
| Data export | Re-authentication, rate limit, short-TTL signed URL, logged |
| Staff access / support | Break-glass with justification + user notification; no bulk export capability in the support role at all |
| Developer debugging | **No production data in non-production environments, ever.** Staging uses synthetic patients only — already a standing project rule. A synthetic data generator is therefore a *required tool*, not a nicety |
| Backups | Encrypted with CMK, access-controlled, restore rehearsals into an isolated environment with synthetic data |
| Screenshots and support tickets | Support tooling redacts values by default; a documented policy on attachments |
| Third-party frontend scripts | Strict CSP; no third-party script on authenticated routes without review |

**The cross-border transfer register** is a maintained table, not a document: every processor that can receive C3/C4, the data categories, the destination country, the lawful basis, the DPA reference, the retention configuration and the review date. `extraction_runs.cross_border` and `transfer_basis` (3.3) make the per-call reality queryable against the register, so a mismatch between what the register claims and what the system does is detectable.

**R — Result.**
The realistic accidental leak paths each have a named control, and the transfer position is a live query rather than a stale spreadsheet.

*Advantages:* recording the transfer basis per extraction run is unusual and strong — it turns a policy claim into evidence. Denying bulk export to the support role removes the single most damaging insider capability at almost no operational cost.

*Disadvantages:* a synthetic data generator good enough to exercise real edge cases (odd units, unusual panels, multi-page scans, poor photographs) is genuinely hard to build and will be under-invested in; the fallback of "just use a real report once, carefully" must be refused every time it is proposed. Denying support staff bulk export makes some legitimate support work slower, and there will be pressure to grant an exception.

**C — Consequence.**
Makes the synthetic data generator a Phase 1 deliverable (7.3), because staging is unusable without it. Requires vendor selection in Section 8 to be gated on retention configuration and transfer basis, not just on accuracy and price.

## 5.7 Data-flow keyword index

`data classification` · `STRIDE` · `LINDDUN (privacy threat modelling)` · `trust boundary` · `data flow diagram` · `data minimisation` · `purpose limitation` · `consent gate` · `quarantine + promotion pattern` · `human-in-the-loop gate` · `pure function boundary` · `egress allowlist` · `cross-border transfer register` · `data processing agreement` · `DLP` · `PHI redaction` · `synthetic data generation` · `access logging` · `UEBA / anomaly detection` · `break-glass` · `watermarking` · `signed URL TTL` · `deletion cascade`

---

# 6. Testing and debug plan

## 6.0 The testing thesis

Most of this platform is ordinary software and needs ordinary testing. One part of it is not: the clinical pipeline, where a wrong answer can cause a person to not seek care they need. That part gets a different regime — exhaustive boundary testing, golden cases with clinician-approved expected outputs, differential testing between ruleset versions, and an explicit asymmetry in how failures are weighted.

**The asymmetry, stated plainly:** a false *positive* (SQUARE says "discuss this with a clinician" when it did not strictly need to) costs the user an appointment. A false *negative* (SQUARE says "routine" when a finding warranted urgent review) is the platform's highest-consequence failure mode — the SWOT names it as such. Every threshold, every test, every acceptance gate in this section is tuned to that asymmetry. **No release may reduce the sensitivity of the red-flag engine without explicit, documented clinician approval.**

**What testing cannot do, stated equally plainly:** no test suite establishes that a threshold is clinically *correct*. Tests establish that the implementation matches the specification. Correctness of the specification is a clinical governance question owned by a registered practitioner (A4), and this roadmap does not pretend otherwise.

---

## 6.1 Test register — layers, targets and standards

| ID | Layer | What it validates | Method | Standard of success | Cadence |
|---|---|---|---|---|---|
| T1 | Unit — clinical | Each calculator (CV-01…CV-14) computes correctly | pytest over the pure `clinical/` package | 100% of documented golden cases pass; **100% branch coverage on `clinical/`** — this package only | Every commit |
| T2 | Unit — boundary | Threshold edges | Parameterised tests at *value−ε, value, value+ε* for every threshold row | Every threshold has all three; a threshold without them fails the build | Every commit |
| T3 | Unit — units | Conversion correctness and forbidden conversions | Property-based tests (Hypothesis): round-trip within tolerance; Lp(a) conversion raises | No silent conversion; forbidden conversions always raise | Every commit |
| T4 | Unit — validity gates | Calculations refuse invalid input | Friedewald with TG ≥ 4.5; FRS with established ASCVD; FRS out of age range; metabolic syndrome with missing components | Correct suppression (Band D) or correct partial (Band C) with named missing inputs — never a number | Every commit |
| T5 | Unit — confidence bands | Band A/B/C/D assignment | Matrix test per calculator × input-completeness scenario | Exact band match; no calculator returns a value in Band D | Every commit |
| T6 | Integration — pipeline | Full analysis from verified results to findings | Fixture patients through the worker | Deterministic byte-identical output for identical inputs + ruleset | Every commit |
| T7 | Integration — API | Contract conformance | Schemathesis against the OpenAPI spec | No 500s; schema conformance on all responses | Every commit |
| T8 | Security — authz | Cross-tenant isolation (R1) | Generated: for every user-scoped endpoint, user B requests user A's object | 404 for every endpoint, no exceptions; a new endpoint without a test fails the build | Every commit |
| T9 | Security — SAST | Code-level flaws + MyHealthReport rules | Semgrep with `Security/sast/semgrep-mhr.yml` | Zero high; zero `mhr-llm-output-drives-clinical-logic` findings | Every commit |
| T10 | Security — secrets/deps | Leaked secrets, vulnerable dependencies | gitleaks + dependency audit + SBOM | Zero secrets; no known-exploited critical | Every commit |
| T11 | Security — XSS regression | MHR-001 class | `Security/tools/dom-sink-scan.js` + `xss-probe.js` with poisoned lab dictionary | No unescaped sink; injected payload does not execute | Every commit |
| T12 | Security — PHI in logs | R5 | CI run of a synthetic analysis, grep logs for PHI patterns | Zero matches | Every commit |
| T13 | E2E | The 20-screen journey | Playwright, both routine and urgent scenarios (the existing `test/smoke.js` is the seed) | All 20 screens render; zero console errors; screenshots archived | Every commit |
| T14 | Accessibility | WCAG 2.2 AA | axe-core in Playwright + manual keyboard and screen-reader passes on Screens 5, 8, 9, 15 | Zero critical/serious violations; full keyboard operability of the Verify table | Every commit + manual per phase |
| T15 | Performance | Frontend budgets | Lighthouse CI | Within the budgets in 1.3 | Every commit |
| T16 | Load | Backend under burst | k6 against staging | p95 API < 300 ms; analysis p95 < 60 s; no queue starvation at 10× expected peak | Per phase gate |
| T17 | DAST | Running-app vulnerabilities | OWASP ZAP baseline against staging | No new medium+; `Security/dast/zap-rules.tsv` governs exceptions | Nightly, from Stage 2 |
| T18 | Extraction accuracy | OCR + LLM structuring quality | Held-out labelled corpus of real-format reports (see 6.6) | Field-level thresholds in 6.6 | Per model/prompt change |
| T19 | LLM safety | Prompt injection, refusal, schema conformance | promptfoo config + red-team in `Security/llm/` | 100% of injection corpus fails to alter output beyond candidate values; zero schema violations | Per model/prompt change |
| T20 | Differential | Ruleset change impact | Old vs new ruleset over the golden corpus | Every changed case reviewed; **any urgency downgrade requires typed clinician justification** | Every ruleset publish |
| T21 | Canary | Production clinical integrity | Synthetic patient analysed every 15 min, output hash asserted | Hash matches; alert on divergence | Continuous, production |
| T22 | Deletion completeness | Right-to-erasure across all stores | Create → populate every table and bucket → delete → assert absence | Zero residue outside the declared backup horizon | Every commit (integration) |
| T23 | Consent enforcement | R6 | Withdraw consent mid-session, attempt every C4 read and analysis start | All refused; no partial processing | Every commit |
| T24 | Disaster recovery | Backups actually restore | Restore into an isolated environment, run T6 and T13 | RPO ≤ 15 min, RTO ≤ 4 h **[proposed]**, verified | Quarterly |
| T25 | Clinical review | That the *specification* is right | Registered practitioner reviews every report phrase, red-flag route and threshold | Documented sign-off per ruleset version | Per ruleset publish |
| T26 | Usability — verification | Whether users actually verify (A5) | Moderated sessions with planted extraction errors | Detection rate measured and reported honestly; informs whether per-row confirmation is mandatory | Per phase, from Phase 2 |
| T27 | Penetration test | Whole-system, adversarial | Agentic pentest per `Security/agent/RUNBOOK.md`, then an independent external assessment | All critical/high remediated and retested before real patient data | Before Stage 4 / launch |

---

## 6.2 The golden-case corpus

**M — Motivation.**
The single most valuable testing artefact this project can build. It is what makes threshold changes safe to ship, what makes the admin console's diff preview possible, and what makes a clinician's review reusable rather than repeated.

**M — Method.**
- A versioned set of **synthetic patients** with hand-specified expected outputs: safety pathway, per-marker classification, per-calculator value and band, domain statuses, and the top-three actions.
- Coverage is specified, not incidental. Minimum for the cardiovascular domain:
  - Each of the 7 BP categories in CV spec §2, at and around each boundary, plus the isolated-systolic case.
  - The BP ≥180/120 case **with** and **without** concerning symptoms (emergency vs urgent — the distinction is the whole point).
  - FRS: low/intermediate/high; each exclusion (established ASCVD, out-of-range age, missing inputs, pregnancy).
  - Friedewald: valid; TG = 4.4 / 4.5 / 4.6; lab-flagged invalid; direct LDL-C present.
  - TG safety tiers at 1.7 / 4.5 / 10.0 boundaries.
  - All five discordance patterns in CV spec §6.
  - Metabolic syndrome at 2-of-5, 3-of-5, and 2-of-5-with-a-missing-component (must be Band C, "cannot fully determine").
  - Lp(a) in both units, including the case that would be misclassified if a conversion were applied.
  - Possible-FH trigger; high-HDL-with-high-LDL (must not be reassuring); favourable ratios with high ApoB (must not be reassuring).
  - Every prohibited claim in CV spec §9 as a *negative* assertion: the output must not contain it.
- Each case records `expected_output`, `approved_by`, `approved_at`, `ruleset_version` and the clinical rationale.
- Cases are **synthetic and de-identified by construction** — no real patient ever enters this corpus, per the standing project rule.

**R — Result.**
A regression suite that a clinician can read, that runs in seconds, and that turns "does this threshold change break anything?" into an answered question before publish rather than an incident after.

*Advantages:* clinician review effort is capitalised rather than spent — reviewing 120 golden cases once produces a permanent asset. Negative assertions on prohibited claims are a cheap, direct implementation of the CV spec §9 constraints.

*Disadvantages:* building the corpus is slow and needs clinician time that is scarce (**[blocked]** until an approver is named), and it will be the critical path for the whole clinical layer. It is also a maintenance burden: every intentional threshold change requires re-approving affected cases. And a corpus can encode the specification's own errors — passing tests prove consistency with the spec, never clinical correctness. That limitation must be stated wherever the corpus is cited as evidence.

**C — Consequence.**
Blocks the admin console's diff feature (2.6) and the differential test T20. Makes clinician availability the rate limiter for the clinical layer, which Section 7's phasing must accommodate rather than assume away.

---

## 6.3 Debugging and observability for support

**M — Motivation.**
The most common real support question will be "why does my report say this?" — and the honest answer must be reconstructable without a developer reading production health data.

**M — Method.**
- **Replay tooling.** Given an `analysis_id`, a developer can re-run the analysis locally from `input_snapshot_hash` + `ruleset_version` — using **synthetic substitution**: the shape and values that matter are reproduced, identity fields are not. Where the actual values are needed, access is break-glass with justification and user notification (4.3).
- **The decision log is the primary debugging artefact** (3.6): step, inputs hash, rule ID, output, version. Most "why did it say that" questions are answered by reading it, without touching the raw data.
- **A user-facing "How this was assessed" surface** already exists in the mockups (Screens 11, 13 "How this was assessed", 12 "How SQUARE interprets reference ranges", 14 "Why these actions?"). These should be generated from the decision log, not written as static copy — which makes the explanation always accurate and makes the support burden self-serving.
- **Correlation IDs** through BFF → core → worker → extraction, present in every log line and shown to the user on error screens so a support ticket carries it.
- **Feature flags** for risky changes, with a documented rule: **a flag may never gate a safety behaviour off.** Red-flag detection is not flaggable.

**R — Result.**
Most support questions are answerable from C2 governance data rather than C4 health data, and the user can often answer them for themselves.

*Advantages:* generating the "how this was assessed" copy from the decision log means the explanation cannot drift from the computation — a rare case where a product feature and an engineering control are the same thing.

*Disadvantages:* replay-with-synthetic-substitution is imperfect; some bugs only reproduce with the real values, and the break-glass path will be used. Feature flags accumulate and become their own source of confusion without an expiry discipline.

**C — Consequence.**
Requires the decision log to be complete enough to render user-facing explanations — a higher bar than debugging alone, and a design constraint on its schema.

---

## 6.4 Frontend and accessibility testing specifics

- **Visual regression** on all 20 screens against the mockups (Playwright screenshots + a diff tool), gated on a tolerance; the existing prototype smoke test already archives per-screen screenshots and is the natural seed.
- **Status-colour contract test:** a test that asserts every urgency level renders with its token colour, its icon *and* its text label — so a refactor cannot silently reduce a status to colour alone.
- **Caveat-presence tests:** every chart renders its limitation text; every Band C finding names its missing inputs; every Band D finding shows no number. These are safety tests wearing UI clothes.
- **Keyboard and screen-reader passes** focused on the three hardest screens: Consent (5), Verify (8), Questionnaire (9). The Verify table must be fully operable by keyboard, because it is the safety-critical interaction.
- **Bilingual rendering:** every screen rendered in both locales in CI, asserting no missing keys and no layout overflow (BM strings run longer than English).

---

## 6.5 Data-layer testing specifics

- **Migration tests:** every migration applied forward and rolled back against a seeded database in CI.
- **RLS tests:** direct database-level assertions that a query under user B's session variable cannot see user A's rows — testing the backstop independently of the application.
- **Append-only enforcement tests:** attempt `UPDATE` and `DELETE` on `consent_events` and `measurements` as the application role; both must fail.
- **Deletion completeness (T22)** as described above — the single most important data test, because its failure is invisible in normal operation.
- **Retention job tests:** objects past `delete_after` are actually removed, verified against object storage, not just the database.

---

## 6.6 Evaluating extraction and AI performance

**M — Motivation.**
Extraction accuracy is the number that determines how much safety work the human verification gate has to do. The SWOT correctly flags that no accuracy target has ever been specified. This section proposes one, and is explicit that it is a proposal awaiting real measurement.

**M — Method.**
- **A held-out evaluation corpus**: real-format Malaysian laboratory reports, consented and de-identified for this purpose (or synthetic reports built to match real layouts where consent is unavailable), spanning at minimum: the major local laboratory chains, both PDF and phone-photograph capture, single and multi-page, English and Bahasa Melayu headers, mmol/L and mg/dL conventions, and deliberately poor scans.
- **Metrics, per field** — a single "accuracy" number is not usable:

| Metric | Definition | Proposed launch target **[proposed, unverified]** |
|---|---|---|
| Test-name mapping accuracy | Correct `test_code` for a present analyte | ≥ 98% |
| Value extraction accuracy | Exact numeric match | ≥ 99% |
| Unit extraction accuracy | Exact unit match | ≥ 99% |
| Reference-range extraction | Both bounds correct | ≥ 95% |
| **Missed analyte rate** | Present on the report, absent from candidates | ≤ 1% |
| **Hallucinated analyte rate** | In candidates, absent from the report | **0 tolerated at any rate above measurement noise** — a fabricated value is the worst extraction failure and must be treated as a release blocker |
| Confidence calibration | Does 82% confidence mean ~82% correct? | Expected Calibration Error ≤ 0.05 |

- **Calibration matters more than raw accuracy here**, because Screen 8 shows a confidence percentage per row and drives the "2 require review" triage. A miscalibrated confidence score is actively harmful: it tells the user to look away from exactly the rows they should check.
- **Production monitoring without a labelled set:** `entry_mode` (3.3) gives a continuous free signal — the rate at which users *edit* an extracted value is a live proxy for extraction error, segmentable by laboratory, marker and capture method. A rising edit rate for one laboratory is an actionable alert.
- **T26 (does verification actually happen)** is the companion measurement and the one that validates or invalidates A5. It must be run with planted errors, and its result must be reported honestly even if unflattering — if users do not catch planted errors, the architecture's safety argument weakens and per-row confirmation becomes mandatory rather than proposed.

**R — Result.**
Measurable extraction quality with per-field targets, a zero-tolerance rule for fabrication, and a production signal that does not depend on continuous labelling.

*Advantages:* the edit-rate proxy is nearly free and works forever. Separating calibration from accuracy catches a failure mode that aggregate accuracy hides completely.

*Disadvantages:* **the targets above are engineering proposals, not empirically derived requirements** — they have not been tested against a real corpus and may prove either unreachable or insufficiently strict. Building the corpus requires either consented real reports (a consent and de-identification project in itself) or synthetic reports that may not reflect real-world messiness — and over-fitting to clean synthetic reports is a real risk that would produce reassuring numbers and poor field performance. The edit-rate proxy conflates extraction error with user correction of the laboratory's own report.

**C — Consequence.**
Gates model and vendor selection (8.3) on measured performance rather than vendor claims. Makes corpus construction a Phase 2 deliverable with a named owner. Feeds directly into whether Screen 8's design must change.

---

## 6.7 Execution plan

| Stage | Trigger | What runs | Gate to pass |
|---|---|---|---|
| **0 — now** | Phase 1 prototype exists | `dom-sink-scan.js`; both `Security/checklists/` read once; MHR-001 remediation planned | Findings triaged, MHR-001 scheduled before Module 5 ships **[established]** |
| **1** | First server-side commit | T9, T10 in CI; T1–T5 as the clinical package appears; repository under **git** | CI green on every commit; no secrets; branch protection on |
| **2** | Staging environment exists | T6–T8, T11–T15, T22, T23; T17 nightly; manual authz/business-logic checklist | Cross-tenant tests green; deletion test green; ZAP baseline clean |
| **3** | OCR/LLM extraction live | T18, T19 per model change; injection corpus in CI; T26 first run | Zero injection-driven output changes beyond candidate values; extraction targets met or a documented gap with mitigations |
| **4** | Before real patient data | T16, T20, T21, T24, T25, T27 | Clinician sign-off on the ruleset; all critical/high pentest findings remediated and retested; DR rehearsal passed; DPO named |
| **Ongoing** | Every release | Full CI suite; T20 on every ruleset publish; T21 continuously; T24 quarterly; T27 annually | No release with a failing safety test, ever, regardless of schedule |

This mirrors and extends the staged plan already recorded in `Security/README.md` rather than replacing it.

**Release rule, stated so it can be pointed at during a deadline argument:** a failing T1–T5, T8, T19, T20 or T23 blocks release. There is no "ship it and fix forward" path for a clinical-safety or cross-tenant-isolation failure.

## 6.8 Testing keyword index

`pytest` · `Hypothesis (property-based testing)` · `parameterised boundary testing` · `golden master / characterisation testing` · `differential testing` · `mutation testing` · `Schemathesis` · `OpenAPI contract testing` · `Playwright` · `visual regression` · `axe-core` · `WCAG 2.2 AA` · `Lighthouse CI` · `k6` · `OWASP ZAP` · `Semgrep` · `gitleaks` · `promptfoo` · `LLM red-teaming` · `expected calibration error` · `precision/recall/F1 per field` · `hallucination rate` · `canary testing` · `chaos/DR rehearsal` · `RPO/RTO` · `moderated usability testing` · `test pyramid` · `branch coverage`

---

# 7. Project development flow

## 7.0 Sequencing logic

Three constraints determine the order of everything below, and they are not negotiable by preference:

1. **Clinical content is the critical path, not code.** The engine is a few hundred lines; the ruleset, the golden cases and the clinician review are months. Every phase is therefore paced by clinician availability, and engineering work is sequenced to keep the clinician unblocked rather than the reverse.
2. **Governance infrastructure must precede clinical content.** The admin console, versioning and golden-case diff (2.6, 3.5, 6.2) have to exist *before* rules are authored, or the rules will be authored in files by engineers and the governance model will have been lost in week two.
3. **One domain, done properly, beats six done illustratively.** Cardiovascular is the only specified domain. The prototype already labels the other five "illustrative", which is honest — and shipping them to real users would not be. **[proposed]** V1 launches cardiovascular-only, with the other domains visibly marked as "not yet available" rather than shown with unvalidated thresholds.

**Prerequisite before Phase 0 completes:** the repository is not under version control. Nothing else in this plan is meaningful until it is. This is a one-hour task blocking everything.

---

## 7.1 Phase map

Durations are **[proposed, unverified]** estimates for a team of roughly four (medical logic owner, two engineers, UI/product), and assume clinician availability is the binding constraint rather than engineering capacity.

| Phase | Name | Indicative duration | Exit condition (the one thing that must be true) |
|---|---|---|---|
| **0** | Foundations | 2–3 weeks | Repo in git with branch protection and CI green; infrastructure-as-code deploying an empty staging in-region; ADRs recorded for the decisions in this document |
| **1** | Governance spine | 6–8 weeks | A clinician can author, review, approve and publish a versioned ruleset through the admin console, and see a golden-case diff before publishing |
| **2** | Cardiovascular clinical core | 8–10 weeks | The CV-01…CV-14 register is implemented, ruleset-driven, and passes a clinician-approved golden corpus; safety pathway logic is complete |
| **3** | Patient journey without AI | 8–10 weeks | The full 20-screen journey works end-to-end with **manual entry only** — no OCR, no LLM. Screens 8's verify table is populated by hand |
| **4** | Extraction layer | 6–8 weeks | OCR + LLM extraction meets the 6.6 targets on a held-out corpus; injection corpus fully contained; edit-rate telemetry live |
| **5** | Hardening and launch readiness | 6–8 weeks | Pentest findings remediated; DR rehearsed; DPO named; counsel-approved legal texts published; clinician sign-off on ruleset v1.0 |
| **6** | Closed pilot | 4–6 weeks | A limited real-user cohort with heightened monitoring, explicit pilot consent, and a documented rollback |
| **7+** | Domain expansion | Per domain | Metabolic → Liver/Renal → Haematology, each repeating the Phase 2 pattern with its own specification and corpus |

**Total to a defensible launch: roughly 10–13 months [proposed, unverified].** If that number is uncomfortable, the honest levers are scope (fewer screens at launch, cardiovascular only, no sharing feature) and headcount (a second clinician reviewer) — not compressing Phase 5 or skipping Phase 1, both of which trade schedule for the risks the SWOT already identified.

---

## 7.2 Phase 0 — Foundations

**M — Motivation.** Everything downstream assumes a repository, a pipeline and an environment. None currently exist.

**M — Method.**
- git repository, branch protection, required reviews, signed commits **[proposed]**, CODEOWNERS including a `LEGAL_OWNERS` group and a `CLINICAL_OWNERS` group.
- CI pipeline running the Stage-1 security jobs (T9, T10) from the first commit.
- Terraform/CDK deploying: VPC with the subnet topology in 2.8, Postgres, Redis, object storage, secret store, the staging environment. Empty, but real.
- Architecture Decision Records for every **[proposed]** decision in this document, so the reasoning survives the people.
- Copy `Security/ci/security.yml` into `.github/workflows/` — it is already written and waiting **[established]**.
- Remediate MHR-001's *pattern* in the new codebase from the start (the escaping-by-default rule, 1.3), so it never becomes a finding again.

**R — Result.** A team that can commit, review, test and deploy.
*Advantages:* cheap, fast, and unblocks parallel work immediately.
*Disadvantages:* produces nothing demonstrable, which makes it feel like delay to non-engineering stakeholders; worth framing explicitly as such at the outset.

**C — Consequence.** Fixes the cloud provider and region (1.7) — a decision that is expensive to reverse after Phase 3.

**Checklist.**
- [ ] Repository initialised, `.gitignore` excludes all data, history contains no PHI
- [ ] Branch protection, required review, CODEOWNERS with clinical and legal groups
- [ ] CI: lint, typecheck, Semgrep, gitleaks, dependency audit — all green
- [ ] IaC deploys staging in `ap-southeast-5`; service availability in-region verified
- [ ] Secret store live; zero secrets in the repository
- [ ] ADR-001…N recorded
- [ ] Synthetic-data generator scaffolded (5.6 — needed before staging is usable)

---

## 7.3 Phase 1 — Governance spine

**M — Motivation.** This is the phase most likely to be skipped and the one whose absence the SWOT identifies as the framework's central weakness. Building it first is the whole bet.

**M — Method.** Clinical knowledge schema (3.5); ruleset versioning, checksums and snapshots; the admin console (2.6) with authoring, four-eyes approval, publish, rollback and the golden-case diff; the audit log (4.8); the decision-log schema (3.6); identity, consent and account tables (3.1, 3.2) with RLS; the legal MDX pipeline (1.4); the synthetic-data generator completed.

**R — Result.** An empty but fully governed knowledge base and a clinician who can use it.
*Advantages:* from here on, clinical work proceeds in parallel with engineering rather than behind it — which is what makes the overall timeline achievable at all.
*Disadvantages:* eight weeks with no patient-facing progress. This is the highest-risk phase politically and the one requiring the clearest prior agreement from stakeholders.

**C — Consequence.** Determines whether A4 is real. If Phase 1 is descoped, the project should stop claiming clinician-owned thresholds.

**Checklist.**
- [ ] `clinical_thresholds`, `lab_reference_ranges`, `calculators`, `rulesets` schemas live and distinct
- [ ] Ruleset publish requires author ≠ approver, both authenticated with MFA
- [ ] Publish writes an immutable audit record with diff and guideline citation
- [ ] Checksum verified at engine load; mismatch fails `readyz`
- [ ] Rollback to previous ruleset demonstrated in staging
- [ ] Consent events append-only, `UPDATE`/`DELETE` denied at the database role level
- [ ] RLS policies on every user-scoped table; T8 harness green
- [ ] Synthetic-data generator produces a full patient with lab report

---

## 7.4 Phase 2 — Cardiovascular clinical core

**M — Motivation.** Turn `Content/Cardiovascular Domain Specification.docx` into a running, tested, approved ruleset.

**M — Method.** Implement CV-01…CV-14 as versioned calculators; author every threshold as data with its guideline citation; implement the safety/escalation matrix (§8) and the interpretation sequence (§6); implement the confidence banding (3.6); build the golden corpus (6.2) with clinician approval; wire the report block order (§9) and the prohibited-claim negative assertions (§9).

**R — Result.** A clinician-approved cardiovascular engine that is correct against its specification and demonstrably refuses to compute what it should not.
*Advantages:* the domain with the largest chronic-disease burden and the only one already specified — maximum value per unit of clinical review.
*Disadvantages:* five domains remain unavailable, which is a visible product limitation at launch and must be communicated as a deliberate choice rather than an omission. Writing the other five specifications is a clinical project of comparable size each, and none has a named owner or a start date **[blocked]**.

**C — Consequence.** Sets the pattern every later domain repeats. Makes Screen 6's domain map partially empty at launch — a design change to plan for now.

**Checklist.**
- [ ] Every CV-01…CV-14 calculator implemented with `required_inputs` and `exclusion_criteria`
- [ ] Friedewald TG ≥ 4.5 gate; calculated-vs-direct LDL-C labelling
- [ ] Lp(a) dual-unit bands; conversion marked `forbidden` and raising
- [ ] AIP/Castelli rendered as supplementary with mandatory limitation text
- [ ] Metabolic syndrome 3-of-5 with "cannot fully determine" on missing components
- [ ] Safety matrix: emergency / urgent / prompt / routine all reachable and tested
- [ ] Golden corpus ≥ 120 cases, clinician-approved, T1–T5 at 100%
- [ ] All CV spec §9 prohibited claims asserted absent
- [ ] Provenance block (ruleset + calculator versions) on every output

---

## 7.5 Phase 3 — Patient journey without AI

**M — Motivation.** Prove the entire product works before adding the least predictable component. Manual entry is already a required flow (Screen 7 "Enter results manually") and a permanent fallback, so building it first costs nothing that is later thrown away.

**M — Method.** All 20 screens against the real backend; upload and storage without extraction; the Verify table populated by manual entry; the questionnaire and trigger engine; the analysis job pipeline and SSE progress; report generation and sharing; trends and profile; settings, export and deletion.

**R — Result.** A complete, demonstrable, testable product with no AI in it at all.
*Advantages:* isolates AI risk entirely — every bug found here is a product bug, not an extraction bug. Also produces a genuinely shippable fallback product if the extraction layer disappoints.
*Disadvantages:* manual entry of an 18-row panel is tedious, so internal testing throughput is low; the synthetic-data generator should seed verified results directly for testing.

**C — Consequence.** Establishes the extraction interface contract by building its consumer first, which is the right order.

**Checklist.**
- [ ] All 20 screens implemented; T13 walks both routine and urgent scenarios
- [ ] Analysis job state machine with real per-stage progress
- [ ] Report PDF renders with provenance; share create/expire/revoke works
- [ ] Deletion (T22) and consent-withdrawal (T23) tests green
- [ ] Bilingual rendering complete; T14 accessibility green
- [ ] Load test (T16) passed at 10× expected peak

---

## 7.6 Phase 4 — Extraction layer

**M — Motivation.** The feature that makes the product feel effortless, and the one carrying the most novel risk.

**M — Method.** Per Section 8: OCR baseline, LLM structuring, isolated service, candidate-only schema, evaluation corpus, injection corpus, confidence calibration, edit-rate telemetry, cost monitoring.

**R — Result.** Upload-to-verified-values in under a minute, with measured accuracy and contained injection risk.
*Advantages:* removes the single largest friction in the journey.
*Disadvantages:* introduces per-document variable cost, a vendor dependency, a cross-border question, and a new failure mode that the whole architecture from Phase 1 onward exists to contain. It is also the component most likely to need re-work as models change.

**C — Consequence.** Activates Stage 3 of the security plan permanently — promptfoo in CI, red-team per model change.

**Checklist.**
- [ ] Extraction service isolated: no DB creds, egress allowlist of one, verified by test
- [ ] Output schema physically cannot carry a classification
- [ ] Evaluation corpus built; per-field metrics measured and published internally
- [ ] Hallucinated-analyte rate at zero on the corpus
- [ ] Confidence calibration measured; ECE within target or the confidence display suppressed
- [ ] Injection corpus: no case alters output beyond candidate values
- [ ] Cross-border transfer registered with a documented basis, or vendor is in-region
- [ ] Edit-rate telemetry live and dashboarded by lab / marker / capture method

---

## 7.7 Phase 5 — Hardening and launch readiness

**M — Motivation.** The gap between "it works" and "it may hold real people's health data" is this phase, and it cannot be compressed without accepting the SWOT's identified risks knowingly.

**M — Method.** Agentic pentest then independent external assessment (T27); DR rehearsal (T24); full ASVS L2 gap scoring with a remediation schedule; counsel review and publication of T&C, Privacy Notice and Consent with placeholders resolved; DPO named; retention schedule finalised; incident runbook written and rehearsed; clinician sign-off on ruleset v1.0; the regulatory-classification opinion (A1) obtained.

**R — Result.** A documented, evidenced launch decision rather than an optimistic one.
*Advantages:* every item here is something a clinical partner, insurer or regulator will eventually ask for; doing it now is cheaper than doing it under scrutiny.
*Disadvantages:* several items are external dependencies with unpredictable lead times — counsel review, the regulatory opinion and an external pentest each carry weeks of latency that must be started early, not at phase start. **[blocked]** on all three.

**C — Consequence.** A1's answer lands here. If SQUARE is classified as a medical device, this phase does not end — it becomes a different, longer programme.

**Checklist.**
- [ ] External assessment complete; all critical/high remediated and retested
- [ ] DR rehearsal passed within RPO/RTO
- [ ] ASVS L2 scored; gaps documented with owners and dates
- [ ] T&C, Privacy Notice, Consent counsel-approved; all `[placeholders]` resolved; BM versions published
- [ ] DPO appointed and contactable; breach templates pre-drafted
- [ ] Retention schedule and backup horizon documented and disclosed
- [ ] Ruleset v1.0 signed off by a registered practitioner with registration number recorded
- [ ] Regulatory classification opinion obtained and acted on

---

## 7.8 How progress is evaluated

**M — Motivation.** Velocity and burndown measure activity, not readiness. For a platform whose failure mode is a wrong clinical pathway, the useful indicators are different.

**M — Method.** Four indicator families, reviewed at every phase gate:

**1. Readiness (binary, not percentage).** Each phase's exit condition is a yes/no. A phase is not 80% complete; its gate is met or it is not. This resists the most common failure in health-software delivery — declaring readiness by proportion of tickets closed.

**2. Clinical coverage.**
- Thresholds authored with a guideline citation ÷ thresholds required for the domain
- Golden cases approved ÷ golden cases specified
- Calculators with complete `required_inputs` + `exclusion_criteria` ÷ calculators in the register
- Report phrases clinician-approved ÷ report phrases in use — **and the same in Bahasa Melayu**

**3. Safety and security posture.**
- Open critical/high findings (target: zero at every gate)
- ASVS L2 gap count, trending down
- Days since last DR rehearsal; days since last tabletop
- Canary uptime and divergence count
- Cross-tenant test coverage: endpoints with a T8 test ÷ user-scoped endpoints (target: 100%, always)

**4. Product truthfulness — the unusual one.**
- Findings displayed without a confidence band (target: zero)
- Charts rendered without limitation text (target: zero)
- Calculators shown despite ineligibility (target: zero)
- Prohibited-claim assertions passing (target: 100%)

Deliberately **not** used as progress measures: lines of code, story points, screens "done" without their caveats and both locales, or extraction accuracy on the training corpus.

**R — Result.** A gate review that answers "is this safe to advance" rather than "how busy have we been".
*Advantages:* binary gates are hard to fudge and easy to explain to a non-technical stakeholder.
*Disadvantages:* binary gates can stall a project on a single unmet item; the discipline required is to distinguish items that genuinely block (clinician sign-off, cross-tenant tests) from items that can be carried with a documented, dated exception (an ASVS L2 item with a compensating control). That distinction needs a named decision-maker, or every gate becomes a negotiation.

**C — Consequence.** Requires a standing gate review with the clinical owner present. Requires an exceptions register with owners and expiry dates.

---

## 7.9 Ways of working

- **Trunk-based development** with short-lived branches; every merge green.
- **Two reviewers on anything touching `clinical/`, consent, authorisation or the ruleset schema**; one elsewhere.
- **ADRs** for architectural decisions; the `[proposed]` tags in this document are the initial backlog.
- **A weekly clinical–engineering sync** whose sole agenda is the ruleset diff and any golden-case changes. This is the meeting that keeps A4 real.
- **Risk register** derived from `Security/THREAT_MODEL.md` plus the SWOT, reviewed at each gate, with owners.
- **Quarterly obligations calendar**: DR rehearsal, tabletop exercise, guideline-currency review (has MOH published a 6th edition?), vendor and transfer-register review, access-log review cadence check.

## 7.10 Development-flow keyword index

`Architecture Decision Record` · `trunk-based development` · `CODEOWNERS` · `branch protection` · `phase gate / stage gate` · `definition of done` · `exit criteria` · `RACI` · `risk register` · `exceptions register` · `infrastructure as code` · `Terraform / CDK` · `clinical governance sign-off` · `design controls (IEC 62304, if A1 fails)` · `SaMD classification` · `pilot cohort` · `progressive rollout` · `rollback plan` · `quarterly obligations calendar`

---

# 8. AI implementation

## 8.0 The boundary, restated because everything depends on it

**AI in SQUARE may extract, transcribe, structure, summarise and explain. It may never classify, score, set an urgency level, choose a referral pathway, or author a clinical threshold.**

This is not a cautious preference. It is:
- the position the SWOT identifies as the platform's strongest regulatory posture (closer to decision support than to autonomous diagnostic AI);
- the rule already recorded in this project's memory and enforced by `mhr-llm-output-drives-clinical-logic` in `Security/sast/semgrep-mhr.yml`;
- the reason a successful prompt injection (threat model R2, Critical) degrades to "wrong candidate values shown to a user for verification" instead of "wrong clinical pathway".

Everything in this section is designed to keep that boundary structural rather than instructional — enforced by schemas, process isolation and CI gates, not by a well-written system prompt.

---

## 8.1 Where AI is used, and where it is refused

| # | Use | AI role | Risk | Verdict |
|---|---|---|---|---|
| U1 | Lab report → text and layout | OCR / document AI | Extraction error | **Yes** — Phase 4 |
| U2 | Text + layout → structured candidates (test, value, unit, range, flag) | LLM with strict output schema | Injection, hallucination | **Yes**, behind the verification gate |
| U3 | Lab name → `test_code` mapping | Deterministic dictionary first; LLM only for unmatched names, as a *suggestion* the user confirms | Wrong mapping ⇒ wrong marker interpreted | **Yes**, suggestion only, never silent |
| U4 | Unit and range parsing | Deterministic parser with LLM fallback | Unit confusion | **Yes**, with plausibility gates |
| U5 | Plain-language explanation of an *already-classified* finding | LLM constrained to clinician-approved content, or none at all | Ungrounded claims, drift from approved wording | **Deferred to post-launch.** V1 uses the clinician-authored education library (Module 16). Generated prose about a person's health is the highest-risk low-reward AI use in this product |
| U6 | Report summarisation | — | Same as U5 | **No** for V1 |
| U7 | Classification / severity / urgency / risk band | — | Catastrophic | **Never.** Schema-blocked, CI-blocked |
| U8 | Recommendation authoring | — | Catastrophic | **Never.** Recommendations come from the clinician-owned library |
| U9 | Triage chat / symptom answering | — | Regulatory and safety exposure far beyond V1 scope | **No.** Explicitly outside the Version 1 scope boundary |
| U10 | Internal: triaging security scanner output, drafting golden cases for clinician review, generating synthetic reports | Development tooling only, never in the user path | Low | **Yes** — a genuinely good use of agents, per `Security/README.md` |

**Note on U5.** The temptation to generate personalised explanatory prose will be strong, and it is the single most likely place this boundary erodes. The honest position: an LLM writing "your LDL is slightly above range, which for you probably means…" is producing clinical interpretation regardless of what the disclaimer says. If it is pursued post-launch, it must be constrained to recombining clinician-approved sentences with a citation to each source phrase, evaluated for groundedness, and reviewed — not free generation.

---

## 8.2 Image-to-text: the extraction stack

**M — Motivation.**
Screen 7 accepts PDF, JPG and PNG up to 20 MB, plus camera capture. Malaysian laboratory reports vary widely in layout; phone photographs add skew, glare, shadow and partial crops. Screen 8's design — 18 rows with per-row confidence and 2 flagged for review — implies a system that knows what it is unsure about.

**M — Method.** A three-stage pipeline, deliberately not a single model call:

**Stage A — Document normalisation (deterministic).** Type sniffing, AV scan, page splitting, EXIF-orientation correction, deskew, perspective correction for photographs, contrast normalisation, and a **quality gate** that rejects an image before it costs anything: resolution floor, blur detection (variance of Laplacian), and a text-density check. Rejection is a *feature* — Screen 7's file-validation checklist already primes the user for it, and rejecting a bad photo early is better than extracting from it badly.

**Stage B — OCR with layout.** A managed document-AI service producing text plus word-level bounding boxes and table structure. Bounding boxes are not optional: they drive Screen 8's "select a row to highlight it in the report", which is what makes verification quick enough that users actually do it (A5).

**Stage C — Structuring.** A vision-capable LLM receives the page image *and* the OCR text and layout, and returns a strict JSON schema of candidate rows. Giving it both is deliberate — OCR alone loses table semantics on unusual layouts; the image alone is more prone to transcription drift on long numbers. Constrained decoding / structured-output mode enforces the schema at generation time.

**Then, deterministically and outside the model:**
- Dictionary mapping of `raw_test_name` → `test_code` (exact, then alias, then fuzzy with a confidence floor; anything below the floor is surfaced as unmatched, never guessed silently).
- Unit parsing and canonicalisation, with `forbidden` conversions raising.
- **Plausibility gates** per marker from `lab_test_dictionary.plausible_min/max` — a haemoglobin of 136 g/dL is rejected as a unit error before a human sees it.
- Cross-checks: does the value sit inside or outside the extracted reference range consistently with the extracted flag? A disagreement lowers confidence and forces review.
- **Confidence per row** = a calibrated combination of OCR character confidence, model self-reported confidence, dictionary match strength and cross-check agreement. Calibrated against the evaluation corpus (6.6), not taken raw from the model — raw model confidence is known to be poorly calibrated.

**R — Result.**
A pipeline whose uncertainty is explicit and localised to specific rows, with deterministic guards catching the error classes that models fail on most (units, magnitude, unrecognised analytes).

*Advantages:* the deterministic layers do the safety work models are worst at, and the model does the layout-understanding work deterministic parsers are worst at. Bounding boxes turn verification from a chore into a glance. The quality gate saves money and prevents the worst inputs from ever reaching a model.

*Disadvantages:* three stages is more latency and more cost than a single vision-model call, and a single call would probably be *nearly* as accurate on clean PDFs — the argument for the pipeline rests on the messy cases and on having per-row confidence at all. It is also more to maintain, and OCR-plus-LLM means two vendors to govern. Fuzzy dictionary matching has a genuine failure mode where two markers have similar names, which is why the confidence floor must be conservative and unmatched names must go to the user rather than to a best guess.

**C — Consequence.**
Requires `lab_test_dictionary` with aliases and plausible ranges populated per marker before that marker can be extracted — again making dictionary curation a clinician-adjacent data task. Requires bounding-box storage (3.3). Makes calibration a maintained artefact that must be re-measured on every model change.

---

## 8.3 Model and vendor selection

**M — Motivation.**
The choice is constrained less by capability than by three hard filters: does the vendor offer zero-retention and no-training-on-input for health data; can the processing happen in an acceptable jurisdiction with a documented basis; and is per-document cost predictable.

**M — Method — horizontal comparison (across vendors, comparable tiers).**

*OCR / document AI*, per 1,000 pages, list price:

| Service | Price | Notes |
|---|---|---|
| Google Document AI — Enterprise Document OCR | **$1.50** (first 1,000 pages free; $0.60 above 5M) | Text + layout; the cost-effective baseline ([pricing](https://cloud.google.com/document-ai/pricing)) |
| Google Document AI — Layout Parser | **$10.00** | Adds structural chunking |
| Google Document AI — Form Parser / Custom Extractor | **$30.00** | Key-value and table extraction; a custom extractor could be trained on lab layouts |
| Azure AI Document Intelligence | Free tier 500 pages/month; paid rates not published on the public page at time of writing — **[unverified, obtain via the Azure calculator or sales]** ([pricing](https://azure.microsoft.com/en-us/pricing/details/ai-document-intelligence/)) | Read / Layout / Prebuilt / Custom tiers; commitment tiers available |
| AWS Textract | **[unverified — obtain current AnalyzeDocument TABLES/FORMS pricing]** | Relevant mainly if the platform is AWS-hosted and in-region processing matters |
| Self-hosted open OCR (e.g. PaddleOCR, Tesseract, docTR) | Infrastructure cost only | **The only option with no cross-border question at all.** Lower accuracy on messy photographs; meaningful engineering and GPU cost |

*LLM for structuring* (per million tokens, input / output, list price at time of writing):

| Model | Input | Output | Context | Notes |
|---|---|---|---|---|
| Claude Haiku 4.5 | $1 | $5 | 200K | Cheapest vision-capable Claude tier |
| Claude Sonnet 5 | $2 | $10 | 1M | Recommended balance point |
| Claude Opus 5 | $5 | $25 | 1M | Reserve for evaluation/adjudication, not per-document work |
| GPT-5.6 Luna | $0.20 | $1.20 | — | Cheapest listed tier |
| GPT-5.6 Terra | $2 | $12 | — | Mid tier |
| GPT-5.6 Sol | $5 | $30 | — | Flagship |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 | — | |
| Gemini 3.7 Flash | $0.75 | $3.75 | — | Promotional rate through 31 Dec 2026; **doubles to $1.50/$7.50 on 1 Jan 2027** — a real budgeting trap |
| Gemini 3.5 Flash | $1.50 | $9.00 | — | |

Sources: [Claude](https://platform.claude.com/docs/en/models/overview), [OpenAI](https://openai.com/api/pricing/), [Gemini](https://ai.google.dev/gemini-api/docs/pricing). **All prices are list, in USD, at the time of writing, and change frequently — re-verify before committing a budget. Batch APIs typically offer ~50% discounts for asynchronous work, which suits this workload well.**

**M — Method — vertical comparison (across tiers within a family).**
The relevant question for U2 is not "which model is smartest" but "at what tier does structured extraction from a lab report stop improving". Structured extraction with constrained decoding, given both OCR text and the page image, is a comparatively easy task. The expected shape **[unverified — this is precisely what the Phase 4 bake-off must establish]** is that a mid tier (Sonnet-class / Terra-class / Flash-class) reaches a plateau, and that a flagship tier buys little on clean reports and something on genuinely difficult scans. The recommended posture:

- **Route by difficulty.** Clean, single-lab, high-quality PDFs → cheapest adequate tier. Photographs, unfamiliar layouts, or a first pass returning low confidence → escalate to a higher tier and re-run. Escalation is cheap because it applies to a minority of documents.
- **Adjudicate disagreements.** For high-risk markers, run two cheap models and escalate only on disagreement — often cheaper and more accurate than always running the expensive one.
- **Never route by cost alone on a value that could trigger a red flag.**

**Selection filters that override capability and price:**
1. Zero-retention / no-training-on-input, contractually and in configuration. A vendor that cannot provide this is unusable for C4 data, whatever its accuracy.
2. Processing region and a documented transfer basis (5.6). An in-region option, even at some accuracy cost, materially simplifies the PDPA position.
3. Predictable cost with an enforceable cap.
4. Deprecation behaviour — a model retired at short notice forces an unplanned re-validation of the whole extraction layer.

**R — Result.**
A vendor decision made on constraints first and capability second, with a documented bake-off rather than a preference.

*Advantages:* difficulty-based routing typically cuts cost substantially with little accuracy loss. Making retention configuration a hard filter avoids the far more expensive discovery that health data has been retained by a third party.

*Disadvantages:* multi-vendor routing multiplies the governance burden — two DPAs, two transfer registrations, two evaluation runs per change. Self-hosting removes the cross-border problem but adds GPU cost and an accuracy deficit on the hardest inputs, which is exactly where accuracy matters most; it is a serious option only if the transfer basis proves unobtainable. And the vertical-comparison claim above is a hypothesis: **no model comparison has been run for this workload, and the roadmap should not pretend to know the answer.**

**C — Consequence.**
Phase 4 must begin with a documented bake-off against the evaluation corpus (6.6) before any vendor is committed. Requires a vendor-exit plan: the extraction interface is vendor-agnostic by design, so switching is a service swap rather than a rewrite.

---

## 8.4 Cost estimation

**M — Motivation.**
Per-document variable cost is the only unbounded operating expense in the platform, and it is also an abuse vector — an attacker uploading large documents in volume is running up a bill.

**M — Method — worked example [unverified, illustrative].**

Assumptions: 2-page report; OCR at Enterprise Document OCR rates; structuring with a mid-tier model receiving both page images and OCR text.

| Component | Estimate | Basis |
|---|---|---|
| OCR, 2 pages | ~$0.003 | $1.50 / 1,000 pages |
| LLM input | ~2,000 image tokens/page + ~1,500 text tokens/page ≈ **7,000 tokens** | Rough; image tokenisation varies by vendor |
| LLM output | ~1,500 tokens (18 structured rows) | |
| LLM cost @ Sonnet-class ($2/$10) | (7,000 × $2 + 1,500 × $10) / 1e6 ≈ **$0.029** | |
| LLM cost @ Haiku-class ($1/$5) | ≈ **$0.015** | |
| LLM cost @ Flash-Lite-class ($0.25/$1.50) | ≈ **$0.004** | |
| **Total per report, mid tier** | **≈ $0.032** | ~RM 0.14 **[FX unverified]** |
| **Total per report, cheap tier** | **≈ $0.007** | |

Annual variable AI cost at A6 scale (10,000 users × 2 reports/year = 20,000 reports):

| Tier | Annual |
|---|---|
| Cheap | ~$140 |
| Mid | ~$640 |
| Mid + 20% escalation to flagship | ~$1,100 |
| Mid + adjudication (two models on high-risk markers) | ~$1,000–1,300 |

**The conclusion that matters: at launch scale, AI inference is not the cost problem.** Hosting, storage, the external security assessment, and above all clinician time will each exceed it by one to two orders of magnitude. Budget discussions should be proportioned accordingly.

**Cost controls that are nonetheless mandatory:**
- Hard per-user and per-day upload caps enforced before extraction is invoked.
- The Stage-A quality gate rejecting unusable images before any paid call.
- Prompt caching for the static schema portion of the prompt (typically ~90% discount on cached input).
- Batch API for any non-interactive re-processing.
- Per-run cost recorded in `extraction_runs.token_cost` (3.3), with anomaly alerting — cost spikes are also an exfiltration and abuse signal (5.5).
- A budget cap that degrades to manual entry rather than failing, so a runaway bill produces a worse experience, not an outage.

**R — Result.** A defensible cost model with the levers identified and the abuse vector closed.
*Advantages:* recording per-run cost makes this measurable rather than modelled within weeks of Phase 4.
*Disadvantages:* every figure above is an estimate built on assumed token counts and list prices that change; image tokenisation in particular varies enough between vendors to move the LLM line by a factor of two. Treat this as an order-of-magnitude guide, not a budget.

**C — Consequence.** Requires rate limits and a budget cap before extraction goes live. Makes cost telemetry part of the Phase 4 definition of done.

---

## 8.5 Training proposal

**M — Motivation.**
The question "should we train a model" deserves a direct answer, because the default assumption in health AI is that a custom model is needed, and here it mostly is not.

**M — Method — four options, assessed honestly.**

**Option 1 — No training. Prompting + constrained decoding + deterministic post-processing. [recommended for V1]**
Rationale: the task is structured extraction with a fixed output schema; frontier vision models already do this well; there is no training data yet; and no training means no health data leaves the operational path into a training corpus, which removes an entire consent and governance problem.
*Advantages:* fastest, cheapest, no data-governance burden, trivially swappable when a better model appears.
*Disadvantages:* accuracy is capped at what the vendor's model does; performance on unusual local layouts cannot be improved except through prompting; a model deprecation forces re-validation.

**Option 2 — Custom document-AI extractor (e.g. Document AI Custom Extractor) trained on labelled Malaysian lab layouts. [consider at Phase 6+]**
Rationale: if evaluation shows that errors concentrate in a few high-volume laboratory formats, a layout-specific extractor is the targeted fix.
*Advantages:* can substantially outperform a general model on the specific formats it is trained on; runs within one vendor's governance envelope.
*Disadvantages:* needs a few hundred labelled documents *per layout*, which is a real annotation project with real consent requirements; brittle when a laboratory changes its template; and $30/1,000 pages is 20× the base OCR rate. Only worth it with evidence that layout-specific error is the dominant failure mode.

**Option 3 — Fine-tuning an LLM on extraction examples. [not recommended for V1]**
*Advantages:* could improve schema adherence and local naming conventions; may allow a cheaper base model.
*Disadvantages:* requires health-data training examples, and this is where the governance problem becomes acute. The research consent in `Content/2. User Consent.docx` §6 covers *de-identified data for ethically approved health research and service-improvement research* — whether product model-training falls inside that is a question for counsel and possibly ethics review **[blocked]**, and the document itself warns that "de-identification reduces, but may not completely eliminate, the risk of re-identification." A lab report image is difficult to de-identify reliably (names, IC numbers, doctor names, barcodes, handwriting). Combined with the ongoing cost of re-tuning per base-model change, the return does not justify the exposure for V1.

**Option 4 — Self-hosted open model, optionally fine-tuned. [strategic fallback]**
Rationale: the only configuration with zero cross-border transfer.
*Advantages:* full data control; fixed cost; no vendor deprecation risk.
*Disadvantages:* GPU infrastructure and MLOps capability the team does not have (A7); typically lower accuracy on difficult inputs; the whole security surface of running inference becomes the team's own. Reasonable only if A3 forces it.

**If any training is ever done, these are non-negotiable:** a documented lawful basis and specific consent; no direct identifiers in training data; a documented de-identification method with a residual re-identification risk assessment; a held-out evaluation set never used in training; bias evaluation across the laboratories and demographics represented; a data-retention and deletion path for the training corpus; and versioned model artefacts recorded on every report that used them.

**R — Result.** A defensible "no training in V1" decision with the conditions under which it would be revisited.
*Advantages:* avoids the largest governance liability in the AI plan while losing little at current scale.
*Disadvantages:* accepts a permanent dependency on external vendors and a ceiling on accuracy that only they can raise. If local layouts prove genuinely poorly handled, Option 2 becomes necessary and its lead time (annotation, consent, training) is months — so the evaluation corpus in Phase 4 should be built in a way that would support it.

**C — Consequence.** Makes vendor model quality a monitored external dependency. Requires the evaluation corpus to be constructed with future annotation in mind (bounding boxes, layout labels), even though V1 does not train.

---

## 8.6 API design for the extraction service

```
POST /extract           (internal only; called by the worker)
  request:  { document_url: signed, 5-min TTL, single file
              document_hash, page_range, hints: { lab_id?, report_type? } }
  response: { run_id, engine, engine_version, model_id, prompt_version,
              pages: [ { page, width, height } ],
              candidates: [ { page, bbox, raw_test_name, raw_value,
                             raw_unit, raw_range, raw_flag,
                             ocr_confidence, model_confidence } ],
              quality: { blur_score, resolution_ok, text_density },
              usage:   { input_tokens, output_tokens, ocr_pages, cost_usd } }
```

**The response schema has no field for classification, urgency, severity, risk, interpretation or recommendation.** This is the enforcement mechanism, and it is the reason the schema is written out here in full: adding such a field would require a schema change, a code review and a Semgrep exception — three deliberate acts rather than one careless one.

Other properties:
- Idempotent on `document_hash` + `engine_version` + `prompt_version` — a retry does not re-bill.
- Bounded: hard timeout, page cap, size cap, and a circuit breaker on vendor failure that degrades to manual entry.
- Emits per-run cost and latency metrics.
- Runs in the isolated container of 2.8: no database credentials, one egress destination.
- Versioned prompts stored as artefacts alongside rulesets, so an extraction can be reproduced.

---

## 8.7 Evaluation and monitoring of the AI layer

Covered operationally in 6.6; the AI-specific obligations are:

- **A pre-deployment gate per model or prompt change:** the evaluation corpus metrics (6.6) plus the promptfoo injection corpus plus schema-conformance testing. No model change reaches production without all three.
- **Calibration re-measured on every change**, because a model swap that improves accuracy while worsening calibration makes Screen 8 *less* safe — the flagged rows stop being the wrong ones.
- **Continuous production signals:** per-row edit rate by lab / marker / capture method; unmatched test-name rate; plausibility-gate rejection rate; quality-gate rejection rate; cost per document; latency p95.
- **A standing kill switch:** extraction can be disabled platform-wide, degrading to manual entry, without a deploy. This must be tested, not assumed.
- **Model-change log:** every change to model, version or prompt recorded with its evaluation results, retained alongside ruleset versions — because a report's provenance block must be able to say which extraction stack produced its inputs.

---

## 8.8 AI implementation plan (Phase 4 detail)

| Step | Work | Exit |
|---|---|---|
| 4.1 | Build the evaluation corpus: real-format reports, consented/de-identified or synthetic-to-real-layout, with ground-truth labels | ≥ 200 documents spanning the layout, quality and unit variation in 6.6 |
| 4.2 | Stage A: normalisation + quality gate, deterministic | Measurable rejection rate; no paid call on a rejected document |
| 4.3 | OCR bake-off across candidate services on the corpus | Documented per-service accuracy, cost and region/retention position |
| 4.4 | Structuring bake-off across model tiers, with constrained decoding | Per-field metrics per tier; the plateau tier identified with evidence |
| 4.5 | Dictionary mapping, unit canonicalisation, plausibility and cross-check gates | Zero silent mappings below the confidence floor |
| 4.6 | Confidence calibration and the Screen 8 review-flag threshold | ECE within target, or the confidence display is suppressed rather than shown miscalibrated |
| 4.7 | Isolation, egress allowlist, schema enforcement, Semgrep rule verified failing on a deliberate violation | Isolation proven by test, not by configuration review |
| 4.8 | Injection corpus + red-team run | No case alters output beyond candidate values |
| 4.9 | Cost telemetry, rate limits, budget cap, kill switch | All four demonstrated in staging |
| 4.10 | T26 usability run with planted errors | Detection rate measured; per-row confirmation decision made on evidence |

## 8.9 AI keyword index

`OCR` · `document AI` · `layout analysis` · `bounding boxes` · `vision-language model` · `constrained decoding / structured outputs` · `JSON schema enforcement` · `prompt injection` · `indirect prompt injection` · `OWASP LLM Top 10` · `human-in-the-loop verification` · `confidence calibration` · `expected calibration error` · `hallucination rate` · `retrieval grounding` · `groundedness evaluation` · `promptfoo` · `LLM red-teaming` · `model routing / cascading` · `adjudication ensembles` · `prompt caching` · `batch inference` · `zero-retention configuration` · `no-training-on-input` · `fine-tuning vs prompting` · `custom document extractor` · `de-identification and re-identification risk` · `model deprecation risk` · `kill switch / graceful degradation`

---

# Appendix A — Study map

Per-section keyword indexes appear at 1.8, 2.9, 3.8, 4.10, 5.7, 6.8, 7.10 and 8.9. This appendix groups them by *what to go and learn*, in rough order of leverage for this project.

**Highest leverage — study these first**

| Theme | Why it matters here | Where to start |
|---|---|---|
| Broken object-level authorisation (BOLA/IDOR) | Ranked the most likely incident in the project's own threat model | OWASP API Security Top 10; PostgreSQL row-level security documentation |
| Indirect prompt injection | The Critical risk introduced by the extraction layer; classical threat modelling misses it | OWASP Top 10 for LLM Applications; the existing `Security/llm/` corpus |
| Clinical rules-as-data and versioning | The SWOT's central weakness; makes clinician ownership real | Decision-table patterns; feature-flag/config-versioning literature; `IEC 62304` for vocabulary even if not applicable |
| Confidence calibration | Screen 8's per-row confidence is safety-relevant and raw model confidence is unreliable | Expected calibration error; reliability diagrams; temperature scaling |
| Malaysian PDPA (Act 709 + Amendment 2024) | Binding now: 72-hour breach notification, DPO at 10,000 sensitive-data subjects | PDP Department guidance; the DPO and breach-notification guidelines |
| SaMD / clinical decision support classification | Assumption A1 — the highest-impact open question in the document | Malaysian MDA guidance; IMDRF SaMD framework for vocabulary |

**Core engineering**

`Next.js App Router` · `React Server Components` · `BFF pattern` · `Zod / Pydantic schema-first contracts` · `OpenAPI codegen` · `TanStack Query` · `Server-Sent Events vs WebSockets` · `modular monolith` · `hexagonal architecture` · `import-linter` · `Celery / ARQ` · `idempotency keys` · `job state machines` · `content-addressed storage` · `liveness vs readiness probes` · `synthetic canary monitoring`

**Data**

`temporal / bitemporal modelling` · `event sourcing` · `append-only tables and database-level enforcement` · `EAV measurement stores` · `LOINC` · `unit canonicalisation` · `laboratory reference interval vs clinical decision threshold` · `provenance metadata` · `deletion cascade and erasure verification` · `PITR backup horizons`

**Security**

`OWASP ASVS L2` · `OWASP Top 10` · `OWASP LLM Top 10` · `CIS Benchmarks` · `STRIDE` · `LINDDUN` · `argon2id` · `WebAuthn / passkeys` · `CSP nonce + Trusted Types` · `KMS customer-managed keys` · `SBOM` · `Semgrep` · `OWASP ZAP` · `gitleaks` · `promptfoo` · `PHI redaction pipelines` · `tamper-evident audit logs` · `break-glass access` · `tabletop exercises`

**Clinical and regulatory context**

`MOH Malaysia Management of Hypertension 5th ed. (2018)` · `MOH Management of Type 2 Diabetes Mellitus 6th ed. (2020)` · `D'Agostino 2008 Framingham General CVD Risk Score` · `ESC/EAS dyslipidaemia guidelines` · `KDIGO CKD 2024` · `Friedewald equation and its validity limits` · `ApoB and Lp(a) as risk markers` · `MMC Good Medical Practice, Confidentiality, Telemedicine, and Ethical Use of AI guidance`

---

# Appendix B — Open decisions requiring a named human owner

Every item here is **[blocked]** on a person, not on engineering. Items 1–4 gate launch.

| # | Decision | Owner needed | Gates |
|---|---|---|---|
| 1 | **Regulatory classification (A1).** Is SQUARE a medical device or clinical decision-support software under Malaysian regulation? | Regulatory counsel / MDA consultation | The entire Phase 5 plan; potentially the whole programme shape |
| 2 | **Clinical approver.** A Malaysian-registered practitioner who owns and signs off thresholds, report phrases, red-flag routes and versioning | Founder / clinical lead | Phases 1–2; nothing clinical publishes without this |
| 3 | **Legal review and placeholder resolution.** T&C, Privacy Notice and Consent all carry `[bracketed placeholders]`; the operator entity, liability cap, dispute venue and retention schedule are all unresolved | Malaysian counsel | Launch. Screens 4, 5 and 20 cannot show final text without it |
| 4 | **DPO appointment.** Mandatory above 10,000 sensitive-data subjects | Founder | Must precede crossing the threshold, not follow it |
| 5 | **Retention schedule and disclosed backup horizon** for each data class | DPO + counsel | Privacy Notice publication; deletion design (3.7) |
| 6 | **Cross-border transfer basis** for the chosen OCR/LLM vendor, or the decision to process in-region only | DPO + counsel | Phase 4 vendor selection |
| 7 | **Bahasa Melayu clinical copy owner.** Every clinical string needs an approved BM equivalent | Clinical lead + translator | Bilingual launch |
| 8 | **Specifications for the five unspecified domains** (metabolic, liver, renal, haematology, anthropometric) | Clinical lead | Phase 7+; determines whether launch is CV-only |
| 9 | **Whether product model-training falls within the research consent** in Consent §6 | Counsel + ethics | Only if Option 3 in 8.5 is ever revisited |
| 10 | **Screen 8 design change:** per-row confirmation for high-risk values instead of a single blanket attestation | Product + clinical | Depends on T26 evidence; affects the A5 safety argument |
| 11 | **Password minimum raised from 8 to 12 characters** (contradicts the Screen 2 mockup) | Product | Phase 1 |
| 12 | **Launch scope:** cardiovascular-only with other domains marked unavailable, versus delaying launch | Founder | Phase 2 exit |
| 13 | **`LEGAL_OWNERS` and `CLINICAL_OWNERS` code-owner groups** | Founder | Phase 0 |
| 14 | **Named part-time security owner** to run the staged plan and the weekly access review | Founder | Phase 1 |

---

# Appendix C — Limitations of this roadmap

Stated plainly, because a plan that does not describe its own weaknesses invites false confidence.

1. **It is an engineering plan, not a clinical or legal one.** Every clinical threshold cited comes from `Content/Cardiovascular Domain Specification.docx`; this document has not validated any of them. Every compliance mapping is a good-faith engineering reading of published guidance, not a legal opinion.

2. **The timelines are estimates with no empirical basis.** The 10–13 month figure assumes a four-person team, an available clinician, and no regulatory reclassification. It has not been derived from this team's measured throughput, because none exists yet. It should be treated as a shape, not a commitment.

3. **The cost figures are illustrative.** Token counts are assumed, image tokenisation varies by vendor, prices are list and change frequently (the Gemini Flash rate is scheduled to double on 1 January 2027), and no measurement has been made. The conclusion that AI inference is not the cost driver at launch scale is robust to error; the specific numbers are not.

4. **The extraction accuracy targets in 6.6 are proposals, not requirements derived from evidence.** They may prove unreachable or, more worryingly, insufficiently strict. Only a real evaluation corpus can settle it.

5. **The vertical model comparison in 8.3 is a hypothesis.** No bake-off has been run. The claim that a mid tier plateaus for this task is plausible and untested, and the roadmap deliberately makes the bake-off the first step of Phase 4 rather than assuming the answer.

6. **The safety argument depends on assumption A5** — that users genuinely verify extracted values. The architecture's containment of prompt injection reduces to "wrong values shown for verification", which is only safe if verification happens. T26 exists to test this, and if it fails the architecture needs strengthening (mandatory per-row confirmation, tighter plausibility gates, or a higher accuracy bar), not reassurance.

7. **Five of six clinical domains have no specification.** This roadmap plans how to build them but cannot plan what they contain. The prototype's honest "illustrative" labelling is the current state and must not be quietly promoted to production content.

8. **It assumes a small team throughout (A7).** Several recommendations — a modular monolith, managed services, automation over process — are sized for that. At a larger team, some (particularly the monolith and the manual weekly review) would be reconsidered.

9. **No user research informs it.** The 20 screens are well designed but their comprehension has not been tested with real users, particularly the confidence bands, the caveat text and the Verify table. Design decisions here follow the mockups and clinical safety, not evidence about what users understand.

10. **This document has not been reviewed by anyone.** It was produced from the project's own artefacts in a single pass. The clinical, legal and regulatory content in particular should be read as questions to put to the right people rather than as answers.

---

## Sources cited

- [Google Cloud — Document AI pricing](https://cloud.google.com/document-ai/pricing)
- [Microsoft Azure — AI Document Intelligence pricing](https://azure.microsoft.com/en-us/pricing/details/ai-document-intelligence/)
- [Anthropic — Claude models overview and pricing](https://platform.claude.com/docs/en/models/overview)
- [OpenAI — API pricing](https://openai.com/api/pricing/)
- [Google — Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [DLA Piper Privacy Matters — Malaysia: Guidelines on Data Breach Notification and DPO Appointment](https://privacymatters.dlapiper.com/2025/03/malaysia-guidelines-issued-on-data-breach-notification-and-data-protection-officer-appointment/)
- [AWS — Asia Pacific (Malaysia) Region](https://aws.amazon.com/local/malaysia/)

Internal project artefacts referenced throughout: `Screen/Screen Reference.docx` and the 20 screen mockups; `Content/1. Terms & Conditions.docx`; `Content/2. User Consent.docx`; `Content/Cardiovascular Domain Specification.docx`; `Phase i/MyHealthReport_Version1_Framework.md`; `Phase i/plan_model.md`; `Phase i/technical/MyHealthReport_Technical_Module_Architecture.md`; `Phase i/SWOT1/SWOT_Analysis_MyHealthReport_V1.md`; `Phase i/Prototype1_Version2/README.md`; `Security/README.md`; `Security/THREAT_MODEL.md`; `Security/BASELINE_FINDINGS.md`; `Security/sast/semgrep-mhr.yml`.

---

*End of `roadmap_version1.md`.*
