# AGENTS.md

Instructions pour les agents de code (et les humains) qui travaillent sur ce dépôt.

## Projet

API de suivi des interventions de maintenance sur des sites de méthanisation : créer, passer en cours, clôturer, corriger la durée, lister par site (filtres statut et période), exporter en CSV.

**Sources de vérité, à lire avant toute modification :**
- [`docs/besoin_metier.md`](docs/besoin_metier.md) : règles de gestion (**RG-1 à RG-7**) et hypothèses retenues (**H1 à H13**). Il fait foi sur le comportement attendu.
- [`docs/doc_technique.md`](docs/doc_technique.md) : choix techniques, API, modèle de données, stratégie de tests.

Si une demande contredit ces documents ou en sort, signale-le avant de coder. Ne tranche pas seul une règle métier.

## Stack technique

| Sujet | Outil |
|---|---|
| Runtime | Node.js 24, TypeScript |
| HTTP | Express 5 |
| Base de données | SQLite via `better-sqlite3` |
| ORM et migrations | Drizzle ORM, `drizzle-kit` |
| Machine à états | XState v5, utilisé en transitions pures, sans acteur |
| Autorisations | CASL (`@casl/ability`) |
| Validation des entrées | Zod |
| Dates et fuseau | Luxon (`Europe/Paris`) |
| Export CSV | `csv-stringify` |
| Tests | Vitest + supertest, tests d'intégration uniquement |
| Paquets | npm |

N'ajoute pas de dépendance sans le justifier dans ta réponse. Si elle change un choix de ce tableau, mets aussi à jour `docs/doc_technique.md`.

## Commandes

```bash
npm install          # installer les dépendances
npm run dev          # lancer l'API en développement
npm test             # lancer les tests d'intégration
npm run typecheck    # vérifier les types
npm run db:generate  # générer une migration depuis le schéma Drizzle
npm run db:migrate   # appliquer les migrations
npm run db:seed      # charger le référentiel de démonstration
```

## Architecture cible : DDD

Deux contextes :
- **Maintenance** (cœur) : les interventions, leur cycle de vie et leurs règles.
- **Référentiel** (support, lecture seule) : sites, équipements, utilisateurs, rattachements aux sites (H12).

```
src/
  domaine/          agrégat Intervention, objets-valeurs, machine à états, erreurs métier, interfaces des dépôts
    maintenance/
    referentiel/
    commun/         DateHeureParis, Periode
  application/      cas d'usage (un fichier par cas) + droits CASL (droits.ts)
  infrastructure/   schéma Drizzle, implémentation des dépôts, seed, génération CSV
  interface/http/   app Express, routes, schémas Zod, identification, erreurs → HTTP
  server.ts
drizzle/            migrations générées (ne pas éditer à la main)
tests/integration/
```

### Règles de dépendance (non négociables)

- **`domaine/` n'importe ni Express, ni Drizzle, ni Zod, ni CASL**, ni rien de `application/`, `infrastructure/` ou `interface/`. Seuls XState et Luxon y sont permis.
- `application/` dépend du domaine. Elle n'importe ni Express, ni Drizzle.
- `infrastructure/` implémente les interfaces de dépôts déclarées dans le domaine.
- `interface/http/` appelle uniquement des cas d'usage de `application/`. Pas de logique métier, pas d'accès direct à la base.

### Où va quelle règle

| Règle | Emplacement |
|---|---|
| Cycle de vie, transitions (H2), clôture avec durée (RG-3), close non modifiable (RG-4) | Agrégat `Intervention` et `intervention.machine.ts` |
| Qui peut faire quoi, sur quel site (RG-2), correction de durée réservée au responsable (RG-5) | `application/droits.ts` (CASL), vérifié dans chaque cas d'usage |
| Saisie et affichage en heure de Paris, bornes de période (RG-6, H8) | Objets-valeurs `DateHeureParis` et `Periode` |
| Format d'entrée des requêtes | Schémas Zod dans `interface/http/` |
| Équipement du même site (H13), close ⇒ durée (RG-3) | Domaine **et** contraintes SQL, en dernier recours |

## Conventions

- **Vocabulaire métier en français**, sans traduction : `intervention`, `technicien`, `site`, `equipement`, `statut`, `dureeMinutes`, `dateDebut`, `demarrer`, `cloturer`, `corrigerDuree`. Les termes techniques (`router`, `middleware`…) restent en anglais.
- **Le statut ne change que par la machine à états**, via les méthodes de l'agrégat. Jamais d'affectation directe de `statut`, jamais de route qui modifie `statut` directement : les transitions sont des actions (`POST /interventions/:id/demarrer`, `/cloturer`).
- **La correction de durée (RG-5) n'est pas une transition** : l'intervention reste `CLOSE`.
- **Dates** :
  - en base : ISO 8601 UTC, à largeur fixe (`2026-03-29T08:30:00Z`) ;
  - en entrée de l'API : heure locale de Paris sans décalage (`2026-03-29T10:30`) ;
  - en sortie : ISO avec le décalage de Paris (`2026-03-29T10:30:00+02:00`) ;
  - au changement d'heure : une heure inexistante est refusée, une heure ambiguë est interprétée comme sa première occurrence ;
  - jamais de `new Date()` sur une chaîne sans fuseau ; jamais de fuseau implicite (celui de la machine).
- **Durée** : toujours en minutes, entier strictement positif. L'unité figure dans le nom (`dureeMinutes`, `duree_minutes`).
- **Données lisibles par le métier** : statuts et rôles stockés en clair. Codes et matricules lisibles dans l'export, jamais d'ID technique.
- **Erreurs** : chaque refus métier est une erreur typée du domaine, avec un `code` stable (`DUREE_REQUISE`, `TRANSITION_INTERDITE`…). La correspondance avec les codes HTTP est faite dans `interface/http/erreurs.ts` uniquement. Format de réponse : `{ "code": "...", "message": "..." }`.
- **Schéma de base** : toute modification passe par `schema.ts`, puis `npm run db:generate`. Ne modifie jamais une migration existante.

## Tests

- **Uniquement des tests d'intégration**, dans `tests/integration/`. Pas de tests unitaires.
- Les tests passent par l'API HTTP réelle (supertest sur `app.ts`) et une vraie base SQLite en mémoire, neuve pour chaque test, avec les migrations appliquées.
- **Aucun mock** du domaine, des dépôts ou de la base.
- Chaque test vérifie le code HTTP, le `code` d'erreur métier le cas échéant, et l'état persisté, relu via l'API.
- Le nom de chaque test cite la règle couverte : `RG-3 : refuse la clôture d'une intervention sans durée`.
- Toute règle métier ajoutée ou modifiée s'accompagne de tests, cas nominal et cas de refus.
- Pour toute date, teste l'heure d'hiver et l'heure d'été.

## Avant de déclarer une tâche terminée

1. `npm run typecheck` passe.
2. `npm test` passe en entier. Si un test échoue, dis-le, avec la sortie. Ne le désactive pas et ne l'affaiblis pas pour le faire passer.
3. Si le comportement ou un choix technique a changé, `docs/` est à jour.

## Interdits

- Ajouter une fonctionnalité qui n'est pas dans `docs/besoin_metier.md`. Propose-la plutôt.
- Modifier le `statut` hors de la machine à états.
- Manipuler une date sans fuseau explicite.
- Mettre de la logique métier dans les routes ou les dépôts.
- Ajouter une dépendance sans justification.
- Présenter l'identification par en-tête `X-Utilisateur-Id` comme sécurisée : c'est un mécanisme provisoire, l'authentification est hors périmètre.
