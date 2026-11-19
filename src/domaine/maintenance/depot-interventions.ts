import type { Intervention } from './intervention';

export interface DepotInterventions {
  trouver(id: number): Intervention | undefined;
  /** Insère ou met à jour, et renvoie l'intervention telle qu'enregistrée. */
  enregistrer(intervention: Intervention): Intervention;
}
