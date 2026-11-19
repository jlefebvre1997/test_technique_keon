import { ErreurMetier } from '../../domaine/commun/erreurs';
import type { Intervention } from '../../domaine/maintenance/intervention';
import type { Utilisateur } from '../../domaine/referentiel/referentiel';
import type { Depots } from '../depots';
import { droitsDe, exiger, type Action } from '../droits';

/** Charge une intervention (404 si inexistante) et vérifie que l'utilisateur peut y appliquer l'action (RG-2). */
export function trouverInterventionPour(
  depots: Depots,
  utilisateur: Utilisateur,
  action: Action,
  id: number,
): Intervention {
  const intervention = depots.interventions.trouver(id);
  if (!intervention) throw new ErreurMetier('INTERVENTION_INTROUVABLE', `Intervention ${id} introuvable.`);
  const { siteId, technicienId } = intervention.donnees();
  exiger(droitsDe(utilisateur), action, 'Intervention', { siteId, technicienId });
  return intervention;
}
