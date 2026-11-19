import { eq } from 'drizzle-orm';
import { DateHeureParis } from '../../domaine/commun/date-heure-paris';
import type { DepotInterventions } from '../../domaine/maintenance/depot-interventions';
import { Intervention } from '../../domaine/maintenance/intervention';
import type { BaseDeDonnees } from './client';
import { intervention } from './schema';

type LigneIntervention = typeof intervention.$inferSelect;

export class DepotInterventionsDrizzle implements DepotInterventions {
  constructor(private readonly db: BaseDeDonnees) {}

  trouver(id: number): Intervention | undefined {
    const ligne = this.db.select().from(intervention).where(eq(intervention.id, id)).get();
    return ligne && versDomaine(ligne);
  }

  enregistrer(aEnregistrer: Intervention): Intervention {
    const d = aEnregistrer.donnees();
    const maintenant = DateHeureParis.maintenant().versStockage();
    // Seuls les champs modifiables sont mis à jour : site, équipement et technicien sont fixés à la création.
    const modifiables = {
      dateDebut: d.dateDebut.versStockage(),
      dureeMinutes: d.dureeMinutes,
      description: d.description,
      statut: d.statut,
      modifieLe: maintenant,
    };
    const ligne =
      d.id === undefined
        ? this.db
            .insert(intervention)
            .values({ ...modifiables, siteId: d.siteId, equipementId: d.equipementId, technicienId: d.technicienId, creeLe: maintenant })
            .returning()
            .get()
        : this.db.update(intervention).set(modifiables).where(eq(intervention.id, d.id)).returning().get();
    return versDomaine(ligne);
  }
}

function versDomaine(ligne: LigneIntervention): Intervention {
  return Intervention.reconstituer({
    id: ligne.id,
    siteId: ligne.siteId,
    equipementId: ligne.equipementId,
    technicienId: ligne.technicienId,
    dateDebut: DateHeureParis.depuisStockage(ligne.dateDebut),
    dureeMinutes: ligne.dureeMinutes,
    description: ligne.description,
    statut: ligne.statut,
  });
}
