import type { Periode } from '../commun/periode';
import type { Intervention } from './intervention';
import type { Statut } from './intervention.machine';

export interface FiltresInterventions {
  statut?: Statut;
  /** Sur la date de début (H8). */
  periode?: Periode;
}

export interface DepotInterventions {
  trouver(id: number): Intervention | undefined;
  /** Interventions d'un site, triées par date de début croissante. */
  listerParSite(siteId: number, filtres: FiltresInterventions): Intervention[];
  /** Insère ou met à jour, et renvoie l'intervention telle qu'enregistrée. */
  enregistrer(intervention: Intervention): Intervention;
}
