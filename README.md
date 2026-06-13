# Orbit — The OS for Solo Founders

> **Live experiment:** an LLM (Claude Sonnet 4.6) builds this SaaS end-to-end — product research, architecture, code, tests, commits, and deploys — with no human intervention on the codebase.

---

## The Product

**Orbit** replaces the Notion CRM + Folk + Linear patchwork with one tool that keeps customer deals, investor pipeline, and product backlog in sync — plus an AI that drafts the follow-ups you keep forgetting.

### Problem

Solo founders juggle Notion, Linear, spreadsheets, Gmail, and a CRM to manage customers, prospects, investors, and features. Context gets lost, follow-ups slip, deals stall.

### Solution

One workspace that unifies:

- **Contacts** — customers, leads, investors, partners (one record, role tags)
- **Deal pipelines** — Sales, Fundraising, Partnerships (Kanban + stall detection)
- **Product backlog** — tasks linked to the contact who requested them
- **AI assistant** — contextual follow-up drafts from contact history
- **Activity log** — emails, calls, notes, pasted DMs (LinkedIn, WhatsApp, etc.)

### Built for

Solo founders and tiny teams (1–3 people) building a SaaS — pre-Series A, time-poor, technically capable but allergic to manual CRM upkeep.

---

## Architecture

```
frontend/   — Next.js 16 (App Router) · Clerk auth · port 3000
backend/    — Hono.js (Node.js) · REST API · Drizzle ORM · port 3001
```

Two independent apps. The frontend calls the backend via `fetch` with a Clerk JWT. The backend verifies the token server-side and scopes all data by workspace.

| Layer | Stack |
|---|---|
| Frontend | Next.js 16, Tailwind, shadcn/ui, Clerk |
| Backend | Hono.js, Zod validation, Drizzle ORM |
| Database | PostgreSQL |
| Auth | Clerk (JWT on every API request) |
| AI | Claude API (follow-up drafts, meeting briefs) |

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL database
- [Clerk](https://clerk.com) app (Google OAuth recommended)
- [Anthropic API key](https://console.anthropic.com) (for AI features)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # or create .env manually
npm run db:push        # push schema to PostgreSQL
npm run dev            # http://localhost:3001
```

**Backend `.env`:**

```
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_...
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # or create .env.local manually
npm run dev                        # http://localhost:3000
```

**Frontend `.env.local`:**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Experiment Rules

- The agent picks the product and never asks for validation
- Real market research (Reddit, HN, Indie Hackers, competitor reviews) before writing code
- Commit + push after every completed task
- Infinite backlog: minimum 3 new tasks per task finished
- `main` always deployable

**Model:** Claude Sonnet 4.6 via Claude Code CLI

---

## Docs

| File | Contents |
|---|---|
| [PRODUCT.md](./PRODUCT.md) | Vision, ICP, competitor matrix, pricing, stack |
| [RESEARCH.md](./RESEARCH.md) | Market research notebook with sources |
| [BACKLOG.md](./BACKLOG.md) | Prioritized task backlog (never empty) |
| [PROGRESS.md](./PROGRESS.md) | Build journal, session by session |

---

## License

Private experiment. All rights reserved.

*Built by Claude Sonnet 4.6 · Supervised by [@sanztheo](https://github.com/sanztheo)*

---

# Orbit — Expérience Claude Code en autonomie totale

> **Expérience en temps réel :** un LLM (Claude Sonnet 4.6) construit ce SaaS de A à Z — recherche marché, architecture, code, tests, commits, déploiement — sans intervention humaine sur le code.

---

## Le produit

**Orbit** remplace le patchwork Notion CRM + Folk + Linear par un seul outil qui synchronise deals clients, pipeline investisseurs et backlog produit — avec une IA qui rédige les relances oubliées.

### Problème

Un founder solo jongle entre Notion, Linear, Airtable, Gmail et un CRM. Résultat : contexte perdu, follow-ups oubliés, deals ratés.

### Solution

Un workspace unifié : contacts (clients, leads, investisseurs), pipelines de deals (Sales / Fundraising / Partnerships), backlog produit lié aux contacts, assistant IA pour les relances, journal d'activité (emails, appels, DMs collés).

### Pour qui

Founders solo et petites équipes (1–3 personnes) qui lancent un SaaS.

---

## Architecture

```
frontend/   — Next.js 16 (App Router) · auth Clerk · port 3000
backend/    — Hono.js (Node.js) · REST API, Drizzle ORM · port 3001
```

Deux projets indépendants. Le frontend appelle le backend via `fetch` avec un JWT Clerk. Le backend vérifie le token côté serveur et isole les données par workspace.

---

## Développement local

```bash
# backend
cd backend && npm install && npm run db:push && npm run dev

# frontend (autre terminal)
cd frontend && npm install && npm run dev
```

Variables d'environnement : voir les sections ci-dessus (DATABASE_URL, CLERK_*, ANTHROPIC_API_KEY, NEXT_PUBLIC_API_URL).

---

## Règles de l'expérience

- L'agent choisit seul et ne demande pas de validation
- Recherche marché réelle avant tout code
- Commit + push à chaque tâche terminée
- Backlog infini : 3 nouvelles tâches minimum par tâche finie
- `main` toujours déployable

**Modèle :** Claude Sonnet 4.6 via Claude Code CLI

---

## Suivre l'expérience

- **PRODUCT.md** — vision, stack, positionnement
- **RESEARCH.md** — notebook de recherche marché avec sources
- **BACKLOG.md** — toutes les tâches (jamais vide)
- **PROGRESS.md** — journal de build session par session

*Construit par Claude Sonnet 4.6 · Supervisé par [@sanztheo](https://github.com/sanztheo)*
