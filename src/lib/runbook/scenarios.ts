import type { ArtifactTab, Decision, Scenario } from "./types";

/**
 * ---------------------------------------------------------------------------
 * HOW TO ADD A SCENARIO
 * ---------------------------------------------------------------------------
 * 1. Copy one of the objects below, change the id/fileName/title.
 * 2. Edit `requirement`, `analysisFindings`, `gaps` and `questions`.
 *    Each gap points at a question; each question produces one decision id.
 * 3. Edit `agents` — see ./agents.ts for the shared agent factory. Add or
 *    remove entries freely; the swarm UI and dependency scheduler adapt.
 * 4. Edit `buildPackage` to describe the deliverables. Any decision id you
 *    reference in `traces` becomes a clickable trace link in the UI.
 * 5. Append the scenario to `SCENARIOS` at the bottom.
 */

const pick = (decisions: Decision[], id: string) =>
  decisions.find((d) => d.id === id);

const choice = (decisions: Decision[], id: string, fallback: string) =>
  pick(decisions, id)?.chosenLabel ?? fallback;

/* ========================================================================== */
/* Scenario 1 — Checkout v2                                                   */
/* ========================================================================== */

const checkout: Scenario = {
  id: "checkout-v2",
  fileName: "checkout-v2.md",
  title: "Checkout & Payments v2",
  sizeLabel: "14 KB · 9 pages",
  blurb:
    "Rebuild of the storefront checkout with wallets, retries and regional tax handling.",
  requirement: [
    {
      id: "REQ-1.1",
      heading: "Goal",
      body: "Replace the legacy single-page checkout with a staged flow supporting card, Apple Pay and Google Pay across EU, UK and US storefronts.",
    },
    {
      id: "REQ-1.2",
      heading: "Scope",
      body: "Cart review, address capture, payment, confirmation. Order fulfilment and refunds remain in the existing order service.",
    },
    {
      id: "REQ-1.3",
      heading: "Volume",
      body: "Peak 1,800 checkouts/minute during campaign windows. 99.95% availability target during Q4.",
    },
    {
      id: "REQ-1.4",
      heading: "Compliance",
      body: "PCI SAQ-A scope only. No card data may touch our servers; all capture happens in provider-hosted fields.",
    },
    {
      id: "REQ-1.5",
      heading: "Out of scope",
      body: "Loyalty points, gift cards, subscription billing.",
    },
  ],
  analysisFindings: [
    "9 pages parsed · 41 statements classified",
    "5 functional areas, 3 non-functional constraints identified",
    "Volume + availability targets found (REQ-1.3)",
    "Compliance boundary found (REQ-1.4) — SAQ-A",
    "No statement found covering inventory reservation ownership",
    "No statement found covering retry/idempotency semantics",
    "No statement found covering data residency for EU orders",
    "No statement found covering fallback when a wallet provider is down",
    "No statement found covering release cadence or launch gating",
  ],
  gaps: [
    {
      id: "GAP-01",
      title: "Inventory reservation ownership is undefined",
      detail:
        "The document assumes stock is held during payment but never says which service owns the reservation or its TTL.",
      severity: "high",
      questionId: "Q-01",
    },
    {
      id: "GAP-02",
      title: "Retry semantics are unspecified",
      detail:
        "Peak traffic plus provider timeouts guarantees retries, yet no idempotency contract is described.",
      severity: "high",
      questionId: "Q-02",
    },
    {
      id: "GAP-03",
      title: "EU data residency not stated",
      detail:
        "EU storefront is in scope but the document never says where order and address data may be stored.",
      severity: "high",
      questionId: "Q-03",
    },
    {
      id: "GAP-04",
      title: "Wallet outage behaviour missing",
      detail:
        "No degraded-mode behaviour is defined for an Apple Pay or Google Pay outage.",
      severity: "medium",
      questionId: "Q-04",
    },
    {
      id: "GAP-05",
      title: "Launch gating undefined",
      detail:
        "No statement on phased rollout, kill switch, or what evidence is needed to go live.",
      severity: "medium",
      questionId: "Q-05",
    },
  ],
  questions: [
    {
      id: "Q-01",
      decisionId: "D-01",
      askedBy: "architecture",
      prompt:
        "Should the checkout service own inventory reservation, or delegate to a dedicated inventory service?",
      context:
        "GAP-01 · affects service boundaries, failure modes and the release plan.",
      options: [
        {
          id: "A",
          label: "Checkout owns reservation",
          rationale: "Fewer network hops, simplest rollback, but couples stock to checkout uptime.",
        },
        {
          id: "B",
          label: "Delegate to inventory service",
          rationale: "Scales independently and reusable by other channels; adds a distributed TTL problem.",
        },
      ],
    },
    {
      id: "Q-02",
      decisionId: "D-02",
      askedBy: "technology",
      prompt: "How should payment retries be made safe?",
      context: "GAP-02 · affects data model, provider integration and test matrix.",
      options: [
        {
          id: "A",
          label: "Client-generated idempotency key",
          rationale: "Key travels with the attempt; survives client retries and network loss.",
        },
        {
          id: "B",
          label: "Server-side dedupe window",
          rationale: "No client change, but a 30s window can still double-charge on slow retries.",
        },
      ],
    },
    {
      id: "Q-03",
      decisionId: "D-03",
      askedBy: "architecture",
      prompt: "Where may EU order and address data be stored?",
      context: "GAP-03 · affects hosting topology, cost and the risk register.",
      options: [
        {
          id: "A",
          label: "EU-resident primary, no replication out",
          rationale: "Cleanest compliance story; needs a second regional deployment.",
        },
        {
          id: "B",
          label: "Single US region with SCCs",
          rationale: "Cheaper and simpler to operate, but a standing legal dependency.",
        },
      ],
    },
    {
      id: "Q-04",
      decisionId: "D-04",
      askedBy: "ux",
      prompt: "What should a shopper see when a wallet provider is unavailable?",
      context: "GAP-04 · affects UX flows, error copy and test cases.",
      options: [
        {
          id: "A",
          label: "Silently hide the wallet button",
          rationale: "No dead ends, but shoppers who expect the wallet are confused.",
        },
        {
          id: "B",
          label: "Show it disabled with a reason",
          rationale: "Honest and recoverable; requires health signalling per provider.",
        },
      ],
    },
    {
      id: "Q-05",
      decisionId: "D-05",
      askedBy: "timeline",
      prompt: "How should v2 reach 100% of traffic?",
      context: "GAP-05 · affects the plan, QA strategy and rollback story.",
      options: [
        {
          id: "A",
          label: "Staged rollout by storefront",
          rationale: "UK first, then EU, then US. Slower, but each region is independently reversible.",
        },
        {
          id: "B",
          label: "Percentage ramp behind a flag",
          rationale: "Faster to full traffic, single kill switch, harder to attribute regional issues.",
        },
      ],
    },
  ],
  agents: [
    {
      id: "technology",
      name: "Technology Agent",
      discipline: "Stack, runtime and integration fit",
      dependsOn: [],
      durationMs: 2600,
      consumes: ["D-02"],
      logs: [
        { t: "00:01", text: "reading non-functional constraints (REQ-1.3)", kind: "info" },
        { t: "00:04", text: "modelling 1,800 rpm peak against provider SLAs", kind: "info" },
        { t: "00:07", text: "checking idempotency support in provider SDK", kind: "info" },
        { t: "00:09", text: "rec: Node 20 + Postgres 16, Redis for reservation TTL", kind: "result" },
      ],
      recommendation:
        "Node 20 service, Postgres 16 as system of record, Redis for short-lived reservation locks. Provider SDK supports the chosen idempotency contract natively.",
    },
    {
      id: "ux",
      name: "UX Agent",
      discipline: "Flows, states and error recovery",
      dependsOn: [],
      durationMs: 3000,
      consumes: ["D-04"],
      logs: [
        { t: "00:01", text: "mapping 4-step flow and back-navigation", kind: "info" },
        { t: "00:05", text: "auditing empty, pending and failure states", kind: "info" },
        { t: "00:08", text: "3 states missing recovery copy", kind: "info" },
        { t: "00:11", text: "rec: inline validation + explicit wallet health", kind: "result" },
      ],
      recommendation:
        "Inline per-field validation, a persistent order summary, and an explicit wallet availability state so a provider outage never looks like a shopper error.",
    },
    {
      id: "architecture",
      name: "Architecture Agent",
      discipline: "Boundaries, data flow and residency",
      dependsOn: ["technology"],
      durationMs: 3400,
      consumes: ["D-01", "D-03"],
      logs: [
        { t: "00:10", text: "deriving service boundaries from D-01", kind: "info" },
        { t: "00:14", text: "placing the reservation TTL and its compensations", kind: "info" },
        { t: "00:18", text: "applying residency constraint from D-03", kind: "info" },
        { t: "00:21", text: "rec: event-driven core, regional primary", kind: "result" },
      ],
      recommendation:
        "Event-driven core: checkout emits reservation and payment events; order projection is rebuilt from the log. Regional primary database per residency decision.",
    },
    {
      id: "timeline",
      name: "Timeline Agent",
      discipline: "Critical path and release plan",
      dependsOn: ["architecture"],
      durationMs: 2800,
      consumes: ["D-05"],
      logs: [
        { t: "00:22", text: "sequencing against architecture output", kind: "info" },
        { t: "00:26", text: "critical path: residency deployment → payment integration", kind: "info" },
        { t: "00:30", text: "rec: 7 sprints, 2-week cadence, region-staged launch", kind: "result" },
      ],
      recommendation:
        "Seven two-week sprints. Residency deployment is on the critical path and must start in sprint 1; launch is staged per the rollout decision.",
    },
    {
      id: "qa",
      name: "QA Agent",
      discipline: "Test matrix and evidence",
      dependsOn: ["architecture", "ux"],
      durationMs: 3000,
      consumes: ["D-02", "D-04"],
      logs: [
        { t: "00:23", text: "building matrix from flows and failure modes", kind: "info" },
        { t: "00:27", text: "adding double-submit and provider-timeout cases", kind: "info" },
        { t: "00:31", text: "rec: 38 cases, 6 of them launch-gating", kind: "result" },
      ],
      recommendation:
        "38 cases across happy path, retries, residency and wallet degradation. Six are launch-gating and must pass in the target region before the ramp continues.",
    },
    {
      id: "security",
      name: "Security Agent",
      discipline: "Compliance scope and exposure",
      dependsOn: ["technology"],
      durationMs: 2400,
      consumes: ["D-03"],
      logs: [
        { t: "00:10", text: "verifying SAQ-A boundary (REQ-1.4)", kind: "info" },
        { t: "00:14", text: "scanning for card data egress paths", kind: "info" },
        { t: "00:17", text: "rec: hosted fields only, rotate keys per deploy", kind: "result" },
      ],
      recommendation:
        "Keep provider-hosted fields so SAQ-A holds. Rotate webhook signing keys on every deploy and log payment events without PAN or address detail.",
    },
  ],
  buildPackage: (decisions): ArtifactTab[] => {
    const inventory = choice(decisions, "D-01", "Checkout owns reservation");
    const retries = choice(decisions, "D-02", "Client-generated idempotency key");
    const residency = choice(decisions, "D-03", "EU-resident primary, no replication out");
    const wallet = choice(decisions, "D-04", "Show it disabled with a reason");
    const rollout = choice(decisions, "D-05", "Staged rollout by storefront");

    return [
      {
        id: "requirement",
        label: "Requirement",
        summary: "Original statements plus the clauses the decisions resolved.",
        items: [
          { id: "R-01", title: "Staged checkout flow", body: "Cart review, address, payment, confirmation across EU, UK and US storefronts.", traces: ["REQ-1.1", "REQ-1.2"] },
          { id: "R-02", title: "Peak capacity", body: "Sustain 1,800 checkouts/minute with 99.95% availability in Q4.", traces: ["REQ-1.3"] },
          { id: "R-03", title: "Inventory reservation", body: `Resolved: ${inventory}. Reservation TTL is 12 minutes with automatic release.`, traces: ["GAP-01", "D-01"] },
          { id: "R-04", title: "Safe retries", body: `Resolved: ${retries}. Duplicate attempts must never produce a second authorisation.`, traces: ["GAP-02", "D-02"] },
          { id: "R-05", title: "Data residency", body: `Resolved: ${residency}.`, traces: ["GAP-03", "D-03"] },
          { id: "R-06", title: "Wallet degradation", body: `Resolved: ${wallet}.`, traces: ["GAP-04", "D-04"] },
        ],
      },
      {
        id: "architecture",
        label: "Architecture",
        summary: "Service boundaries derived from the architecture and technology agents.",
        items: [
          { id: "A-01", title: "Checkout service", body: "Owns the flow state machine and emits reservation + payment events. Stateless, horizontally scaled.", traces: ["D-01", "architecture"] },
          { id: "A-02", title: "Reservation store", body: "Redis with 12-minute TTL keys; compensating release event on abandonment or timeout.", traces: ["D-01", "technology"] },
          { id: "A-03", title: "Order projection", body: "Postgres 16 projection rebuilt from the event log; system of record for fulfilment handoff.", traces: ["technology"] },
          { id: "A-04", title: "Regional topology", body: `${residency}. Each region runs its own primary with no cross-region replication of personal data.`, traces: ["D-03", "security"] },
          { id: "A-05", title: "Payment adapter", body: "Provider-hosted fields only; webhook receiver verifies signatures and is idempotent per attempt key.", traces: ["D-02", "security"] },
        ],
      },
      {
        id: "design",
        label: "Design",
        summary: "Flows and states from the UX agent.",
        items: [
          { id: "DS-01", title: "Four-step flow", body: "Review → Address → Payment → Confirmation, with a persistent order summary and reversible back navigation.", traces: ["ux", "REQ-1.2"] },
          { id: "DS-02", title: "Inline validation", body: "Field-level validation on blur; the submit control never fails silently.", traces: ["ux"] },
          { id: "DS-03", title: "Wallet availability state", body: `${wallet} — with a one-line reason and card fallback kept in focus order.`, traces: ["D-04", "ux"] },
          { id: "DS-04", title: "Pending authorisation", body: "Non-dismissible pending state with a 20-second timeout and a safe retry affordance.", traces: ["D-02", "ux"] },
        ],
      },
      {
        id: "tasks",
        label: "Tasks",
        summary: `Sequenced by the timeline agent — ${rollout.toLowerCase()}.`,
        items: [
          { id: "T-01", title: "Regional deployment pipeline", body: "Sprint 1 · critical path. Stand up the second regional environment.", traces: ["D-03", "timeline"], meta: "Sprint 1" },
          { id: "T-02", title: "Checkout state machine", body: "Sprint 1–2. Flow engine plus reservation events.", traces: ["D-01"], meta: "Sprint 1–2" },
          { id: "T-03", title: "Idempotent payment adapter", body: "Sprint 2–3. Attempt keys, webhook verification, replay safety.", traces: ["D-02"], meta: "Sprint 2–3" },
          { id: "T-04", title: "Wallet health signalling", body: "Sprint 3. Per-provider health feed consumed by the payment step.", traces: ["D-04"], meta: "Sprint 3" },
          { id: "T-05", title: "Launch gating evidence", body: `Sprint 6–7. ${rollout}; six gating test cases must pass per region.`, traces: ["D-05", "qa"], meta: "Sprint 6–7" },
        ],
      },
      {
        id: "testcases",
        label: "Test Cases",
        summary: "38 cases; the six listed here are launch-gating.",
        items: [
          { id: "TC-001", title: "Happy path, card, EU storefront", body: "Completes in under 20s and writes exactly one order.", traces: ["R-01"], meta: "gating" },
          { id: "TC-014", title: "Double submit within 2s", body: `With ${retries.toLowerCase()}, only one authorisation is created.`, traces: ["D-02"], meta: "gating" },
          { id: "TC-015", title: "Provider timeout then client retry", body: "No second charge; the shopper sees a single pending state resolve once.", traces: ["D-02"], meta: "gating" },
          { id: "TC-022", title: "Reservation expiry mid-payment", body: "Stock is released, the shopper is told, and the cart is recoverable.", traces: ["D-01"], meta: "gating" },
          { id: "TC-029", title: "Wallet provider unavailable", body: `${wallet} — card path remains fully usable.`, traces: ["D-04"], meta: "gating" },
          { id: "TC-033", title: "EU order data never leaves region", body: "Trace assertion over storage and log sinks for an EU checkout.", traces: ["D-03"], meta: "gating" },
        ],
      },
      {
        id: "risks",
        label: "Risks",
        summary: "Open exposure after the approved decisions.",
        items: [
          { id: "RK-01", title: "Dual-region operational load", body: `${residency} doubles deployment surface; on-call rota must cover both primaries.`, traces: ["D-03", "timeline"], meta: "medium" },
          { id: "RK-02", title: "Reservation TTL tuning", body: "A 12-minute TTL under campaign load may oversell slow-moving stock. Needs a load rehearsal.", traces: ["D-01"], meta: "high" },
          { id: "RK-03", title: "Provider webhook lag", body: "Confirmation can trail authorisation by minutes during incidents; the pending state must tolerate it.", traces: ["D-02"], meta: "medium" },
          { id: "RK-04", title: "Key rotation blast radius", body: "Rotating webhook keys per deploy risks dropped events if rotation is not overlapped.", traces: ["security"], meta: "low" },
        ],
      },
      {
        id: "decisions",
        label: "Decisions",
        summary: "The approved decision log — every artifact above traces back here.",
        items: decisions.map((d) => ({
          id: d.id,
          title: d.title,
          body: `${d.chosenLabel} — ${d.rationale}`,
          traces: d.traces,
          meta: d.approved ? "approved" : "pending",
        })),
      },
    ];
  },
};

/* ========================================================================== */
/* Scenario 2 — Clinical intake portal                                        */
/* ========================================================================== */

const intake: Scenario = {
  id: "intake-portal",
  fileName: "patient-intake-portal.md",
  title: "Patient Intake Portal",
  sizeLabel: "11 KB · 7 pages",
  blurb:
    "Pre-visit digital intake for a multi-site clinic group, replacing paper forms at reception.",
  requirement: [
    { id: "REQ-2.1", heading: "Goal", body: "Let patients complete intake forms before arrival from any device, and surface the result in the clinician's existing worklist." },
    { id: "REQ-2.2", heading: "Scope", body: "Identity capture, medical history, consent signatures, insurance details. Scheduling stays in the current booking system." },
    { id: "REQ-2.3", heading: "Users", body: "Roughly 4,000 patients weekly across 11 sites; 180 clinical staff." },
    { id: "REQ-2.4", heading: "Accessibility", body: "Must meet WCAG 2.2 AA and work on five-year-old mobile devices." },
    { id: "REQ-2.5", heading: "Out of scope", body: "Billing, prescriptions, telehealth video." },
  ],
  analysisFindings: [
    "7 pages parsed · 33 statements classified",
    "4 functional areas, 2 non-functional constraints identified",
    "Accessibility target found (REQ-2.4) — WCAG 2.2 AA",
    "No statement found covering patient identity verification strength",
    "No statement found covering partially completed form handling",
    "No statement found covering clinician worklist integration method",
    "No statement found covering consent record retention",
    "No statement found covering offline or low-connectivity behaviour",
  ],
  gaps: [
    { id: "GAP-11", title: "Identity verification strength undefined", detail: "The document never says how a patient proves who they are before seeing or entering health data.", severity: "high", questionId: "Q-11" },
    { id: "GAP-12", title: "Partial submission handling missing", detail: "Long forms will be abandoned, but no behaviour is defined for resuming or expiring a draft.", severity: "high", questionId: "Q-12" },
    { id: "GAP-13", title: "Worklist integration method unstated", detail: "Results must reach the clinician worklist; no interface or latency expectation is given.", severity: "high", questionId: "Q-13" },
    { id: "GAP-14", title: "Consent retention period missing", detail: "Signed consents are captured but retention and withdrawal are not described.", severity: "medium", questionId: "Q-14" },
    { id: "GAP-15", title: "Low-connectivity behaviour missing", detail: "Patients often complete forms in waiting rooms with poor signal.", severity: "medium", questionId: "Q-15" },
  ],
  questions: [
    {
      id: "Q-11", decisionId: "D-11", askedBy: "security",
      prompt: "How strongly must a patient prove identity before opening an intake form?",
      context: "GAP-11 · affects auth design, drop-off rate and the risk register.",
      options: [
        { id: "A", label: "Magic link plus date of birth", rationale: "Low friction, two weak factors; acceptable for pre-visit data only." },
        { id: "B", label: "One-time code to a registered phone", rationale: "Stronger and auditable; excludes patients with stale contact details." },
      ],
    },
    {
      id: "Q-12", decisionId: "D-12", askedBy: "ux",
      prompt: "What happens to a half-finished intake form?",
      context: "GAP-12 · affects data model, UX and retention policy.",
      options: [
        { id: "A", label: "Autosave drafts for 14 days", rationale: "Best completion rate; stores health data before consent is signed." },
        { id: "B", label: "Session-only, discard on exit", rationale: "Minimal data at rest; patients restart and many abandon." },
      ],
    },
    {
      id: "Q-13", decisionId: "D-13", askedBy: "architecture",
      prompt: "How should completed intakes reach the clinician worklist?",
      context: "GAP-13 · affects integration cost, latency and failure handling.",
      options: [
        { id: "A", label: "HL7 FHIR push on completion", rationale: "Near-real-time and standards-based; needs an integration engine slot." },
        { id: "B", label: "Scheduled batch export every 15 min", rationale: "Simple and robust; a same-day walk-in may arrive before their record." },
      ],
    },
    {
      id: "Q-14", decisionId: "D-14", askedBy: "security",
      prompt: "How long are signed consents retained, and can they be withdrawn?",
      context: "GAP-14 · affects storage, audit and the risk register.",
      options: [
        { id: "A", label: "Retain 7 years, withdrawal flags the record", rationale: "Matches clinical record policy; withdrawal is an append, never a delete." },
        { id: "B", label: "Retain 12 months, hard delete on withdrawal", rationale: "Smaller footprint; conflicts with existing clinical retention rules." },
      ],
    },
    {
      id: "Q-15", decisionId: "D-15", askedBy: "technology",
      prompt: "What should the form do on a poor connection?",
      context: "GAP-15 · affects client architecture and the test matrix.",
      options: [
        { id: "A", label: "Local-first with background sync", rationale: "Works in a dead-spot waiting room; adds conflict handling." },
        { id: "B", label: "Per-step save with retry banner", rationale: "Much simpler; a patient in a dead spot is blocked at the step boundary." },
      ],
    },
  ],
  agents: [
    {
      id: "technology", name: "Technology Agent", discipline: "Stack, runtime and integration fit",
      dependsOn: [], durationMs: 2600, consumes: ["D-15"],
      logs: [
        { t: "00:01", text: "profiling five-year-old device baseline (REQ-2.4)", kind: "info" },
        { t: "00:05", text: "evaluating local-first storage options", kind: "info" },
        { t: "00:08", text: "rec: progressive web app, IndexedDB queue", kind: "result" },
      ],
      recommendation: "Progressive web app with an IndexedDB write queue, server-rendered first paint, and a payload budget tuned for low-end Android.",
    },
    {
      id: "ux", name: "UX Agent", discipline: "Flows, states and error recovery",
      dependsOn: [], durationMs: 3000, consumes: ["D-12"],
      logs: [
        { t: "00:01", text: "sectioning the form by cognitive load", kind: "info" },
        { t: "00:05", text: "auditing against WCAG 2.2 AA", kind: "info" },
        { t: "00:09", text: "rec: 6 short sections, visible save state", kind: "result" },
      ],
      recommendation: "Six short sections with a visible save indicator, 44px targets, and plain-language help on every clinical term.",
    },
    {
      id: "architecture", name: "Architecture Agent", discipline: "Boundaries, data flow and integration",
      dependsOn: ["technology"], durationMs: 3200, consumes: ["D-13"],
      logs: [
        { t: "00:09", text: "mapping intake → worklist interface from D-13", kind: "info" },
        { t: "00:13", text: "designing dead-letter path for failed deliveries", kind: "info" },
        { t: "00:17", text: "rec: outbox pattern with replay", kind: "result" },
      ],
      recommendation: "Transactional outbox for worklist delivery with replay and dead-letter visibility, so a downstream outage never loses a completed intake.",
    },
    {
      id: "timeline", name: "Timeline Agent", discipline: "Critical path and rollout",
      dependsOn: ["architecture"], durationMs: 2600, consumes: [],
      logs: [
        { t: "00:18", text: "sequencing site rollout across 11 clinics", kind: "info" },
        { t: "00:22", text: "integration slot is the long pole", kind: "info" },
        { t: "00:25", text: "rec: 6 sprints, 2 pilot sites first", kind: "result" },
      ],
      recommendation: "Six two-week sprints. Two pilot sites run paper-in-parallel for a fortnight before the remaining nine sites switch over.",
    },
    {
      id: "qa", name: "QA Agent", discipline: "Test matrix and evidence",
      dependsOn: ["architecture", "ux"], durationMs: 2900, consumes: ["D-15"],
      logs: [
        { t: "00:18", text: "building accessibility and connectivity matrix", kind: "info" },
        { t: "00:22", text: "adding assistive-technology passes", kind: "info" },
        { t: "00:26", text: "rec: 31 cases, 5 launch-gating", kind: "result" },
      ],
      recommendation: "31 cases including screen-reader traversal, offline resume, and duplicate-submission handling. Five are launch-gating per site.",
    },
    {
      id: "security", name: "Security Agent", discipline: "Identity, consent and retention",
      dependsOn: ["technology"], durationMs: 2400, consumes: ["D-11", "D-14"],
      logs: [
        { t: "00:09", text: "assessing identity strength from D-11", kind: "info" },
        { t: "00:13", text: "modelling consent retention and withdrawal", kind: "info" },
        { t: "00:16", text: "rec: append-only consent ledger", kind: "result" },
      ],
      recommendation: "Append-only consent ledger with signed events, per-site access scoping, and audit logging on every read of patient-entered data.",
    },
  ],
  buildPackage: (decisions): ArtifactTab[] => {
    const identity = choice(decisions, "D-11", "One-time code to a registered phone");
    const drafts = choice(decisions, "D-12", "Autosave drafts for 14 days");
    const integration = choice(decisions, "D-13", "HL7 FHIR push on completion");
    const retention = choice(decisions, "D-14", "Retain 7 years, withdrawal flags the record");
    const offline = choice(decisions, "D-15", "Local-first with background sync");

    return [
      {
        id: "requirement", label: "Requirement",
        summary: "Original statements plus the clauses the decisions resolved.",
        items: [
          { id: "R-11", title: "Pre-visit intake", body: "Patients complete identity, history, consent and insurance before arrival, on any device.", traces: ["REQ-2.1", "REQ-2.2"] },
          { id: "R-12", title: "Accessibility", body: "WCAG 2.2 AA on five-year-old mobile hardware.", traces: ["REQ-2.4"] },
          { id: "R-13", title: "Identity verification", body: `Resolved: ${identity}.`, traces: ["GAP-11", "D-11"] },
          { id: "R-14", title: "Draft handling", body: `Resolved: ${drafts}.`, traces: ["GAP-12", "D-12"] },
          { id: "R-15", title: "Worklist delivery", body: `Resolved: ${integration}.`, traces: ["GAP-13", "D-13"] },
          { id: "R-16", title: "Consent retention", body: `Resolved: ${retention}.`, traces: ["GAP-14", "D-14"] },
        ],
      },
      {
        id: "architecture", label: "Architecture",
        summary: "Boundaries and delivery guarantees.",
        items: [
          { id: "A-11", title: "Intake PWA", body: "Server-rendered shell with an offline-capable client; payload budget enforced in CI.", traces: ["technology", "D-15"] },
          { id: "A-12", title: "Draft store", body: `${drafts}. Drafts are encrypted at rest and scoped to the verified patient session.`, traces: ["D-12", "security"] },
          { id: "A-13", title: "Worklist outbox", body: `${integration}, delivered through a transactional outbox with replay and dead-letter visibility.`, traces: ["D-13", "architecture"] },
          { id: "A-14", title: "Consent ledger", body: "Append-only signed events; withdrawal is a new event, never a deletion.", traces: ["D-14", "security"] },
        ],
      },
      {
        id: "design", label: "Design",
        summary: "Form structure and states from the UX agent.",
        items: [
          { id: "DS-11", title: "Six short sections", body: "Grouped by cognitive load with a progress rail and a resume point.", traces: ["ux"] },
          { id: "DS-12", title: "Save state", body: `Persistent indicator reflecting ${offline.toLowerCase()}, including a queued-offline state.`, traces: ["D-15", "ux"] },
          { id: "DS-13", title: "Consent signature", body: "Full-width signature field with keyboard and switch-device alternatives.", traces: ["D-14", "REQ-2.4"] },
          { id: "DS-14", title: "Verification screen", body: `${identity} — with a clinic phone number for patients whose details are stale.`, traces: ["D-11", "ux"] },
        ],
      },
      {
        id: "tasks", label: "Tasks",
        summary: "Sequenced by the timeline agent across 11 sites.",
        items: [
          { id: "T-11", title: "Integration engine slot", body: "Sprint 1 · critical path. Book and configure the worklist interface.", traces: ["D-13"], meta: "Sprint 1" },
          { id: "T-12", title: "Verified session flow", body: "Sprint 1–2. Identity check, session scoping, audit logging.", traces: ["D-11"], meta: "Sprint 1–2" },
          { id: "T-13", title: "Offline write queue", body: "Sprint 2–3. IndexedDB queue plus conflict resolution.", traces: ["D-15"], meta: "Sprint 2–3" },
          { id: "T-14", title: "Consent ledger", body: "Sprint 3. Signed append-only events and withdrawal path.", traces: ["D-14"], meta: "Sprint 3" },
          { id: "T-15", title: "Pilot site rollout", body: "Sprint 5–6. Two sites in parallel with paper before full switchover.", traces: ["timeline", "qa"], meta: "Sprint 5–6" },
        ],
      },
      {
        id: "testcases", label: "Test Cases",
        summary: "31 cases; the five listed here are launch-gating per site.",
        items: [
          { id: "TC-101", title: "Screen-reader traversal of all six sections", body: "Every field is labelled, reachable and announced in order.", traces: ["REQ-2.4"], meta: "gating" },
          { id: "TC-108", title: "Connection lost mid-section", body: `${offline} — no entered data is lost and sync completes on reconnect.`, traces: ["D-15"], meta: "gating" },
          { id: "TC-112", title: "Draft resume after 13 days", body: `${drafts} — draft opens; at day 15 it is gone and the patient is told why.`, traces: ["D-12"], meta: "gating" },
          { id: "TC-119", title: "Worklist delivery failure", body: "Completed intake is retried and visible in the dead-letter view; nothing is silently dropped.", traces: ["D-13"], meta: "gating" },
          { id: "TC-124", title: "Consent withdrawal", body: `${retention} — the original record remains auditable and flagged.`, traces: ["D-14"], meta: "gating" },
        ],
      },
      {
        id: "risks", label: "Risks",
        summary: "Open exposure after the approved decisions.",
        items: [
          { id: "RK-11", title: "Stale patient contact details", body: `${identity} excludes patients whose phone number is out of date; reception fallback must be staffed.`, traces: ["D-11"], meta: "high" },
          { id: "RK-12", title: "Health data before consent", body: "Autosaved drafts hold clinical answers prior to signature; retention policy must cover them explicitly.", traces: ["D-12", "security"], meta: "high" },
          { id: "RK-13", title: "Integration slot scheduling", body: "The interface slot is externally scheduled and is the single critical-path dependency.", traces: ["D-13", "timeline"], meta: "medium" },
          { id: "RK-14", title: "Offline conflict handling", body: "Two devices editing one intake can diverge; last-write-wins is not acceptable for clinical answers.", traces: ["D-15"], meta: "medium" },
        ],
      },
      {
        id: "decisions", label: "Decisions",
        summary: "The approved decision log — every artifact above traces back here.",
        items: decisions.map((d) => ({
          id: d.id,
          title: d.title,
          body: `${d.chosenLabel} — ${d.rationale}`,
          traces: d.traces,
          meta: d.approved ? "approved" : "pending",
        })),
      },
    ];
  },
};

export const SCENARIOS: Scenario[] = [checkout, intake];

export function getScenario(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]!;
}
