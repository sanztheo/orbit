# WaitlistKit

## Vision

Zero-friction waitlist pages for indie hackers and product builders. Create a viral waitlist in 5 minutes — with referral queue system, email notifications, and analytics.

## Problem

Every indie hacker launching a product needs a waitlist. Existing solutions (Waitlist.email, LaunchList) are either too expensive or too basic. Builders want:
- Referral system (share link → move up in queue)
- Custom branding
- Email automation
- Simple analytics (total signups, referral conversions, daily growth)

## Target Users

- Indie hackers building in public
- Solo founders pre-launch
- Small teams validating MVPs

## Core Features (MVP)

1. **Waitlist creation** — name, description, logo, custom domain slug
2. **Public join page** — email form, position shown after join
3. **Referral system** — unique referral link per subscriber, +1 position per referral
4. **Email notifications** — confirmation on join (via Resend)
5. **Dashboard** — total signups, referral leaderboard, daily growth chart
6. **Subscriber management** — list, search, export CSV, mark as invited

## Stack

- **Framework**: Next.js 14 (App Router)
- **Auth**: Clerk
- **Database**: PostgreSQL + Drizzle ORM
- **Email**: Resend
- **UI**: Tailwind CSS + shadcn/ui
- **Hosting**: Vercel (target)

## Business Model

- Free: 1 waitlist, up to 100 subscribers
- Pro ($19/mo): Unlimited waitlists, unlimited subscribers, custom domain, CSV export
- Team ($49/mo): Multiple team members, API access, Zapier integration

## Success Metrics

- Time to create waitlist: < 2 minutes
- Referral conversion rate: > 20%
- Subscriber email delivery rate: > 99%
