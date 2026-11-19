import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, primaryKey, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { STATUTS } from '../../domaine/maintenance/intervention.machine';
import { ROLES } from '../../domaine/referentiel/referentiel';

// Noms en vocabulaire métier, valeurs lisibles, dates en ISO 8601 UTC (voir docs/doc_technique.md §8).

export const site = sqliteTable('site', {
  id: integer('id').primaryKey(),
  code: text('code').notNull().unique(),
  nom: text('nom').notNull(),
});

export const equipement = sqliteTable(
  'equipement',
  {
    id: integer('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => site.id),
    code: text('code').notNull(),
    libelle: text('libelle').notNull(),
  },
  (t) => [
    unique('equipement_code_par_site').on(t.siteId, t.code),
    // Cible de la clé composite de intervention (H13).
    unique('equipement_id_site').on(t.id, t.siteId),
  ],
);

export const utilisateur = sqliteTable(
  'utilisateur',
  {
    id: integer('id').primaryKey(),
    matricule: text('matricule').notNull().unique(),
    nom: text('nom').notNull(),
    prenom: text('prenom').notNull(),
    role: text('role', { enum: ROLES }).notNull(),
  },
  () => [check('utilisateur_role', sql.raw(`role IN (${ROLES.map((r) => `'${r}'`).join(', ')})`))],
);

/** Sites d'un technicien (RG-2). Le responsable voit tous les sites : pas de rattachement. */
export const rattachementSite = sqliteTable(
  'rattachement_site',
  {
    utilisateurId: integer('utilisateur_id')
      .notNull()
      .references(() => utilisateur.id),
    siteId: integer('site_id')
      .notNull()
      .references(() => site.id),
  },
  (t) => [primaryKey({ columns: [t.utilisateurId, t.siteId] })],
);

export const intervention = sqliteTable(
  'intervention',
  {
    id: integer('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => site.id),
    equipementId: integer('equipement_id').notNull(),
    technicienId: integer('technicien_id')
      .notNull()
      .references(() => utilisateur.id),
    dateDebut: text('date_debut').notNull(),
    dureeMinutes: integer('duree_minutes'),
    description: text('description').notNull(),
    statut: text('statut', { enum: STATUTS }).notNull().default('OUVERTE'),
    creeLe: text('cree_le').notNull(),
    modifieLe: text('modifie_le').notNull(),
  },
  (t) => [
    check('intervention_duree_positive', sql`duree_minutes IS NULL OR duree_minutes > 0`),
    check('intervention_description_non_vide', sql`length(trim(description)) > 0`),
    check('intervention_statut', sql.raw(`statut IN (${STATUTS.map((s) => `'${s}'`).join(', ')})`)),
    // RG-3, en dernier recours.
    check('intervention_close_avec_duree', sql`statut <> 'CLOSE' OR duree_minutes IS NOT NULL`),
    // H13 : l'équipement appartient au site de l'intervention.
    foreignKey({
      name: 'intervention_equipement_du_site',
      columns: [t.equipementId, t.siteId],
      foreignColumns: [equipement.id, equipement.siteId],
    }),
    index('idx_intervention_site_date').on(t.siteId, t.dateDebut),
    index('idx_intervention_site_statut').on(t.siteId, t.statut),
  ],
);
