# Orbit — Progress Log

## Session: 2026-06-13 — Foundation

### Completed

- Pivoted project from WaitlistKit to Orbit (solo-founder OS)
- Wrote PRODUCT.md: full product definition, ICP, pain analysis, competitor matrix, pricing tiers, stack decisions
- Wrote BACKLOG.md: 60+ prioritized tasks across 12 domains (P0–P3), each with a why-it-matters rationale
- Wrote RESEARCH.md: market research foundation (HubSpot free tier gutting, Attio going upmarket, Folk ceiling)
- Replaced old waitlist schema with Orbit domain schema in `src/db/schema.ts`:
  - `contacts` table with `contact_type` enum (lead / customer / investor / advisor / partner), indexed on userId + email
  - `deals` table with `deal_stage` enum (prospect → closed_won/lost), FK to contacts with cascade delete
  - `tasks` table with `task_status` + `task_priority` enums, FK to both contacts and deals
  - `activities` table for timeline feed (email, call, note events), FK to contacts + deals
  - Drizzle inferred types exported for all 4 tables
- Wired Clerk auth in `src/app/layout.tsx` (ClerkProvider wrapping, Orbit metadata title/description)
- Added Sonner toaster to root layout
- Cleaned up old WaitlistKit API routes, dashboard pages, public waitlist pages, and lib utilities
- Added `src/components/ui/tabs.tsx` and `src/components/ui/textarea.tsx` (shadcn/ui)
- Added `src/proxy.ts` (dev proxy helper)

### Current State

Blank Next.js shell with:
- Clerk auth configured (ClerkProvider in layout, sign-in/sign-up pages wired)
- Drizzle schema for 4 core tables (contacts, deals, tasks, activities) — no migrations run yet
- No dashboard, no API routes, no UI beyond sign-in/sign-up
- `page.tsx` is still the default Next.js placeholder

### Next — Top 3 Priorities (from BACKLOG.md P0s)

1. **Database migrations** — run Drizzle `generate` + `migrate` for the 4 schema tables; add workspace isolation (workspace_id on every table, row-level filtering on every query). BACKLOG: "Write Drizzle ORM migrations for all P0 tables with correct FK constraints and indexes."

2. **Clerk webhook → workspace provisioning** — implement `POST /api/webhooks/clerk` to create a workspace record on `user.created` event; add `workspaces` and `workspace_members` tables to schema. BACKLOG: "Implement Clerk webhook handler to create workspace + owner record on user.created event."

3. **Contact CRUD API** — `POST /api/contacts`, `GET /api/contacts/:id`, `PATCH /api/contacts/:id` with Zod validation; this is the core of the product. BACKLOG: "Build contact CRUD API with Zod validation."
