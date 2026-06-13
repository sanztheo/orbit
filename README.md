# WaitlistKit — Expérience Claude Code en autonomie

## L'expérience

Ce repo est une **expérience en temps réel** : un LLM (Claude Sonnet 4.6) construit un produit SaaS de A à Z, en **totale autonomie**, sans intervention humaine sur le code.

L'objectif est de voir jusqu'où un agent peut aller seul sur un vrai produit web : architecture, base de données, API, UI, tests, sécurité, déploiement.

### Règles
- L'agent choisit seul le produit à construire
- Il prend toutes les décisions techniques
- Il commit à chaque tâche terminée
- Le backlog ne se vide jamais (au moins 3 nouvelles tâches par tâche finie)
- Aucun placeholder, aucun TODO laissé en plan
- `main` est toujours déployable

### Modèle utilisé
**Claude Sonnet 4.6** via Claude Code CLI — avec boucle `/loop` toutes les 15 minutes

---

## Le produit : WaitlistKit

**WaitlistKit** est un outil SaaS pour créer des pages de waitlist virales en 5 minutes.

### Problème résolu
Tout indie hacker qui lance un produit a besoin d'une waitlist. Les solutions existantes sont trop chères ou trop basiques. WaitlistKit donne aux fondateurs un système de parrainage intégré (référal = monte dans la file), des emails automatiques, et des analytics, sans configuration complexe.

### Fonctionnalités MVP
- **Création de waitlist** — nom, slug personnalisé, description
- **Page publique** `/w/[slug]` — formulaire d'inscription, position affichée
- **Système de référral** — lien unique par inscrit, +1 position par parrainage
- **Email de confirmation** — via Resend
- **Dashboard** — liste des inscrits, stats, export CSV
- **Rate limiting** — protection anti-spam sur l'API join

### Stack
- **Framework** : Next.js 16 (App Router)
- **Auth** : Clerk
- **Base de données** : PostgreSQL + Drizzle ORM
- **Email** : Resend
- **UI** : Tailwind CSS + shadcn/ui (base-ui)
- **Tests** : Vitest

### Business model (cible)
| Plan | Prix | Limites |
|------|------|---------|
| Free | $0 | 1 waitlist, 100 inscrits |
| Pro | $19/mo | Illimité, emails, analytics avancés |
| Team | $49/mo | API, webhooks, 5 sièges |

---

## Installation locale

```bash
# Prérequis : Node 20+, PostgreSQL 16+

git clone https://github.com/sanztheo/waitlistkit
cd waitlistkit
npm install

# Configurer les variables d'environnement
cp .env.local.example .env.local
# Remplir : DATABASE_URL, CLERK_*, RESEND_API_KEY

# Créer la DB et appliquer le schéma
createdb waitlistkit
npm run db:push

# Lancer en dev
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

### Variables d'environnement requises

```env
DATABASE_URL=postgresql://user@localhost:5432/waitlistkit
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Structure du projet

```
src/
├── app/
│   ├── (auth)/          # Pages sign-in / sign-up (Clerk)
│   ├── api/
│   │   ├── join/        # POST /api/join — inscription + référral
│   │   └── waitlists/   # CRUD waitlists + export CSV
│   ├── dashboard/       # Interface admin (protégée)
│   └── w/[slug]/        # Page publique de waitlist
├── db/
│   ├── index.ts         # Connexion Drizzle + Pool pg
│   └── schema.ts        # Tables : waitlists, subscribers
└── lib/
    ├── ids.ts           # Génération IDs + codes référral (nanoid)
    ├── rate-limit.ts    # Rate limiter in-memory
    ├── validations.ts   # Schémas Zod partagés
    └── db-queries.ts    # Helpers de requêtes Drizzle
```

---

## Suivre l'expérience

- **BACKLOG.md** — toutes les tâches (jamais vide)
- **PROGRESS.md** — journal de ce qui a été construit session par session

---

*Construit par Claude Sonnet 4.6 · Supervisé par [@sanztheo](https://github.com/sanztheo)*
