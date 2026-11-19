import { AbilityBuilder, createMongoAbility, subject, type ForcedSubject, type MongoAbility } from '@casl/ability';
import { ErreurMetier } from '../domaine/commun/erreurs';
import type { Utilisateur } from '../domaine/referentiel/referentiel';

export type Action = 'lire' | 'creer' | 'modifier' | 'demarrer' | 'cloturer' | 'corrigerDuree' | 'exporter';
type TypeSujet = 'Site' | 'Intervention';
interface SujetSite {
  id: number;
}
interface SujetIntervention {
  siteId: number;
  technicienId: number;
}
type Sujet = TypeSujet | (SujetSite & ForcedSubject<'Site'>) | (SujetIntervention & ForcedSubject<'Intervention'>);
export type Droits = MongoAbility<[Action, Sujet]>;

/**
 * RG-2 : un technicien agit sur ses sites, et crée ses interventions pour lui-même (H4).
 * RG-2, H5 : un responsable agit sur tous les sites. RG-5 : lui seul corrige la durée.
 */
export function droitsDe(utilisateur: Utilisateur): Droits {
  const { can, build } = new AbilityBuilder<Droits>(createMongoAbility);
  if (utilisateur.role === 'RESPONSABLE_EXPLOITATION') {
    can(['lire', 'exporter'], 'Site');
    can(['lire', 'creer', 'modifier', 'demarrer', 'cloturer', 'corrigerDuree'], 'Intervention');
  } else {
    const sesSites = { $in: utilisateur.siteIds };
    can(['lire', 'exporter'], 'Site', { id: sesSites });
    can(['lire', 'modifier', 'demarrer', 'cloturer'], 'Intervention', { siteId: sesSites });
    can('creer', 'Intervention', { siteId: sesSites, technicienId: utilisateur.id });
  }
  return build();
}

/** Lève ACTION_REFUSEE si le rôle n'a pas l'action, ACCES_SITE_REFUSE si l'objet est hors de son périmètre. */
export function exiger(droits: Droits, action: Action, type: 'Site', objet: SujetSite): void;
export function exiger(droits: Droits, action: Action, type: 'Intervention', objet: SujetIntervention): void;
export function exiger(droits: Droits, action: Action, type: TypeSujet, objet: SujetSite | SujetIntervention): void {
  if (droits.can(action, subject(type, { ...objet }) as Sujet)) return;
  if (!droits.can(action, type)) {
    throw new ErreurMetier('ACTION_REFUSEE', "Cette action est réservée au responsable d'exploitation.");
  }
  throw new ErreurMetier('ACCES_SITE_REFUSE', "Ce site ne fait pas partie de votre périmètre.");
}
