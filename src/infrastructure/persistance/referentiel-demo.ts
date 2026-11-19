import type { BaseDeDonnees } from './client';
import { equipement, rattachementSite, site, utilisateur } from './schema';

/** Référentiel de démonstration (H12), utilisé par `npm run db:seed` et par les tests d'intégration. */
export const SITES = {
  beauce: { id: 1, code: 'METHA-BEAUCE', nom: 'Méthanisation de la Beauce' },
  picardie: { id: 2, code: 'METHA-PICARDIE', nom: 'Méthanisation de Picardie' },
} as const;

export const EQUIPEMENTS = {
  digesteurBeauce: { id: 1, siteId: SITES.beauce.id, code: 'DIGESTEUR-1', libelle: 'Digesteur principal' },
  cogenerationBeauce: { id: 2, siteId: SITES.beauce.id, code: 'COGEN-1', libelle: 'Moteur de cogénération' },
  digesteurPicardie: { id: 3, siteId: SITES.picardie.id, code: 'DIGESTEUR-1', libelle: 'Digesteur principal' },
} as const;

export const UTILISATEURS = {
  technicienBeauce: { id: 1, matricule: 'T001', nom: 'Martin', prenom: 'Léa', role: 'TECHNICIEN', siteIds: [SITES.beauce.id] },
  technicienPicardie: { id: 2, matricule: 'T002', nom: 'Bernard', prenom: 'Hugo', role: 'TECHNICIEN', siteIds: [SITES.picardie.id] },
  responsable: { id: 3, matricule: 'R001', nom: 'Petit', prenom: 'Claire', role: 'RESPONSABLE_EXPLOITATION', siteIds: [] },
} as const;

export function chargerReferentielDemo(db: BaseDeDonnees): void {
  db.transaction((tx) => {
    tx.insert(site).values(Object.values(SITES)).onConflictDoNothing().run();
    tx.insert(equipement).values(Object.values(EQUIPEMENTS)).onConflictDoNothing().run();
    for (const { siteIds, ...u } of Object.values(UTILISATEURS)) {
      tx.insert(utilisateur).values(u).onConflictDoNothing().run();
      for (const siteId of siteIds) {
        tx.insert(rattachementSite).values({ utilisateurId: u.id, siteId }).onConflictDoNothing().run();
      }
    }
  });
}
