# Orbit — Product Backlog

Format: [Priority] [Status] Task — Why it matters

P0 = must ship for launch | P1 = ship within 60 days | P2 = ship within 90 days | P3 = future

---

## Infrastructure — Backend/Frontend Split

[P0] [DONE] Create `backend/` — Hono.js REST API on :3001 with Clerk JWT middleware, CORS, contacts/deals/tasks CRUD, Drizzle ORM, full TypeScript (typecheck clean).

[P0] [DONE] Create `frontend/` — Next.js 16 App Router on :3000 with Clerk, shadcn/ui, typed api-client.ts.

[P0] [DONE] Add `frontend/src/middleware.ts` — Clerk auth middleware protecting /dashboard/* routes, redirect unauthenticated to /sign-in.

[P0] [DONE] Add workspace_id to DB schema — workspaces + workspace_memberships tables, workspaceId FK on all tables, lazy workspace provisioning on first API call.

[P0] [DONE] Build dashboard shell — layout with sidebar nav (Contacts/Deals/Tasks/Backlog/Dashboard), contacts list page, new contact form.

[P0] [TODO] Add Clerk webhook handler in backend `POST /webhooks/clerk` — optional enhancement; lazy provisioning (create workspace on first API call) handles the MVP case without requiring webhook configuration.

[P0] [DONE] Build pipeline_type enum on deals table (sales / fundraising / partnership) with stage label sets per type and a type switcher in Kanban header — investor pipeline stages differ from sales; one component, two label sets.

[P0] [TODO] Add mobile-first contact quick-add flow (name + email only, skip optional fields) — 53% abandonment due to setup friction; add-contact must work one-handed on mobile.

[P1] [DONE] Build relationship health score in contact list (days since last_contacted_at, color-coded red/amber/green) — ambient risk signal that Folk doesn't have; shows "last touched 47 days ago" in red directly in list.

[P1] [DONE] Add Railway deploy config `backend/railway.toml` — Hono needs persistent Node.js process with pg pool; Vercel edge functions can't hold DB connections — Required for production.

[P1] [TODO] Add Vercel deploy config `frontend/vercel.json` with NEXT_PUBLIC_API_URL pointing to Railway backend URL — Frontend must know production API URL at build time.

---

## Database Schema

[P0] [TODO] Design and migrate unified contact schema with role_type enum (customer / investor / partner / candidate) — Research shows founders manage 4 relationship types in 4 different tools; one person-record with a tag eliminates the split.

[P0] [TODO] Design deal_pipeline table with stage, stall detection timestamp, and pipeline_type enum (sales / fundraising / partnership) — Pipedrive's fatal flaw is being a sales-team tool only; typed pipelines let one schema serve investor and customer pipelines without separate tables.

[P0] [TODO] Design backlog_item table with feature_request_source FK to contact and priority_score column — Research finding: customer-call-to-backlog link is structurally unsolved. Attribution column ("John Doe asked for this in 3 calls") is the differentiating field.

[P0] [TODO] Design email_sync_log table to record auto-logged email threads per contact (message_id, thread_id, direction, synced_at) — Zero-manual-input is the design constraint; the DB must store sync state to prevent double-logging on re-auth.

[P0] [TODO] Design ai_action_log table tracking AI drafts per workspace per billing period with monthly reset — AI action limits are a billing tier constraint; must be tracked at DB level, not in memory.

[P0] [TODO] Write Drizzle ORM migrations for all P0 tables with correct FK constraints and indexes (contact_id, workspace_id, created_at) — Un-indexed FK lookups on deal+contact joins will be the first production slowdown; index these before first user.

[P1] [DONE] Design activity_feed table (type, contact_id, metadata JSONB, occurred_at) for timeline view — Founders need to see "last touched 18 days ago" without querying email_sync_log directly; activity feed is the denormalized view.

[P1] [TODO] Add enrichment_cache table (contact_id, provider, data JSONB, fetched_at, expires_at) for LinkedIn/Apollo enrichment results — Clay's fatal flaw is burning credits on re-enrichment. Cache enrichment results with TTL at DB level.

---

## Auth

[P0] [TODO] Implement Clerk auth with Google OAuth + magic link, workspace creation on first login — Google OAuth is the default for founder email; magic link handles non-Gmail. Clerk webhooks fire workspace provisioning.

[P0] [TODO] Implement Clerk webhook handler to create workspace + owner record on user.created event — First-login experience must be instant; async workspace creation via webhook is the right pattern.

[P0] [TODO] Add workspace membership table with role enum (owner / member) and enforce row-level workspace isolation on all DB queries — Multi-user (up to 3 seats on Founder tier) requires workspace-scoped access. Missing this is a data leak.

[P1] [DONE] Implement seat count enforcement middleware — Pricing tiers cap seats (1 / 3 / 10). Enforce at API layer, not just UI, to prevent billing bypass.

---

## Core Contact Model

[P0] [TODO] Build contact CRUD API (POST /contacts, GET /contacts/:id, PATCH /contacts/:id, DELETE /contacts/:id) with Zod validation — Core of the product. Strict input validation prevents garbage data that breaks AI context generation.

[P0] [TODO] Build contact list UI with search, filter by role_type, and sort by last_activity — The unified view of all relationship types in one place is the primary differentiator vs Folk (Rolodex only) and HubSpot (enterprise UI).

[P0] [TODO] Build contact detail page with activity timeline, linked deals, linked backlog items, and email thread log — Full context in one screen is the answer to "You get an email from a client. To reply, you need to check Slack, find the Jira ticket, remember what was said..." (pain quote #1).

[P0] [TODO] Implement duplicate detection on email address + full name fuzzy match (not just exact match) — Folk only catches exact name duplicates; fuzzy matching on import is table stakes for clean data.

[P1] [TODO] Build bulk import from CSV with field mapping UI and duplicate preview — Notion CRM template and Google Sheets are the tools Orbit replaces; CSV import is the activation step. Frictionless onboarding = higher conversion from trial.

[P1] [TODO] Implement Notion database export parser (Notion exports CSV with specific field naming conventions) — Notion CRM template users are a primary acquisition target. Parse their specific export format without mapping friction.

---

## Deal Pipeline

[P0] [TODO] Build deal pipeline Kanban component with drag-and-drop stage changes and stage_changed_at timestamp on every move — Stage-change timestamps enable stall detection (30-day no movement = surface in dashboard). Pipedrive does this; it is the minimum viable pipeline.

[P0] [TODO] Build pipeline_type switcher (sales / fundraising) with stage labels configurable per type — Investor pipeline stages (Intro → Meeting → DD → Term Sheet → Closed) differ from sales stages. One component, two label sets. Avoids the Visible.vc $49/mo investor-only tool.

[P0] [TODO] Build stall detection query: deals with no stage change in 30 days, surfaced in dashboard and daily digest — Research: "The moment you start talking to more than ten investors, things slip." Proactive surfacing beats manual review.

[P1] [TODO] Add deal-to-contact association (one deal, multiple contacts, with role per contact: primary / cc / blocker) — Real deals involve multiple people; linking all contacts to a deal enables AI to pull full conversation history when drafting updates.

[P1] [TODO] Build investor pipeline specialized view with: check size field, fund name, portfolio link, last contacted date, follow-up due date — Affinity and Visible charge $49-800+/month for investor-specific features. Orbit includes this in the base plan.

---

## Product Backlog / Kanban

[P0] [DONE] Build backlog Kanban with columns: Inbox / This Week / In Progress / Done — Founders need a sprint-lite system, not full story points and velocity (over-engineering kills adoption). Four columns cover 90% of solo founder workflow.

[P0] [TODO] Build feature request creation from contact record ("Add to backlog" button on contact page) — This is the CRM-to-backlog link that is structurally unsolved by every competitor. One click from a contact record creates a backlog item with attribution pre-filled.

[P0] [TODO] Build backlog item detail with: description, linked contacts (who asked), priority score (frequency × deal size), and status — Priority score auto-calculated from how many contacts asked + their deal value. Surfaces "what to build next" from CRM data automatically.

[P1] [DONE] Build "Feature Request Report" view: backlog items ranked by number of contacts requesting, with deal value sum per item — Founders need to answer "what do customers actually want most?" This report generates that answer from CRM data without manual counting.

---

## Email Sync

[P0] [TODO] Implement Gmail OAuth read-only scope with token storage (encrypted at rest) and background sync job — Zero-manual-input is the design constraint. Email sync is not optional; it is the feature that breaks the 60-90 day abandonment cycle.

[P0] [TODO] Build email thread parser: extract contact email, match to contact record, auto-create contact if not found, log thread to activity feed — Auto-create on new sender is the "zero data entry" behavior. Founders should never manually log a conversation.

[P0] [TODO] Implement email sync webhook or polling loop with idempotency check on message_id — Duplicate email log entries corrupt the activity timeline. message_id deduplication is required before any user sees synced data.

[P1] [TODO] Build Gmail OAuth re-auth flow for expired tokens with user notification and no data loss — Token expiry is the silent killer of email sync products. Handle refresh silently; surface failure as a notification, not a broken feed.

[P2] [TODO] Add Outlook OAuth support (Microsoft Graph API) — Significant portion of founders use Outlook/Microsoft 365. Blocks enterprise and EU cohorts.

---

## AI Features

[P0] [DONE] Build AI follow-up draft endpoint: takes contact_id + optional prompt → fetches last 10 email threads + call notes + contact metadata → sends to Claude API → returns draft — The #1 unrealized AI feature per research. Not generic GPT; grounded in actual relationship history. This is the core AI differentiator.

[P0] [TODO] Implement AI action counter middleware: decrement workspace AI quota on every Claude API call, return 429 with upgrade prompt at limit — AI action limits are a monetization constraint. Enforce at API middleware level; do not trust client to track.

[P1] [DONE] Build AI investor update generator: takes pipeline data + top backlog items + metrics fields → drafts a founder update email — Founders write investor updates manually every month. This is high-value, low-frequency AI use case that justifies the subscription renewal.

[P1] [TODO] Build AI contact enrichment from email signature: parse Name, Title, Company, LinkedIn URL from inbound email signatures using Claude extraction — Reduces manual contact creation. First enrichment step that requires zero external API credits.

[P2] [TODO] Build AI "relationship health" score per contact: days since last contact, response rate, sentiment trend → score 0-100 surfaced in contact list — Ambient dread ("Did I forget someone important?") is a core emotional pain. A score makes the risk visible and actionable.

[P2] [TODO] Implement AI backlog prioritization suggestion: reads feature request frequency + deal values → suggests re-ordering with reasoning — Bridges CRM signal to product decision. Surfaces "customers with $10k+ deals asked for X in 4 conversations" as a prioritization argument.

---

## Import / Export

[P0] [DONE] Build CSV export for all contacts — Trust signal and anti-lock-in. Founders who know they can leave convert better. Export must be available on all tiers with no gate.

[P1] [TODO] Build Folk CSV import parser (Folk-specific field naming: "People" export format) — Folk is the direct competitor we expect to convert users from. Parse their exact export format.

[P1] [TODO] Build HubSpot CSV import parser (HubSpot exports contacts, companies, deals as separate CSVs) — HubSpot free-tier refugees are a major cohort after the Sept 2024 free tier gutting.

[P2] [TODO] Build Zapier outbound webhook (contact created, deal stage changed, backlog item added) — Founders who use Zapier today expect to pipe data out. Outbound webhooks cover 80% of integration use cases without building native integrations.

---

## Analytics / Dashboard

[P0] [DONE] Build founder dashboard: stalling deals (30+ days no move), overdue follow-ups (no activity in N days per contact), top feature requests, contacts not touched in 30 days — The "single screen that shows your entire business" that research says does not exist. This is the product promise on the landing page.

[P1] [DONE] Build deal pipeline velocity metrics: average days per stage, conversion rate stage-to-stage — Founders want to know "where do deals die?" without opening Salesforce. Simple stage analytics with no configuration.

[P2] [TODO] Build weekly digest email (Resend): stalling deals, follow-ups due this week, AI-generated suggested next action per deal — Passive re-engagement with the product. Founders who don't log in daily still get value. Reduces churn.

---

## Tests

[P0] [TODO] Write unit tests for Zod validation schemas (contact, deal, backlog item) covering invalid inputs and edge cases — Zod schemas are the contract for all API inputs. Missing test coverage here means production data corruption on unexpected inputs.

[P0] [TODO] Write integration tests for email sync parser: mock Gmail API response → assert correct contact match, activity log creation, duplicate prevention — Email sync is the most complex stateful operation; integration tests catch deduplication bugs before users see duplicate entries.

[P1] [TODO] Write end-to-end tests (Playwright) for critical user flows: create contact, create deal, drag deal to next stage, create backlog item from contact — E2E coverage on the 3 core flows protects against UI regressions as the product evolves.

[P1] [TODO] Write unit tests for AI follow-up endpoint: mock Claude API response, assert correct prompt construction (includes last N emails + contact metadata) — The AI feature value depends on the prompt including the right context. Test the prompt assembly logic, not just the API call.

[P2] [TODO] Load test email sync with 500 contacts × 10 emails each (5,000 records): assert sync completes under 30 seconds, no duplicate entries — At scale, the sync job becomes the performance bottleneck. Load test before it becomes a user complaint.

---

## Security

[P0] [TODO] Implement workspace row-level isolation on all Drizzle queries: every query filters by workspace_id from session, never from client input — Missing workspace isolation is a data leak. This is the #1 security issue for multi-tenant SaaS. Enforce at query layer, not just UI.

[P0] [TODO] Encrypt Gmail OAuth tokens at rest using AES-256 before storing in DB — OAuth tokens are high-value credentials. Plaintext token storage is a critical vulnerability; encrypt before first user.

[P0] [DONE] Add rate limiting on AI endpoints (per workspace: 10 requests/minute) to prevent credit exhaustion attacks — AI action quotas can be drained via scripted requests without rate limiting. Protect before launch.

[P1] [TODO] Implement CSRF protection on all state-mutating API routes — Next.js App Router does not provide CSRF protection by default. Required before any authenticated form submission.

[P1] [TODO] Add input sanitization for all free-text fields before storing (contact notes, deal descriptions, backlog item text) — XSS via stored HTML in notes fields is a common attack vector on CRM tools. Sanitize on write, not on read.

---

## Research-Driven — New Pain Points (2026-06-13)

[P0] [DONE] Build per-contact follow-up cadence: set weekly/monthly/quarterly target per contact, surface a daily "going cold" list ranked by relationship value × days overdue — Founders lose deals because "Proposal Sent" sits 2 weeks with zero flag; cadence tracking makes the silence visible.

[P0] [DONE] Build "close the loop" feature: when a backlog item ships, auto-surface every contact who requested it with a one-click draft email — "Reach back out when you build the feature, the gap is no longer a barrier" is the highest-ROI sales motion; Orbit is the only tool that can do this because it holds both CRM + backlog.

[P1] [TODO] Add backlog priority score: rank items by sum of deal values from requesting contacts × request frequency — Founders can't answer "what do customers actually want most?" without this; it bridges CRM signal to product decision automatically.

[P1] [TODO] AI voice learning: fine-tune follow-up drafts on the founder's own sent-email history to match writing style — Generic AI output is being detected as spam (30% spam rate); drafts grounded in the founder's real voice survive inbox filters.

[P1] [TODO] Zero-field email activity capture: auto-log Gmail threads to contact timeline without any user action — Manual logging deteriorates during busy periods; "Sunday CRM cleanup" is the signal your tool has failed; auto-capture prevents it.

[P1] [DONE] Tool-sprawl cost calculator on landing page: show "45–75 min/day lost to context switching between 6 tools" with a savings estimate — Concrete time-cost framing converts better than feature lists; 45-75 min/day = 5 hours/week = a full working day per month.

[P2] [DONE] Add deal-won close-loop automation: when a deal moves to closed_won, prompt to log what feature/argument closed it and tag those backlog items — Tracks what actually wins deals, not just what customers request.

[P2] [TODO] Weekly digest push notification: stalling deals count, contacts going cold this week, backlog items with 3+ requests — Founders who don't log in daily still need to know what's at risk; digest keeps the product valuable without daily active use.

---

## UX Polish

[P1] [DONE] Add dark/light/system theme toggle in Settings — founder expects to control appearance; three-button picker (Light/Dark/System) using next-themes, persists across sessions via localStorage.



[P0] [TODO] Design and implement empty states for each main view (no contacts, no deals, no backlog items) as action prompts, not failure states — Research insight: Orbit's UX must never make founders feel guilty for having an empty CRM. Empty state = onboarding prompt, not a blank void.

[P1] [DONE] Implement optimistic UI updates for deal drag-and-drop (update UI immediately, sync to server in background, rollback on error) — Laggy Kanban boards kill daily use. Optimistic updates make the tool feel fast even on slow connections.

[P1] [DONE] Build keyboard shortcuts for common actions: N (new contact), D (new deal), B (new backlog item), / (search) — Power users discover keyboard shortcuts and become the loudest advocates. Table stakes for a "founder OS" positioning.

[P2] [DONE] Implement dark mode with system preference detection — Standard expectation for developer-adjacent founders. No design argument needed; just ship it.

---

## Accessibility

[P1] [TODO] Audit all interactive elements for keyboard focus management and ARIA labels (Kanban drag-and-drop, modal dialogs, dropdown menus) — shadcn/ui provides ARIA baseline but Kanban drag-and-drop requires custom ARIA live regions. Required for WCAG 2.1 AA compliance.

[P2] [TODO] Add skip-to-content link and logical heading hierarchy (h1/h2/h3) on all pages — Screen reader navigation requires heading structure. Audit with axe-core before launch.

---

## Mobile

[P1] [TODO] Implement responsive layout for contact list and contact detail page (mobile-first breakpoints) — The #1 complaint against Folk is no mobile app. Orbit launches as a mobile-optimized web app. Responsive layout ships before PWA manifest.

[P1] [TODO] Add PWA manifest and service worker for home screen install and basic offline support (contact list read from cache) — PWA bridges the gap between "no mobile app" and native app. Founders can add Orbit to their phone home screen on day one.

[P2] [TODO] Test and optimize touch interactions: Kanban drag-and-drop on mobile, swipe gestures for contact actions — Touch-based Kanban is genuinely hard. Test on real devices (iOS Safari, Android Chrome) before shipping mobile layout.

---

## Onboarding

[P0] [DONE] Build onboarding flow: step 1 (welcome), step 2 (add first contact), step 3 (create first deal) — Research: founders abandon CRMs 60-90 days in because maintenance cost exceeds value. Guided onboarding reduces time-to-value and prevents day-1 abandonment.

[P0] [TODO] Build import-first onboarding path: detect if user has CSV and show import UI before showing empty dashboard — Empty dashboard on first login is the conversion killer. Import-first means the product feels valuable from minute one.

[P1] [DONE] Build in-app checklist widget (5 steps: add contact, log activity, create deal, set cadence, add backlog item) — Activation checklists measurably improve 30-day retention. Simple persistent progress widget, dismissable, hides when all steps done.

[P1] [TODO] Send onboarding email sequence (Resend): day 0 welcome, day 3 "did you connect Gmail?", day 7 "here's your first follow-up suggestion" — Email-driven activation recaptures founders who signed up and didn't fully onboard. Day 3 and day 7 touchpoints are the highest-leverage re-engagement moments.

[P2] [TODO] Build demo workspace pre-populated with 10 sample contacts, 2 pipelines, and 5 backlog items for try-before-import — Founders evaluating tools need to see a populated product, not empty tables. Demo workspace eliminates the "blank page" barrier.

---

## Research-Driven — New Pain Points (2026-06-13 round 2)

[P1] [DONE] Multi-channel DM paste: add "Paste conversation" button on contact activity log — accepts raw LinkedIn DM, WhatsApp, X thread paste and logs it as an activity — 53% of founder sales happen over DMs, not email; the CRM never sees those conversations.

[P1] [DONE] Pre-meeting context brief: one-card auto-summary before a call (last touchpoint, open commitments, deal status, relevant backlog asks) triggered from contact detail — founders blank on context mid-call; this is the first thing they'd google instead of using CRM.

[P1] [DONE] Contact data staleness alert: flag contacts with no email update + no activity in 180d with a "verify or archive" nudge — contact data decays 25–35%/year; stale data turns CRM from asset to liability without visible signal.

[P2] [TODO] Full-text search over contact notes (not just name/email/company) — founders search by what someone said, not who they are; "who mentioned pricing was a blocker" requires notes-level search.

[P2] [TODO] "Who do I know who…" semantic contact search: free-text query matches across roles, notes, companies, tags — Folk markets this as a differentiator; current search is structured-field only.

[P1] [DONE] Contact edit page — Edit button on contact detail linked to /new (wrong); need pre-filled edit form at /contacts/[id]/edit.

[P2] [TODO] One-click full data export (JSON + CSV bundle): contacts + deals + backlog + activities in one zip — "at least we know what's in there" is why founders stay on spreadsheets; visible portability guarantee reduces lock-in anxiety and improves trial-to-paid conversion.

---

## Research-Driven — New Pain Points (2026-06-13 round 3)

[P1] [DONE] AI morning brief: daily AI-generated priority feed — "who to call today, what deals are at risk, what commitments did you make" — founders manually scan 3-5 views each morning; one consolidated AI brief replaces the assembly cost.

[P1] [DONE] Proactive deal nudge notifications: at-risk deals (14–29d no movement) shown as amber banner above red action sections on dashboard — distinct tier from stalling (30d+, red) for earlier intervention.

[P2] [TODO] Selective enrichment: when enriching a contact from LinkedIn/API, show diff between stored vs. fetched fields and let founder choose which to accept — enrichment that overwrites hand-curated notes destroys trust; Folk users cite this as a top complaint.

[P2] [TODO] Mobile quick-capture: one-tap "log a touchpoint" from home screen (PWA shortcut) — relationships happen away from the desk; current mobile UX requires 4 taps to log a call; PWA shortcuts cut it to 1.

[P3] [DONE] "Missing data" record health score: show per-contact completeness score (email? linkedin? last_contacted? company?) as a bar in contact list — founders can't trust CRM data they can't audit; visible completeness reduces data decay.

---

## Research-Driven — 2026-06-13 round 5 (fresh web research)

[P1] [DONE] Follow-up reminders with activity history: mark reminder as done → auto-log as activity — Folk reminders can't be marked done, zero history; dashboard "Called" button sets lastContactedAt and creates a call activity in one click.

[P1] [DONE] AI investor update draft: one-click monthly investor update email from pipeline data + recent activities + top backlog items — founders write these manually every month; high-value recurring AI use case that justifies subscription renewal.

[P1] [TODO] Relationship intelligence: "who do I know at [company]?" cross-references contacts by company name on deal and backlog pages — warm intros convert 5× cold; no CRM surfaces this automatically; Folk and Attio both miss it.

[P2] [TODO] Transparent AI quota display: show remaining AI actions this month inline on every AI button tooltip — Attio's automation credit caps "catch teams off guard mid-month"; visible remaining quota prevents surprise 429s.

[P2] [TODO] Contact completeness nudge: when adding a new contact, show a completeness bar (email? linkedin? company? cadence?) with one-tap "fill in later" — Folk and HubSpot get abandoned because data quality decays silently; visible completeness creates habit of better data.

[P2] [DONE] Stage-change forced next-action: when moving a deal to a new stage, auto-focus the next-action input on that card — the most common pipeline rot cause is a stage move with no committed next action; forcing it at move time prevents stall.

## Research-Driven — 2026-06-13 round 4 (previous)

[P1] [DONE] Voice note to activity: record a 30-second voice memo from contact page, transcribe via Web Speech API, auto-log as activity — data entry is the core CRM hatred; 6+ hrs/week lost to manual logging; voice capture eliminates it without typing.

[P1] [DONE] "Who do I know at [company]?" shortcut: company name link on deal card filters contacts — warm intros convert 5× better than cold; CRMs never surface existing connections for a target deal.

[P1] [DONE] Notion CSV import improvements: add lastContactedAt + twitterHandle column support for Notion/Folk/HubSpot exports — Notion-as-CRM has 3-month adoption then abandon cycle; frictionless import captures these lapsed users at the moment of failure.

[P1] [DONE] Automation triggers (webhook out): fire a webhook when deal stage changes, contact added, or cadence overdue — Folk has no native automation; founders wire their own Zap to get basics; native webhook eliminates the Zap tax.

[P2] [DONE] Context card before cold outreach: AI cold-start component (ANGLE/HOOK/DRAFT) on contact detail when no activity exists — founders spend 15-20 min manually researching before each cold email; Orbit can draft the context in seconds.

[P2] [DONE] Per-deal next-action field: a single "Next step" text field + due date on each deal card in the Kanban — "what do I do next on this deal?" is the most common stall; forcing a next-action at every stage change reduces pipeline rot.

[P3] [TODO] Zapier / Make integration: list Orbit as a Zapier app with triggers (new contact, stage changed) and actions (create contact, log activity) — founders who already use Zapier will connect Orbit to their existing stack automatically.

[P3] [TODO] Team invite (1–3 seats): add a co-founder/EA seat with read/write access to the same workspace — solo founders graduate to "1 employee" and need to share CRM context without paying enterprise prices.
