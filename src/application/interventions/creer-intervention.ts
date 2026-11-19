import { DateHeureParis } from '../../domaine/commun/date-heure-paris';
import { ErreurMetier } from '../../domaine/commun/erreurs';
import { Intervention } from '../../domaine/maintenance/intervention';
import type { Utilisateur } from '../../domaine/referentiel/referentiel';
import type { Depots } from '../depots';
import { droitsDe, exiger } from '../droits';

export interface CommandeCreation {
  siteId: number;
  equipementId: number;
  /** Par défaut, l'utilisateur qui saisit l'intervention. */
  technicienId?: number;
  /** Heure locale de Paris, sans décalage (RG-6). */
  dateDebut: string;
  dureeMinutes?: number | null;
  description: string;
}

export function creerIntervention(depots: Depots, utilisateur: Utilisateur, commande: CommandeCreation): Intervention {
  const technicienId = commande.technicienId ?? utilisateur.id;
  if (utilisateur.role === 'TECHNICIEN' && technicienId !== utilisateur.id) {
    throw new ErreurMetier('ACTION_REFUSEE', 'Un technicien ne crée des interventions que pour lui-même.');
  }
  exiger(droitsDe(utilisateur), 'creer', 'Intervention', { siteId: commande.siteId, technicienId });

  const site = depots.referentiel.trouverSite(commande.siteId);
  if (!site) throw new ErreurMetier('SITE_INTROUVABLE', `Site ${commande.siteId} introuvable.`);
  const equipement = depots.referentiel.trouverEquipement(commande.equipementId);
  if (!equipement) {
    throw new ErreurMetier('EQUIPEMENT_HORS_SITE', `Équipement ${commande.equipementId} introuvable sur le site ${site.code}.`);
  }
  const technicien = depots.referentiel.trouverUtilisateur(technicienId);
  if (!technicien) {
    throw new ErreurMetier('TECHNICIEN_NON_RATTACHE', `Technicien ${technicienId} introuvable sur le site ${site.code}.`);
  }

  const intervention = Intervention.creer({
    site,
    equipement,
    technicien,
    dateDebut: DateHeureParis.depuisSaisie(commande.dateDebut),
    dureeMinutes: commande.dureeMinutes ?? null,
    description: commande.description,
  });
  return depots.interventions.enregistrer(intervention);
}
