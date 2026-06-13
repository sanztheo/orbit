# BACKLOG — WaitlistKit

Format: `[priority] [status] Task`
Priority: P0 (critical), P1 (high), P2 (medium), P3 (low)
Status: TODO, IN_PROGRESS, DONE

---

## Infrastructure & Setup

- [P0] [DONE] Init Next.js 14 project with TypeScript + Tailwind
- [P0] [TODO] Install and configure Drizzle ORM with PostgreSQL
- [P0] [TODO] Set up Clerk authentication (login/register pages)
- [P0] [TODO] Configure shadcn/ui component library
- [P0] [TODO] Set up Resend email client
- [P0] [TODO] Define database schema (users, waitlists, subscribers)
- [P0] [TODO] Run initial DB migration

## Core Features

- [P0] [TODO] Dashboard layout (sidebar + header with user menu)
- [P0] [TODO] Create waitlist form (name, slug, description)
- [P0] [TODO] Public waitlist join page (/w/[slug])
- [P0] [TODO] Email subscription with duplicate check
- [P0] [TODO] Generate unique referral code per subscriber
- [P0] [TODO] Show queue position after joining
- [P0] [TODO] Referral tracking (update position when referrals join)
- [P1] [TODO] Confirmation email on join (via Resend)
- [P1] [TODO] Subscriber list view in dashboard (table, search, pagination)
- [P1] [TODO] Waitlist analytics page (total, daily growth, referral stats)
- [P1] [TODO] Delete/archive waitlist
- [P1] [TODO] Edit waitlist settings

## Data & Export

- [P1] [TODO] CSV export of subscribers
- [P1] [TODO] Mark subscriber as "invited" (status change)
- [P2] [TODO] Bulk invite (send invite emails to top N subscribers)

## Polish & UX

- [P1] [TODO] Landing page (homepage for non-logged users)
- [P1] [TODO] Mobile-responsive public join page
- [P2] [TODO] Custom OG image per waitlist for social sharing
- [P2] [TODO] Copy referral link button with toast notification
- [P2] [TODO] Animated counter on public page (X people waiting)
- [P2] [TODO] Empty state illustrations for dashboard
- [P3] [TODO] Dark mode support

## Testing

- [P1] [TODO] Unit tests for referral position calculation logic
- [P1] [TODO] Integration test: join waitlist flow (email + referral code)
- [P2] [TODO] E2E test: create waitlist → join → check position
- [P2] [TODO] Test duplicate email handling
- [P2] [TODO] Test referral chain (A refers B refers C, check positions)

## Security

- [P1] [TODO] Rate limiting on /api/join (10 req/min per IP)
- [P1] [TODO] Input validation (Zod schemas on all API routes)
- [P2] [TODO] CSRF protection audit
- [P2] [TODO] SQL injection audit (Drizzle parameterized queries check)

## Performance

- [P2] [TODO] Add database indexes on (waitlist_id, email) and referral_code
- [P2] [TODO] Cache waitlist public page (ISR or edge caching)
- [P3] [TODO] Optimize subscriber list query with cursor pagination

## Documentation

- [P2] [TODO] API reference for /api/join endpoint
- [P3] [TODO] Embed widget documentation (iframe embed code)

---

## New Tasks Added

- [P1] [TODO] Implement confirmation email on join (Resend integration)
- [P1] [TODO] Add invite email blast (send to top N subscribers)
- [P2] [TODO] Add waitlist [id] detail page tabs (Overview vs Subscribers)
- [P2] [TODO] Add daily growth chart to analytics (recharts or chart.js)
- [P2] [TODO] Add referral leaderboard on dashboard
- [P2] [TODO] Add custom OG meta tags per waitlist page (/w/[slug])
- [P2] [TODO] Add waitlist embed widget (iframe snippet generator)
- [P2] [TODO] Persist rate limit state to Redis (upgrade from in-memory)
- [P3] [TODO] Add Stripe billing integration (free/pro/team tiers)
- [P3] [TODO] Add custom domain support for waitlist pages
- [P3] [TODO] Add Zapier webhook trigger on new subscriber
- [P3] [TODO] E2E tests with Playwright (join flow, dashboard flow)
- [P3] [TODO] Add dark mode toggle
- [P3] [TODO] Add subscriber search and filter on detail page

Last updated: 2026-06-13
