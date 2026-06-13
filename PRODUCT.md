# Orbit — OS for Solo Founders

## What

Orbit is a unified operating system for solo founders that replaces the Notion CRM template + Folk + Linear patchwork with one tool that closes the relationship-to-product loop: contacts (customers, investors, partners), deal pipeline, product backlog, and an AI that reads your email to keep everything current with zero manual input. One person, one dashboard, one context.

---

## For Whom

**Ideal Customer Profile:**

- Solo founder or two-person founding team, pre-Series A (seed or bootstrapped)
- Active across 3+ relationship types simultaneously: prospects/customers, investors, contractors or partners
- Current stack: Gmail + Notion + Google Sheets + Linear + Zapier — five tabs, zero continuity
- Technically capable (can set up integrations) but time-poor (does not want to)
- Pain trigger: dropped investor follow-up, missed customer feature request, or a CRM abandoned after 60 days because maintenance cost exceeded value
- Revenue stage: $0–$500k ARR — small enough to be one person, large enough for the chaos to be real
- Geography: global; dominant cohort is English-speaking (US, EU, APAC startup hubs)
- **Not:** sales team leads, enterprise ops managers, freelancers managing a single client list

---

## The Pain It Kills

### Pain 1: The multi-tool patchwork collapse

> "You get an email from a client. To reply, you need to check Slack for the latest update, find the Jira ticket, remember what was said in yesterday's meeting, pull the right number from the CRM. You do this ten times a day."
> — Mehdi, co-founder of Revo (news.ycombinator.com/item?id=46981847)

The dominant stack (Gmail + Notion + Sheets + Linear + Zapier) collapses at 10–15 simultaneous conversations. Nothing talks to anything. Context lives only in the founder's head. Orbit eliminates the stack: one tool contains all relationship types, the product backlog, and deal pipeline natively.

### Pain 2: Manual data entry kills every CRM

> "Juggling leads, client projects, and follow-ups across spreadsheets, email threads, and sticky notes isn't just chaotic — it's a direct path to missed opportunities."
> — AddToCRM solopreneur CRM guide (addtocrm.com/tools/best-crm-for-solopreneurs)

60–90 days in, founders abandon CRMs because maintenance cost exceeds value. Folk enriches 500 contacts/month on its standard plan — pathetically low. HubSpot automation requires paid tiers. Orbit auto-captures relationship signals from email and calendar with zero manual input.

### Pain 3: CRM and product backlog are completely disconnected

> "This is still a shit show. Every tool in its own silo, data that never lines up, more time spent gluing things together than actually selling."
> — Doug Camplejohn, CEO of Coffee (coffee.ai/articles/attio-vs-folk-crm-startups)

Customer calls generate feature requests that should flow directly into a prioritized backlog. Instead, call notes sit in Folk/Notion, feature requests live in Linear, and the founder manually bridges them every time. No CRM vendor builds backlog tools; no backlog tool builds CRM. Orbit owns the full loop natively.

---

## Why Now — 2026 Market Context

Three forces converge in 2026:

1. **AI context has arrived.** Models can now read email threads, extract relationship signals, draft contextually accurate follow-ups, and prioritize backlogs from customer conversations. The technical barrier to "zero data entry CRM" collapsed in 2025. Incumbents have 5–10 years of technical debt preventing them from rebuilding around this.

2. **HubSpot gutted its free tier in Sept 2024.** New accounts are capped at 1,000 contacts and 2 users. Founders who grew up on free HubSpot are actively looking for alternatives. The moat is gone; the migration window is open.

3. **Incumbents went upmarket.** Attio explicitly abandoned the solo founder for mid-market in 2025. Folk hit its ceiling as a Rolodex. Pipedrive restructured pricing in late 2025 with surprise renewal increases. The entire market moved toward teams. No one is building for the solo operator.

---

## Competitors + Their Gaps

| Tool | Price | What it does | Fatal gap for solo founders |
|---|---|---|---|
| Folk.app | $24–$60/seat/mo | Contact rolodex, AI enrichment | No mobile app. Deal management paywalled. No backlog. Hits ceiling in 3 months. |
| Attio | $0–$69/seat/mo | Flexible CRM (Notion-for-CRM) | Setup burden prohibitive. Went upmarket; abandoned solo segment. Automation caps. No SLA. |
| Clay.com | $149–$800+/mo | Data enrichment, 100+ providers | Billing burns budget catastrophically. No relationship management. Wrong tool category entirely. |
| HubSpot Free→Paid | $0–$20+/seat/mo | Market default CRM | Free tier gutted Sept 2024 (1k contacts). 2,300% cost increase as you grow. Bait-and-switch model. |
| Pipedrive | $14–$99/seat/mo | Sales-team Kanban pipeline | Built for SDR teams. Add-ons for everything. Surprise price increases 2025. Solves wrong problem. |
| Less Annoying CRM | $15/seat/mo | Simple, honest contact CRM | Zero AI. Zero backlog. Zero investor pipeline. Built for 2009. |
| Notion templates | $0 (+ $10 Notion) | DIY CRM | Breaks at scale. No automation, no email sync, no enrichment. The "before" state Orbit replaces. |
| Twenty (OSS) | $0 + infra | Open-source CRM | No marketing automation. Basic reporting. No mobile. Requires self-hosting. |

---

## Core Features — MVP (Ruthlessly Prioritized)

### Must ship (pre-launch):

1. **Unified contact model** — one person-record that carries a role tag (customer / investor / partner / candidate). No separate databases per relationship type.
2. **Deal pipeline** — Kanban + list view. Stages configurable per pipeline type (sales vs fundraising vs partnership). Stage-change timestamps for stall detection.
3. **Product backlog** — Kanban board with feature requests linkable to the contact who asked. Priority score = frequency × deal size.
4. **AI follow-up assistant** — reads email thread + contact history → drafts contextual follow-up. Not generic GPT; grounded in actual relationship data.
5. **Email sync** — Gmail OAuth. Auto-log emails to contact record. Zero manual input required.
6. **Investor pipeline view** — specialized deal view: amount, stage, last contact date, 30-day stall alert.
7. **Founder dashboard** — single screen: stalling deals, overdue follow-ups, top feature requests, backlog sprint, contacts not touched in 30+ days.
8. **CSV / Notion import** — frictionless onboarding from the tool they're already using.
9. **Auth + workspace** — Clerk-based. Single-user default. Invite up to 2 seats without pricing change.

### Post-launch (P1):

- Calendar sync (auto-create contact records from meeting attendees)
- AI-generated investor update draft (from deal pipeline + backlog data)
- Mobile PWA (the #1 complaint against Folk)
- LinkedIn contact enrichment
- Zapier / webhook outbound (for founders who want to pipe data out)
- Export to CSV at any time (trust signal, anti-lock-in)

---

## Stack

### Monorepo structure (Turborepo)

```
apps/
  web/     ← Next.js 16 (App Router) — UI, SSR, Clerk auth flows
  api/     ← Hono.js on Node.js — REST API, business logic, DB access
packages/
  db/      ← Drizzle ORM schema + query helpers (shared)
  types/   ← Shared TypeScript interfaces (Contact, Deal, Task…)
```

### Frontend (`apps/web`)

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router) | RSC, streaming, Clerk integration, Vercel deploy |
| Auth | Clerk (frontend SDK) | Google OAuth + magic link; JWT issued per request |
| UI | Tailwind + shadcn/ui (@base-ui/react) | Fast, accessible; no `asChild` — use `buttonVariants()` pattern |
| API client | fetch + shared `packages/types` | Typed calls to `apps/api`; Clerk JWT in `Authorization` header |

### Backend (`apps/api`)

| Layer | Choice | Reason |
|---|---|---|
| Framework | Hono.js (Node.js) | TypeScript-native, Web API standard, Express-like DX, fast |
| Auth | Clerk JWT verification (`@clerk/backend`) | Verify token server-side; extract `userId` from claims |
| Database | PostgreSQL + Drizzle ORM (`packages/db`) | Same schema shared with frontend; type-safe queries |
| AI | Claude API (claude-sonnet-4-6, Anthropic SDK) | Email thread context + structured extraction |
| Email | Resend | Transactional + digest emails |
| Validation | Zod | Input validation on every route |

### Infrastructure

| Layer | Choice | Reason |
|---|---|---|
| Monorepo | Turborepo | Parallel builds, shared packages, dep graph caching |
| Hosting (web) | Vercel | Zero-config Next.js deploy |
| Hosting (api) | Railway or Fly.io | Node.js long-running process; not edge (needs DB pool) |
| Database | PostgreSQL (Railway) | Managed, cheap, same region as API |

---

## Business Model

**Pricing philosophy:** flat per-workspace, not per-seat. The per-seat model is a tax on being small. Orbit charges for value, not headcount.

| Tier | Price | Limits | Target |
|---|---|---|---|
| **Solo** | $29/month or $290/year | 1 user, 2,000 contacts, 3 pipelines, 100 AI actions/mo | Pre-revenue founder, early traction |
| **Founder** | $49/month or $490/year | 3 users, unlimited contacts, unlimited pipelines, 500 AI actions/mo | Funded seed, small team |
| **Studio** | $99/month or $990/year | 10 users, unlimited everything, priority support, API access | Small agency or multi-product founder |
| **Free trial** | $0 for 14 days | Full Founder tier features | Activation — no credit card required |

No seat multiplier. No feature-gated add-ons for core features (automation, AI, export). All tiers include: CSV export, email sync, backlog, deal pipeline, AI follow-up.

**Revenue target:** 500 Solo subscribers = $14,500 MRR. 100 Founder subscribers = $4,900 MRR. Combined $20k MRR reachable at ~600 paying users — solo-founder-scale growth.

---

## Positioning

**One-liner:**

> Orbit replaces your Notion CRM + Folk + Linear stack with one tool that keeps your customer deals, investor pipeline, and product backlog in sync — and an AI that handles the follow-ups you keep forgetting.

**Shorter (for ads/tagline):**

> The OS for solo founders. Customers, investors, backlog — one place.
