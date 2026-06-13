# Orbit — Expérience Claude Code en autonomie totale

## L'expérience

Ce repo est une **expérience en temps réel** : un LLM (Claude Sonnet 4.6) construit un produit SaaS de A à Z, en **totale autonomie**, sans intervention humaine sur le code.

L'agent choisit le produit, fait sa propre recherche marché, prend toutes les décisions d'architecture, code, teste, commite, et pousse — en continu, sans jamais s'arrêter.

### Règles
- L'agent choisit seul et ne demande pas de validation
- Recherche marché réelle (Reddit, HN, Indie Hackers, reviews concurrents) avant tout code
- Commit + push à chaque tâche terminée
- Backlog infini : 3 nouvelles tâches minimum par tâche finie
- `main` toujours déployable

### Modèle
**Claude Sonnet 4.6** via Claude Code CLI

---

## Le produit : Orbit

**Orbit** est l'OS du founder solo.

### Problème
Un founder solo jongle entre Notion, Linear, Airtable, Gmail et un CRM pour gérer ses clients, prospects, investisseurs et features. Résultat : contexte perdu, follow-ups oubliés, deals ratés.

### Solution
Un seul outil qui unifie CRM (clients + prospects + investisseurs), backlog produit, pipeline de deals, et boîte mail — avec une IA qui lit tes emails, catégorise les contacts, priorise les actions, et rédige les réponses.

### Pour qui
Founders solo et petites équipes (1-3 personnes) qui lancent un SaaS.

### Ce qui est techniquement dur
- Sync email bidirectionnelle (OAuth Gmail/Outlook, webhooks)
- Extraction d'entités et de contexte depuis les emails par LLM
- Modèle de données unifié (une personne peut être client + investisseur + utilisateur beta)
- Scoring de priorité IA basé sur le stage, le revenu potentiel, le dernier contact
- Backlog lié aux feedbacks clients (feature requests extraits des emails)

---

## Architecture

```
frontend/   — Next.js 16 (App Router) · UI, auth Clerk, port 3000
backend/    — Hono.js (Node.js) · REST API, Drizzle ORM, port 3001
```

Deux projets indépendants. Le frontend appelle le backend via `fetch` avec un JWT Clerk. Le backend vérifie le token côté serveur et isole les données par `userId`.

```bash
# backend
cd backend && npm install && npm run dev

# frontend (autre terminal)
cd frontend && npm install && npm run dev
```

---

## Suivre l'expérience

- **PRODUCT.md** — vision, stack, positionnement
- **RESEARCH.md** — notebook de recherche marché avec sources
- **BACKLOG.md** — toutes les tâches (jamais vide)
- **PROGRESS.md** — journal de build session par session

---

*Construit par Claude Sonnet 4.6 · Supervisé par [@sanztheo](https://github.com/sanztheo)*
