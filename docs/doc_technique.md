# Suivi des interventions de maintenance : analyse technique

> Document de travail, à faire évoluer avec le projet. Il s'appuie sur [`besoin_metier.md`](./besoin_metier.md) : les références **RG-x** (règles de gestion) et **Hx** (hypothèses retenues) renvoient à ce document.
> Périmètre : uniquement ce que demande le besoin initial. Tout le reste est listé en §11.

## 1. Synthèse des choix

| Sujet | Choix | Alternatives écartées |
|---|---|---|
| Runtime | Node.js 24 (installé : v24.19) | — |
| Langage | TypeScript | JavaScript : pas de typage des entités ni des règles |
| Architecture | **DDD** : domaine, application, infrastructure, interface (§3) | Découpage par couches techniques seules : les règles métier se dispersent dans les routes |
| Framework HTTP | **Express 5** | Fastify : pas de raison forte de dévier de la demande |
| Base de données | **SQLite** via `better-sqlite3` | PostgreSQL : surdimensionné ici. `node:sqlite` : moins éprouvé |
| ORM | **Drizzle ORM** + `drizzle-kit` (migrations) | Prisma : plus lourd. TypeORM / Sequelize : verbeux. Kysely : simple query builder, sans schéma |
| Machine à états | **XState v5**, utilisé en mode « transitions pures » | robot3, typescript-fsm, javascript-state-machine (voir §4) |
| Autorisations | **CASL** (`@casl/ability`) | Casbin : trop lourd. accesscontrol : plus maintenu. Middleware maison : réinvente la roue (voir §5) |
| Validation des entrées | **Zod** | — |
| Dates et fuseau | **Luxon** | date-fns + @date-fns/tz : utilisable, moins explicite sur les cas de changement d'heure |
| Export CSV | **csv-stringify** (projet `csv`) | Concaténation manuelle : échappement risqué |
| Tests | **Tests d'intégration uniquement** : Vitest + supertest sur l'API, avec une vraie base SQLite (§9) | Tests unitaires : on veut vérifier le comportement réel de bout en bout |
| Gestionnaire de paquets | npm | — |

## 2. Livrables et correspondance

| Livrable attendu (`besoin_initial`) | Réponse |
|---|---|
| API : créer, passer en cours, clôturer, lister par site avec filtres, exporter en CSV | API REST Express (§7) |
| Tests automatisés, au minimum sur RG-2, RG-3, RG-4/5 et RG-6 | Tests d'intégration HTTP (§9) |
| Fichier de règles de l'agent | `AGENTS.md` à la racine (§10) |
| README court | `README.md` : lancement, choix techniques (résumé de ce document), hypothèses (renvoi à `besoin_metier.md`), « une journée de plus » (§11) |
| Interface (facultative) | Pas d'interface. Une collection de requêtes (`.http`) pourra servir à la démo |

## 3. Architecture (DDD)

### 3.1 Contextes

- **Maintenance** (cœur du sujet) : les interventions, leur cycle de vie et leurs règles.
- **Référentiel** (support, lecture seule) : sites, équipements, utilisateurs et rattachements aux sites. Ces données sont pré-chargées et ne sont pas gérées par le module (H12).

### 3.2 Couches et dépendances

```
interface (HTTP Express)   routes, validation Zod, identification, erreurs → codes HTTP, présentation JSON et CSV
      │
application                cas d'usage : créer, démarrer, clôturer, modifier, corriger la durée, lister, exporter
      │                    contrôle des droits (CASL), puis appel du domaine, puis persistance via les dépôts
      │
domaine                    agrégat Intervention, objets-valeurs, machine à états, erreurs métier,
      ▲                    interfaces des dépôts
      │
infrastructure             schéma Drizzle, implémentation des dépôts, migrations, données initiales
```

Règles de dépendance :
- **Le domaine ne dépend de rien d'autre** : ni Express, ni Drizzle, ni Zod. Seules les bibliothèques de modélisation sont permises : XState pour le cycle de vie et Luxon pour les dates.
- L'application dépend du domaine.
- L'infrastructure **implémente** les interfaces de dépôts définies dans le domaine.
- L'interface HTTP appelle uniquement la couche application.

### 3.3 Modèle du domaine

- **Agrégat `Intervention`** (racine). Il porte les invariants (RG-3, RG-4, H2, H13) et expose des méthodes métier : `demarrer()`, `cloturer()`, `modifier(...)`, `corrigerDuree(...)`. Son statut ne change que par la machine à états (§4).
- **Objets-valeurs** :
  - durée en minutes, entier strictement positif (H7), contrôlée par l'agrégat ;
  - `DateHeureParis` : saisie et restitution en heure de Paris, stockage en UTC (RG-6) ;
  - `Periode` : jours entiers en heure de Paris, bornes incluses (H8) ;
  - `Statut`.
- **Entités du référentiel** : `Site`, `Equipement`, `Utilisateur` (avec son rôle et ses sites).
- **Dépôts** (interfaces) : `DepotInterventions` et `DepotReferentiel`.
- **Erreurs métier** typées, avec un code stable (§7.2).

### 3.4 Arborescence

```
src/
  domaine/
    commun/
      erreurs.ts                 erreurs métier typées (code stable)
      date-heure-paris.ts        objet-valeur DateHeureParis (RG-6)
    maintenance/
      intervention.ts            agrégat (invariants, durée, description)
      intervention.machine.ts    statuts et machine à états XState
      depot-interventions.ts     interface du dépôt
    referentiel/
      referentiel.ts             Site, Equipement, Utilisateur, interface du dépôt
  application/
    droits.ts                    règles CASL par rôle
    interventions/               un fichier par cas d'usage
  infrastructure/
    persistance/
      schema.ts                  schéma Drizzle
      client.ts                  ouverture de la base et migrations
      depot-interventions.drizzle.ts
      depot-referentiel.drizzle.ts
      referentiel-demo.ts        référentiel de démonstration (seed et tests)
  interface/
    http/
      app.ts                     assemblage de l'app Express (sans écoute réseau, pour supertest)
      identification.ts          identification de l'utilisateur (§5.3)
      erreurs.ts                 erreurs métier → codes HTTP
  config.ts
  server.ts                      point d'entrée : écoute du port
scripts/                         migrer, charger le référentiel
drizzle/                         migrations SQL générées
tests/
  integration/
```

Les fichiers propres à un endpoint (cas d'usage, routes, schémas Zod, objet-valeur `Periode`, export CSV) sont ajoutés avec l'endpoint concerné.

**Langue du code** : les termes métier restent en français partout (`intervention`, `technicien`, `cloturer`, `dureeMinutes`, `statut`…). C'est le langage partagé avec le métier, et il ne doit pas être traduit. Les termes purement techniques (`router`, `middleware`…) restent dans leur forme usuelle.

## 4. Machine à états

### 4.1 Comparatif

| Bibliothèque | Points forts | Points faibles |
|---|---|---|
| **XState v5** | Standard de fait, très maintenu, bien typé. Gardes natives (utiles pour RG-3), états finaux (RG-4). La machine se visualise (Stately), ce qui en fait un support de discussion avec le métier | API riche, on n'en utilise qu'une petite partie. Taille de la dépendance |
| robot3 | Très léger, API fonctionnelle, gardes | Communauté plus réduite, typage TypeScript moins abouti |
| typescript-fsm | Minimaliste, typé | Pas de gardes au sens propre, peu d'adoption |
| javascript-state-machine | Historique | Plus maintenu depuis plusieurs années |

**Choix : XState v5.** Pour trois états, c'est plus qu'il n'en faut. Mais la bibliothèque est la plus pérenne, et ses gardes et états finaux traduisent directement RG-3 et RG-4. Aucun acteur (interpréteur long) n'est utilisé : la machine sert de **fonction de transition pure**, appelée par l'agrégat `Intervention`.

### 4.2 Modèle

```
  OUVERTE ──DEMARRER──▶ EN_COURS ──CLOTURER [dureeRenseignee]──▶ CLOSE (final)
```

- Le contexte de la machine contient `dureeMinutes`. La garde `dureeRenseignee` porte RG-3.
- `CLOSE` est déclaré `type: 'final'` : aucun événement n'en sort (RG-4).
- Toute transition non déclarée est refusée : pas de saut ni de retour (H2).
- **La correction de durée (RG-5) n'est pas une transition** : l'intervention reste `CLOSE`. C'est une méthode dédiée de l'agrégat, qui ne passe pas par la machine.

### 4.3 Utilisation

1. L'agrégat reconstitue l'état de la machine à partir du `statut` persisté (`machine.resolveState({ value: statut, context })`).
2. Il applique l'événement avec l'API de transition pure de XState v5 (`transition` ou `getNextSnapshot` selon la version installée).
3. Il distingue deux cas de refus :
   - **événement non prévu dans l'état courant** → erreur `TRANSITION_INTERDITE` (HTTP 409) ;
   - **garde refusée** → erreur `DUREE_REQUISE` (HTTP 422).
4. Il met à jour son statut. Le cas d'usage le persiste ensuite via le dépôt.

La base porte aussi la règle « close ⇒ durée renseignée » en dernier recours, par une contrainte `CHECK` (§8).

## 5. Rôles et autorisations

### 5.1 Comparatif

| Solution | Adéquation |
|---|---|
| **CASL** | Gère les rôles **et** les conditions sur les attributs (« sur ses sites ») **et** les droits par champ (« seulement la durée »). Il couvre RG-2 et RG-5 sans code ad hoc. Maintenu, bien typé |
| Casbin | Très puissant (RBAC/ABAC par fichiers de politique), mais lourd à configurer pour deux rôles |
| accesscontrol | RBAC avec attributs, mais plus maintenu |
| Middleware maison par rôle | Suffit pour filtrer les routes, mais pas pour « ses sites » ni pour le droit par champ : on finit par réécrire CASL |

**Choix : CASL.** Les droits sont définis dans la couche application (`application/droits.ts`) et vérifiés par chaque cas d'usage, une fois le site ou l'intervention chargé (`can('cloturer', intervention)`, par exemple).

### 5.2 Règles

| Rôle | Droits |
|---|---|
| `TECHNICIEN` | `lire` Site et Intervention si `siteId ∈ sesSites` (RG-2, H6) · `creer` Intervention si `siteId ∈ sesSites` **et** `technicienId = lui-même` (RG-2, H4) · `modifier` (description, date de début, durée), `demarrer`, `cloturer` une intervention de ses sites · `exporter` sur ses sites (H10) |
| `RESPONSABLE_EXPLOITATION` | Tous les droits ci-dessus sur **tous** les sites (RG-2, H5), avec affectation de n'importe quel technicien rattaché au site lors de la création (H4) · `corrigerDuree` (RG-5) |

Répartition des responsabilités :
- **CASL** répond à « qui a le droit de faire quoi, sur quel site » (RG-2, RG-5).
- **Le domaine** répond à « est-ce possible dans l'état actuel » (RG-3, RG-4, H2).

Une modification d'intervention close est donc refusée par le domaine (409), quel que soit le rôle. La correction de durée est autorisée par CASL au seul responsable, puis acceptée par le domaine uniquement sur une intervention close.

### 5.3 Identification de l'utilisateur

L'authentification ne fait pas partie du besoin. Il faut pourtant savoir qui appelle pour appliquer RG-2 et RG-5. Le mécanisme retenu est le plus simple possible : un middleware lit l'en-tête `X-Utilisateur-Id`, charge l'utilisateur, son rôle et ses sites depuis le référentiel, et rejette la requête (401) si l'en-tête est absent ou inconnu. Il est isolé dans `interface/http/identification.ts` pour être remplacé sans toucher au reste. Il est **non sécurisé**, et le README le dit explicitement.

## 6. Cas d'usage

| Cas d'usage | Qui | Règles | Erreurs métier |
|---|---|---|---|
| Créer une intervention (statut `OUVERTE`) | Technicien (ses sites, pour lui-même), responsable | RG-1, RG-2, RG-6, H4, H13 | `ACCES_SITE_REFUSE`, `EQUIPEMENT_HORS_SITE`, `TECHNICIEN_NON_RATTACHE`, `DATE_INVALIDE` |
| Modifier une intervention non close (description, date de début, durée) | Accès au site | RG-4, H3 | `INTERVENTION_CLOSE` |
| Passer en cours | Accès au site | H2 | `TRANSITION_INTERDITE` |
| Clôturer | Accès au site | RG-3, H2 | `DUREE_REQUISE`, `TRANSITION_INTERDITE` |
| Corriger la durée d'une intervention close | Responsable | RG-5, H1 | `INTERVENTION_NON_CLOSE` |
| Lister les interventions d'un site (filtres statut et période) | Accès au site | RG-2, RG-6, H8 | `ACCES_SITE_REFUSE`, `PERIODE_INVALIDE` |
| Exporter en CSV les interventions d'un site sur une période | Accès au site | RG-7, H9, H10 | idem |

Le site, l'équipement et le technicien d'une intervention sont fixés à sa création : le besoin ne prévoit pas de les modifier.

## 7. API REST

Les changements de statut sont exposés comme des **actions métier** (`/demarrer`, `/cloturer`), pas comme un `PATCH` du champ `statut`. L'API parle ainsi le langage du métier, et aucune transition ne contourne la machine à états.

| Méthode et route | Cas d'usage | Succès |
|---|---|---|
| `POST /interventions` | Créer | 201 + intervention |
| `PATCH /interventions/:id` | Modifier (non close) | 200 |
| `POST /interventions/:id/demarrer` | Passer en cours | 200 |
| `POST /interventions/:id/cloturer` | Clôturer | 200 |
| `POST /interventions/:id/corriger-duree` | Corriger la durée (responsable, intervention close) | 200 |
| `GET /sites/:siteId/interventions?statut=&du=&au=` | Lister | 200 |
| `GET /sites/:siteId/interventions/export.csv?du=&au=` | Exporter | 200, `text/csv` |

### 7.1 Format des dates (RG-6)

- **En entrée** : date et heure locales de Paris, au format ISO **sans décalage** (`2026-03-29T10:30`). Une valeur avec décalage ou `Z` est refusée (400), pour qu'il n'y ait qu'une seule interprétation possible.
- **En sortie** : ISO **avec le décalage de Paris** (`2026-03-29T10:30:00+02:00`). L'heure lue est l'heure de Paris, et la valeur reste sans ambiguïté.
- **Changement d'heure** :
  - une heure **inexistante** (passage à l'heure d'été, par exemple `2026-03-29T02:30`) est refusée (400, `DATE_INVALIDE`) ;
  - une heure **ambiguë** (passage à l'heure d'hiver, par exemple `2026-10-25T02:30`) est interprétée comme sa **première occurrence** (heure d'été).
- **Période** (`du`, `au`) : dates au format `AAAA-MM-JJ`, jours entiers en heure de Paris, bornes incluses (H8). Elle est convertie en intervalle UTC `[début du jour « du » ; début du jour suivant « au »[`. `du` doit être antérieur ou égal à `au`.

### 7.2 Erreurs

Toutes les erreurs ont le format `{ "code": "DUREE_REQUISE", "message": "…" }`. Le `code` est un identifiant métier stable, sur lequel les tests et les clients s'appuient. Le `message` est un texte lisible en français.

| HTTP | Cas |
|---|---|
| 400 | Entrée invalide (Zod), date invalide, période invalide |
| 401 | Utilisateur non identifié |
| 403 | Site ou intervention hors de son périmètre, action réservée au responsable |
| 404 | Intervention ou site inexistant |
| 409 | Transition interdite, modification d'une intervention close (RG-4), correction sur une intervention non close |
| 422 | Clôture sans durée (RG-3), équipement hors site, technicien non rattaché |

## 8. Modèle de données

### 8.1 Principes : une donnée au service du métier

- **Vocabulaire métier** dans les noms de tables et de colonnes (`intervention`, `duree_minutes`, `date_debut`, `rattachement_site`). Qui lit la base y reconnaît le métier sans connaître le code.
- **Valeurs lisibles** : les statuts et les rôles sont stockés en clair (`'OUVERTE'`, `'EN_COURS'`, `'CLOSE'`, `'TECHNICIEN'`), jamais sous forme d'entier ou de code interne.
- **L'unité dans le nom** : `duree_minutes`, et non `duree`. Pas de doute possible sur l'unité, y compris dans un export ou une requête SQL directe.
- **Identifiants métier** : chaque site, équipement et utilisateur a un `code` ou un `matricule` unique, lisible, distinct de la clé technique. L'export utilise ces identifiants, jamais les ID internes.
- **Les règles métier sont aussi dans la base** quand SQLite le permet (`CHECK`, clés étrangères composites). La donnée reste cohérente même si on y accède hors de l'API (script, correction manuelle).
- **Dates** :
  - stockées en **ISO 8601 UTC, à largeur fixe** (`2026-03-29T08:30:00Z`). C'est lisible par un humain, triable et comparable comme texte, et sans ambiguïté au changement d'heure ;
  - l'heure de Paris est une affaire de **présentation** (RG-6), gérée à l'entrée et à la sortie de l'API ;
  - stocker l'heure locale de Paris rendrait ambiguë l'heure répétée du passage à l'heure d'hiver ;
  - stocker un timestamp numérique rendrait la donnée illisible.

### 8.2 Schéma

```
site 1 ──── n equipement
site 1 ──── n rattachement_site n ──── 1 utilisateur (technicien)
site 1 ──── n intervention n ──── 1 equipement (du même site)
                          n ──── 1 utilisateur (technicien)
```

```sql
CREATE TABLE site (
  id    INTEGER PRIMARY KEY,
  code  TEXT NOT NULL UNIQUE,          -- ex. 'METHA-LILLE-01'
  nom   TEXT NOT NULL
);

CREATE TABLE equipement (
  id       INTEGER PRIMARY KEY,
  site_id  INTEGER NOT NULL REFERENCES site(id),
  code     TEXT NOT NULL,              -- ex. 'DIGESTEUR-1'
  libelle  TEXT NOT NULL,
  UNIQUE (site_id, code),
  UNIQUE (id, site_id)                 -- cible de la clé composite de intervention (H13)
);

CREATE TABLE utilisateur (
  id         INTEGER PRIMARY KEY,
  matricule  TEXT NOT NULL UNIQUE,
  nom        TEXT NOT NULL,
  prenom     TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('TECHNICIEN', 'RESPONSABLE_EXPLOITATION'))
);

-- Sites sur lesquels un technicien intervient (RG-2).
-- Le responsable voit tous les sites : pas de rattachement nécessaire.
CREATE TABLE rattachement_site (
  utilisateur_id  INTEGER NOT NULL REFERENCES utilisateur(id),
  site_id         INTEGER NOT NULL REFERENCES site(id),
  PRIMARY KEY (utilisateur_id, site_id)
);

CREATE TABLE intervention (
  id              INTEGER PRIMARY KEY,
  site_id         INTEGER NOT NULL REFERENCES site(id),
  equipement_id   INTEGER NOT NULL,
  technicien_id   INTEGER NOT NULL REFERENCES utilisateur(id),
  date_debut      TEXT    NOT NULL,                 -- ISO 8601 UTC
  duree_minutes   INTEGER CHECK (duree_minutes IS NULL OR duree_minutes > 0),   -- H7
  description     TEXT    NOT NULL CHECK (length(trim(description)) > 0),
  statut          TEXT    NOT NULL DEFAULT 'OUVERTE'
                          CHECK (statut IN ('OUVERTE', 'EN_COURS', 'CLOSE')),
  cree_le         TEXT    NOT NULL,                 -- ISO 8601 UTC
  modifie_le      TEXT    NOT NULL,                 -- ISO 8601 UTC
  CHECK (statut <> 'CLOSE' OR duree_minutes IS NOT NULL),                -- RG-3, en dernier recours
  FOREIGN KEY (equipement_id, site_id) REFERENCES equipement(id, site_id) -- H13
);

CREATE INDEX idx_intervention_site_date   ON intervention (site_id, date_debut);
CREATE INDEX idx_intervention_site_statut ON intervention (site_id, statut);
```

Remarques :
- Les clés étrangères SQLite exigent `PRAGMA foreign_keys = ON`, activé à chaque connexion.
- La cohérence « équipement du même site » (H13) est garantie par la base grâce à la clé composite.
- La règle « le technicien est rattaché au site » (H4) est vérifiée **par l'application** à la création, pas par la base. Les rattachements évoluent dans le temps, et une clé étrangère empêcherait de retirer un technicien d'un site sans toucher à son historique d'interventions.
- Pas de contrainte en base « technicien_id désigne un utilisateur de rôle TECHNICIEN » : SQLite ne le permet pas sans trigger. Le contrôle est fait par l'application.
- Pas de colonne de traçabilité des corrections de durée (H11, hors périmètre). `modifie_le` donne seulement la date de dernière modification.
- Le référentiel (sites, équipements, utilisateurs, rattachements) est chargé par un script de données initiales (H12).

### 8.3 Export CSV (H9)

Le CSV est destiné au contrôle de gestion, qui l'ouvre dans Excel. Il est donc conçu pour être lu, pas pour être réimporté par du code.

- Périmètre : les interventions **d'un site sur une période** (RG-7), sans autre filtre.
- Séparateur `;`, encodage UTF-8 avec BOM, fin de ligne CRLF, en-têtes en français.
- Colonnes : `Référence` · `Code site` · `Site` · `Code équipement` · `Équipement` · `Matricule technicien` · `Technicien` · `Date de début` · `Durée (minutes)` · `Statut` · `Description`.
- Date de début en heure de Paris, au format `JJ/MM/AAAA HH:MM`, reconnu nativement par Excel en français.
- Tri par date de début croissante.
- **Sécurité** : les valeurs de texte libre (description) qui commencent par `=`, `+`, `-`, `@` sont neutralisées, pour éviter l'injection de formules à l'ouverture dans Excel (CSV injection).

## 9. Stratégie de tests

**Uniquement des tests d'intégration.** L'objectif est de vérifier le comportement réel de l'application, pas des fonctions isolées. Les tests ne passent donc que par l'API.

- **Outils** : Vitest et supertest, sur l'app Express réelle (`interface/http/app.ts`), sans bouchon ni mock du domaine, des dépôts ou de la base.
- **Base de données** : une vraie base SQLite. Chaque test part d'une base en mémoire neuve, avec les migrations Drizzle appliquées et un référentiel minimal (deux sites, un technicien rattaché à un seul site, un responsable).
- **Ce qui est vérifié** : le code HTTP, le `code` d'erreur métier, le corps de la réponse, et l'état persisté, relu via l'API.
- **Organisation** : un fichier par règle ou par cas d'usage. Le nom de chaque test cite la règle qu'il couvre (`RG-3 : refuse la clôture sans durée`).

Couverture des règles demandées :

| Règle | Tests |
|---|---|
| **RG-2** | Un technicien ne liste pas un site qui n'est pas le sien (403). Il ne crée pas sur un site qui n'est pas le sien (403), ni pour un autre technicien. Il n'agit pas sur une intervention d'un autre site (403). Le responsable liste et crée sur tous les sites |
| **RG-3** | Clôture sans durée refusée (422). Clôture avec durée acceptée |
| **RG-4** | `PATCH` sur une intervention close refusé (409), pour un technicien comme pour un responsable. Aucune transition possible depuis `CLOSE` |
| **RG-5** | Le responsable corrige la durée d'une intervention close (200, statut inchangé). Un technicien est refusé (403). Correction sur une intervention non close refusée (409). Durée invalide refusée (400) |
| **RG-6** | Saisie en heure de Paris restituée à l'identique avec le bon décalage, en heure d'hiver (`+01:00`) et en heure d'été (`+02:00`). Heure inexistante refusée. Heure ambiguë interprétée comme sa première occurrence. Bornes de période en heure de Paris : une intervention le 31 à 23h30 heure de Paris appartient bien au 31, pas au jour UTC suivant. Dates de l'export en heure de Paris |
| H2 | Pas de clôture directe depuis `OUVERTE`, pas de retour en arrière |
| RG-7 / H9 | Contenu du CSV : en-têtes, séparateur, BOM, filtrage par période, neutralisation des formules |

## 10. Fichier de règles de l'agent

Un fichier `AGENTS.md` à la racine. Il contient :
- l'objet du projet et les sources de vérité (`docs/besoin_metier.md`, ce document) ;
- la stack technique et l'architecture DDD cible, avec ses règles de dépendance ;
- les commandes du projet (installer, lancer, tester, migrer, charger les données initiales) ;
- les conventions : vocabulaire métier en français, règles dans le domaine et pas dans les routes, statut modifié uniquement par la machine à états, dates en UTC en base et en heure de Paris aux frontières de l'API ;
- les attentes de qualité : uniquement des tests d'intégration ; toute règle métier nouvelle ou modifiée s'accompagne de tests ; les tests passent avant de déclarer une tâche terminée ;
- les interdits : pas de modification directe du `statut`, pas de date sans fuseau, pas de nouvelle dépendance sans justification, pas d'ajout de fonctionnalité hors du besoin.

## 11. Hors périmètre, pistes pour une journée de plus

- Traçabilité des corrections de durée après clôture (H11) : table d'historique (qui, quand, ancienne et nouvelle valeur).
- Authentification réelle (OIDC ou JWT émis par le SSO de l'entreprise) à la place de l'en-tête `X-Utilisateur-Id`.
- Consultation d'une intervention seule (`GET /interventions/:id`), filtre par statut sur l'export, réaffectation d'une intervention à un autre technicien.
- Documentation OpenAPI générée depuis les schémas Zod.
- Pagination de la liste.
- Conteneurisation (Dockerfile) et intégration continue (lint, tests).
- Passage à PostgreSQL si le volume ou les accès concurrents l'exigent. Drizzle limite l'effort de migration.
