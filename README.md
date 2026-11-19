# Suivi des interventions de maintenance

API de suivi des interventions de maintenance sur les sites de méthanisation. Elle permet de créer une intervention, la passer en cours, la clôturer, corriger sa durée après clôture, lister les interventions d'un site avec des filtres et les exporter en CSV pour le contrôle de gestion.

Documentation :
- [`docs/besoin_metier.md`](docs/besoin_metier.md) : règles de gestion (RG-1 à RG-7) et hypothèses retenues (H1 à H13).
- [`docs/doc_technique.md`](docs/doc_technique.md) : architecture, API, modèle de données, stratégie de tests.
- [`AGENTS.md`](AGENTS.md) et [`CLAUDE.md`](CLAUDE.md) : règles des agents de code. `CLAUDE.md` importe `AGENTS.md` et ajoute la méthode de travail suivie avec Claude Code.

## Lancer le projet

Prérequis : Node.js 24 et npm.

```bash
npm install
npm run db:seed    # crée donnees/interventions.db, applique les migrations, charge le référentiel de démo
npm start          # API et page de démo sur http://localhost:3000
npm test           # tests d'intégration
npm run typecheck
```

Pour changer le port ou la base, utiliser les variables d'environnement `PORT` et `FICHIER_BASE`.

**Page de démo** : http://localhost:3000/. Elle permet de choisir l'utilisateur, de lister, filtrer, créer, démarrer, clôturer, corriger et exporter, et elle affiche les refus de l'API.

### Utilisateurs de démonstration

L'utilisateur est identifié par l'en-tête `X-Utilisateur-Id`. Ce mécanisme est provisoire et **non sécurisé** : l'authentification est hors périmètre.

| Id | Matricule | Rôle | Sites |
|---|---|---|---|
| 1 | T001 | Technicien | METHA-BEAUCE (id 1), équipements 1 et 2 |
| 2 | T002 | Technicien | METHA-PICARDIE (id 2), équipement 3 |
| 3 | R001 | Responsable d'exploitation | Tous |

### API

| Route | Rôle |
|---|---|
| `POST /interventions` | Créer (statut `OUVERTE`) |
| `PATCH /interventions/:id` | Modifier la date de début, la durée ou la description, tant que l'intervention n'est pas close |
| `POST /interventions/:id/demarrer` | `OUVERTE` → `EN_COURS` |
| `POST /interventions/:id/cloturer` | `EN_COURS` → `CLOSE`, si la durée est renseignée |
| `POST /interventions/:id/corriger-duree` | Corriger la durée d'une intervention close (responsable uniquement) |
| `GET /sites/:siteId/interventions?statut=&du=&au=` | Lister |
| `GET /sites/:siteId/interventions/export.csv?du=&au=` | Exporter en CSV |

Formats :
- dates saisies en heure de Paris, sans décalage (`2026-03-29T10:30`), et restituées avec le décalage de Paris (`2026-03-29T10:30:00+02:00`) ;
- périodes au format `AAAA-MM-JJ`, bornes incluses ;
- durées en minutes.

Les erreurs ont le format `{ "code": "DUREE_REQUISE", "message": "…" }`.

```bash
curl -X POST localhost:3000/interventions -H 'X-Utilisateur-Id: 1' -H 'Content-Type: application/json' \
  -d '{"siteId":1,"equipementId":1,"dateDebut":"2026-03-15T09:00","description":"Remplacement du joint"}'
```

## Choix techniques

| Sujet | Choix | Pourquoi |
|---|---|---|
| Stack | TypeScript, Express 5, Node 24 | API simple, entités et règles typées |
| Architecture | DDD : domaine, application, infrastructure, interface | Les règles métier vivent dans le domaine (agrégat `Intervention`), pas dans les routes |
| Persistance | SQLite (`better-sqlite3`) et Drizzle ORM | Suffisant pour le besoin. ORM léger et typé, avec migrations SQL lisibles |
| Cycle de vie | XState v5, en transitions pures | Gardes (RG-3) et état final (RG-4) natifs, plutôt qu'une machine maison |
| Droits | CASL | Rôles et conditions « sur ses sites » (RG-2) dans un seul fichier, `application/droits.ts` |
| Dates | Luxon | Gestion explicite d'`Europe/Paris` et des changements d'heure |
| Validation, CSV | Zod, `csv-stringify` | Contrôle de forme à l'entrée, échappement CSV fiable |
| Tests | Vitest et supertest, **intégration uniquement** | On vérifie le comportement réel par l'API, sur une vraie base SQLite en mémoire, sans mock |

Principes de données (détail dans la doc technique, §8) :
- **Noms et valeurs lisibles par le métier** : tables `intervention` et `rattachement_site`, statuts en clair, unité dans le nom (`duree_minutes`).
- **Dates en ISO UTC en base**, converties en heure de Paris aux frontières de l'API (RG-6).
- **Règles critiques doublées en base** : contrainte « close ⇒ durée renseignée », clé étrangère composite qui garantit que l'équipement appartient au site de l'intervention.

## Hypothèses

Le besoin initial laissait plusieurs points ouverts. Les hypothèses retenues sont détaillées dans [`docs/besoin_metier.md`](docs/besoin_metier.md) §8 :
- **Durée** en minutes entières (H7).
- **Cycle strict** `OUVERTE → EN_COURS → CLOSE`, sans saut ni retour (H2).
- **RG-4 et RG-5** : sur une intervention close, seule la durée peut être corrigée, et seulement par le responsable (H1).
- **Création** : un technicien crée ses interventions pour lui-même ; le responsable affecte un technicien rattaché au site (H4, H5).
- **Visibilité** : un technicien voit toutes les interventions de ses sites (H6).
- **Période** : elle porte sur la date de début, en jours entiers à l'heure de Paris, bornes incluses (H8).
- **Changement d'heure** : une heure inexistante est refusée, une heure ambiguë est interprétée comme sa première occurrence.
- **CSV** pour Excel en français (H9) : séparateur `;`, UTF-8 avec BOM, dates au format `JJ/MM/AAAA HH:MM` à l'heure de Paris, formules neutralisées.
- **Référentiel** : sites, équipements et utilisateurs sont pré-chargés, sans gestion dans le module (H12).

## Avec une journée de plus

- **Traçabilité** des corrections de durée après clôture (H11) : qui, quand, ancienne et nouvelle valeur.
- **Authentification réelle** (OIDC ou JWT du SSO de l'entreprise) à la place de l'en-tête `X-Utilisateur-Id`.
- **Exposition du référentiel** : routes de lecture des sites, équipements et techniciens, que la page de démo écrit aujourd'hui en dur.
- **Documentation OpenAPI** générée depuis les schémas Zod, et pagination de la liste.
- **Industrialisation** : Dockerfile, intégration continue (typecheck et tests), lint.
- **Cadrage métier** des hypothèses H1 à H13 avec le responsable d'exploitation.
