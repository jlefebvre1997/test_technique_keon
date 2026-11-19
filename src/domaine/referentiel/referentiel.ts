/** Référentiel (H12) : données pré-chargées, en lecture seule pour ce module. */

export const ROLES = ['TECHNICIEN', 'RESPONSABLE_EXPLOITATION'] as const;
export type Role = (typeof ROLES)[number];

export interface Site {
  id: number;
  code: string;
  nom: string;
}

export interface Equipement {
  id: number;
  siteId: number;
  code: string;
  libelle: string;
}

export interface Utilisateur {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  role: Role;
  /** Sites de rattachement (RG-2). Toujours vide pour un responsable, qui voit tous les sites. */
  siteIds: number[];
}

export interface DepotReferentiel {
  trouverSite(id: number): Site | undefined;
  trouverEquipement(id: number): Equipement | undefined;
  trouverUtilisateur(id: number): Utilisateur | undefined;
}
