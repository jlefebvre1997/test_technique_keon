import { eq } from 'drizzle-orm';
import type { DepotReferentiel, Equipement, Site, Utilisateur } from '../../domaine/referentiel/referentiel';
import type { BaseDeDonnees } from './client';
import { equipement, rattachementSite, site, utilisateur } from './schema';

export class DepotReferentielDrizzle implements DepotReferentiel {
  constructor(private readonly db: BaseDeDonnees) {}

  trouverSite(id: number): Site | undefined {
    return this.db.select().from(site).where(eq(site.id, id)).get();
  }

  trouverEquipement(id: number): Equipement | undefined {
    return this.db.select().from(equipement).where(eq(equipement.id, id)).get();
  }

  trouverUtilisateur(id: number): Utilisateur | undefined {
    const ligne = this.db.select().from(utilisateur).where(eq(utilisateur.id, id)).get();
    if (!ligne) return undefined;
    const rattachements = this.db
      .select({ siteId: rattachementSite.siteId })
      .from(rattachementSite)
      .where(eq(rattachementSite.utilisateurId, id))
      .all();
    return { ...ligne, siteIds: rattachements.map((r) => r.siteId) };
  }
}
