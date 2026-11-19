# Suivi des interventions de maintenance : besoin métier

> Document de référence métier. Il reformule le besoin initial (`besoin_initial`) et fixe les hypothèses retenues là où le besoin ne tranche pas (section 8).
> Ces hypothèses n'ont pas été cadrées avec le métier : elles sont à confirmer avant toute mise en production.

## 1. Contexte

Les équipes d'exploitation des **sites de méthanisation** ont besoin d'un module simple pour **suivre les interventions de maintenance** réalisées sur les équipements de ces sites.

Le contrôle de gestion doit aussi pouvoir **extraire ces interventions** pour ses analyses.

## 2. Acteurs

| Acteur | Description | Périmètre |
|---|---|---|
| **Technicien** | Réalise les interventions sur le terrain | Uniquement **ses** sites (ceux auxquels il est rattaché) |
| **Responsable d'exploitation** | Supervise l'exploitation | **Tous** les sites |
| **Contrôle de gestion** | Exploite les données d'intervention | Consomme l'export CSV, pas de rôle dédié dans le module (H10) |

## 3. Glossaire

- **Site** : un site de méthanisation.
- **Équipement** : un matériel situé sur un site, qui fait l'objet d'interventions.
- **Intervention** : une opération de maintenance réalisée par un technicien sur un équipement d'un site.
- **Clôture** : passage d'une intervention au statut `CLOSE`.

## 4. Objet métier : l'intervention

| Attribut | Description | Remarque |
|---|---|---|
| Site | Le site de méthanisation concerné | Obligatoire |
| Équipement | L'équipement sur lequel on intervient | Obligatoire, doit appartenir au site (H13) |
| Technicien | Le technicien qui réalise l'intervention | Obligatoire (H4) |
| Date de début | Date et heure de début de l'intervention | Saisie et affichée en heure de Paris (RG-6) |
| Durée | Durée de l'intervention, **en minutes** | Entier strictement positif (H7). Peut être vide tant que l'intervention n'est pas close (RG-3) |
| Description | Texte libre décrivant l'intervention | |
| Statut | `OUVERTE`, `EN_COURS` ou `CLOSE` | |

## 5. Cycle de vie

```
  OUVERTE ──(passer en cours)──▶ EN_COURS ──(clôturer)──▶ CLOSE
```

- À sa création, une intervention a le statut `OUVERTE`.
- Le cycle est strict : pas de saut d'étape, pas de retour en arrière (H2).
- `CLOSE` est un état final (RG-4), sauf pour la correction de durée par un responsable (RG-5).

## 6. Règles de gestion

La numérotation suit l'ordre du besoin initial. Le cahier des charges demande des tests « au minimum sur les règles 2, 3, 4/5 et 6 », et ces numéros renvoient à cette liste.

| # | Règle |
|---|---|
| **RG-1** | Une intervention a un site, un équipement, un technicien, une date de début, une durée, une description et un statut (`OUVERTE`, `EN_COURS`, `CLOSE`). Le besoin initial exprime la durée en heures ; elle est gérée **en minutes** (H7). |
| **RG-2** | Un **technicien** ne voit et ne crée des interventions que sur **ses sites**. Un **responsable d'exploitation** voit **tous les sites**. |
| **RG-3** | Une intervention ne peut être **clôturée** que si sa **durée est renseignée**. |
| **RG-4** | Une intervention **close** ne peut **plus être modifiée**. |
| **RG-5** | **Exception à RG-4** : le **responsable d'exploitation** peut **corriger la durée** d'une intervention après sa clôture. C'est la seule modification possible, et lui seul peut la faire (H1). |
| **RG-6** | Les dates sont **saisies et affichées en heure de Paris** (`Europe/Paris`, avec passage heure d'été / heure d'hiver). |
| **RG-7** | Un **export CSV** des interventions d'**un site** sur une **période** est disponible pour le contrôle de gestion. |

## 7. Fonctionnalités attendues

| Fonctionnalité | Règles concernées |
|---|---|
| **Créer** une intervention | RG-1, RG-2, RG-6 |
| **Passer en cours** une intervention | RG-2, RG-4 |
| **Clôturer** une intervention | RG-2, RG-3, RG-4 |
| **Renseigner ou modifier** une intervention non close | RG-2, RG-4 |
| **Corriger la durée** d'une intervention close (responsable uniquement) | RG-5 |
| **Lister** les interventions d'un site, filtrables par **statut** et par **période** | RG-2, RG-6 |
| **Exporter en CSV** les interventions d'un site sur une période | RG-2, RG-6, RG-7 |

## 8. Hypothèses retenues

Le besoin initial ne tranche pas ces points. Faute de cadrage métier disponible, les hypothèses ci-dessous sont **appliquées** pour cette version. Les points marqués « hors périmètre » ne sont pas traités.

| # | Question | Hypothèse retenue |
|---|---|---|
| H1 | RG-4 et RG-5 se contredisent en apparence. | RG-5 est une exception bornée : sur une intervention close, seul le champ durée peut changer, et seulement par un responsable. |
| H2 | Le cycle de vie est-il strict ? | Oui : `OUVERTE → EN_COURS → CLOSE`, sans saut ni retour. |
| H3 | Une intervention non close peut-elle être modifiée ? | Oui, par un utilisateur qui a accès au site. Il faut au minimum pouvoir renseigner la durée avant de clôturer. |
| H4 | Un technicien peut-il créer une intervention au nom d'un autre ? | Non : un technicien est toujours le technicien de ses interventions. Un responsable peut affecter n'importe quel technicien rattaché au site. |
| H5 | Le responsable peut-il créer des interventions ? | Oui, sur tous les sites. |
| H6 | Un technicien voit-il toutes les interventions de ses sites ? | Oui, pas seulement les siennes. |
| H7 | Format de la durée ? | **Entier en minutes**, strictement positif. |
| H8 | Sur quoi porte la « période » des filtres et de l'export ? | Sur la date de début. Bornes en jours entiers, heure de Paris, date de début et date de fin incluses. |
| H9 | Format du CSV ? | Toutes les colonnes de RG-1, séparateur `;`, UTF-8 avec BOM (compatible Excel FR), dates en heure de Paris, durée en minutes. |
| H10 | Qui peut exporter ? | Même règle de visibilité que la liste (RG-2). Pas de rôle « contrôle de gestion » dédié. |
| H11 | Faut-il tracer les corrections de durée après clôture ? | **Hors périmètre.** |
| H12 | Qui gère les sites, équipements et techniciens ? | Un référentiel externe : données pré-chargées, pas de gestion dans ce module. |
| H13 | L'équipement doit-il appartenir au site de l'intervention ? | Oui, la cohérence est contrôlée. |
