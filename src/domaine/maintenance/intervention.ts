import type { DateHeureParis } from '../commun/date-heure-paris';
import { ErreurMetier } from '../commun/erreurs';
import type { Equipement, Site, Utilisateur } from '../referentiel/referentiel';
import { appliquerEvenement, type EvenementIntervention, type Statut } from './intervention.machine';

export interface EtatIntervention {
  /** Absent tant que l'intervention n'est pas enregistrée. */
  id: number | undefined;
  siteId: number;
  equipementId: number;
  technicienId: number;
  dateDebut: DateHeureParis;
  dureeMinutes: number | null;
  description: string;
  statut: Statut;
}

export interface NouvelleIntervention {
  site: Site;
  equipement: Equipement;
  technicien: Utilisateur;
  dateDebut: DateHeureParis;
  dureeMinutes: number | null;
  description: string;
}

export interface ModificationIntervention {
  dateDebut?: DateHeureParis;
  dureeMinutes?: number | null;
  description?: string;
}

/** Agrégat racine du contexte Maintenance. Le statut ne change que par la machine à états. */
export class Intervention {
  private constructor(private readonly etat: EtatIntervention) {}

  static creer(nouvelle: NouvelleIntervention): Intervention {
    const { site, equipement, technicien } = nouvelle;
    if (equipement.siteId !== site.id) {
      throw new ErreurMetier('EQUIPEMENT_HORS_SITE', `L'équipement ${equipement.code} n'appartient pas au site ${site.code}.`);
    }
    if (technicien.role !== 'TECHNICIEN' || !technicien.siteIds.includes(site.id)) {
      throw new ErreurMetier(
        'TECHNICIEN_NON_RATTACHE',
        `L'utilisateur ${technicien.matricule} n'est pas un technicien rattaché au site ${site.code}.`,
      );
    }
    return new Intervention({
      id: undefined,
      siteId: site.id,
      equipementId: equipement.id,
      technicienId: technicien.id,
      dateDebut: nouvelle.dateDebut,
      dureeMinutes: verifierDuree(nouvelle.dureeMinutes),
      description: verifierDescription(nouvelle.description),
      statut: 'OUVERTE',
    });
  }

  static reconstituer(etat: EtatIntervention): Intervention {
    return new Intervention({ ...etat });
  }

  get id(): number | undefined {
    return this.etat.id;
  }

  get siteId(): number {
    return this.etat.siteId;
  }

  get statut(): Statut {
    return this.etat.statut;
  }

  donnees(): Readonly<EtatIntervention> {
    return { ...this.etat };
  }

  demarrer(): void {
    this.appliquer({ type: 'DEMARRER' });
  }

  cloturer(): void {
    this.appliquer({ type: 'CLOTURER' });
  }

  /** H3 : une intervention non close reste modifiable. RG-4 : plus rien une fois close. */
  modifier(modification: ModificationIntervention): void {
    if (this.etat.statut === 'CLOSE') {
      throw new ErreurMetier('INTERVENTION_CLOSE', 'Une intervention close ne peut plus être modifiée.');
    }
    if (modification.dateDebut !== undefined) this.etat.dateDebut = modification.dateDebut;
    if (modification.dureeMinutes !== undefined) this.etat.dureeMinutes = verifierDuree(modification.dureeMinutes);
    if (modification.description !== undefined) this.etat.description = verifierDescription(modification.description);
  }

  /** RG-5 : seule modification possible après clôture. Ce n'est pas une transition : le statut reste CLOSE. */
  corrigerDuree(dureeMinutes: number): void {
    if (this.etat.statut !== 'CLOSE') {
      throw new ErreurMetier(
        'INTERVENTION_NON_CLOSE',
        "La correction de durée ne concerne que les interventions closes. Modifiez l'intervention directement.",
      );
    }
    this.etat.dureeMinutes = verifierDuree(dureeMinutes);
  }

  private appliquer(evenement: EvenementIntervention): void {
    this.etat.statut = appliquerEvenement(this.etat.statut, this.etat.dureeMinutes, evenement);
  }
}

/** H7 : durée en minutes, entier strictement positif. */
function verifierDuree<T extends number | null>(dureeMinutes: T): T {
  if (dureeMinutes !== null && (!Number.isInteger(dureeMinutes) || dureeMinutes <= 0)) {
    throw new ErreurMetier('DUREE_INVALIDE', 'La durée doit être un nombre entier de minutes strictement positif.');
  }
  return dureeMinutes;
}

function verifierDescription(description: string): string {
  const nettoyee = description.trim();
  if (nettoyee.length === 0) {
    throw new ErreurMetier('DESCRIPTION_REQUISE', 'La description est obligatoire.');
  }
  return nettoyee;
}
