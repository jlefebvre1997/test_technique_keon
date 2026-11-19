import type { DepotInterventions } from '../domaine/maintenance/depot-interventions';
import type { DepotReferentiel } from '../domaine/referentiel/referentiel';

export interface Depots {
  interventions: DepotInterventions;
  referentiel: DepotReferentiel;
}
