import { describe, expect, it } from 'vitest';
import { demarrerApi, EQUIPEMENTS, SITES, UTILISATEURS } from './outils';

const { technicienBeauce, technicienPicardie, responsable } = UTILISATEURS;

describe('POST /interventions/:id/demarrer : passer une intervention en cours', () => {
  it('passe une intervention OUVERTE au statut EN_COURS, sans toucher au reste', async () => {
    const { en, creer } = demarrerApi();
    const id = await creer(technicienBeauce, { dureeMinutes: 45 });

    const reponse = await en(technicienBeauce).post(`/interventions/${id}/demarrer`);

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({
      id,
      statut: 'EN_COURS',
      siteId: SITES.beauce.id,
      equipementId: EQUIPEMENTS.digesteurBeauce.id,
      technicienId: technicienBeauce.id,
      dateDebut: '2026-01-15T10:30:00+01:00',
      dureeMinutes: 45,
      description: 'Remplacement du joint de la trappe de visite',
    });
  });

  it('H2 : refuse de démarrer une intervention déjà EN_COURS (409)', async () => {
    const { en, creer } = demarrerApi();
    const id = await creer(technicienBeauce);
    await en(technicienBeauce).post(`/interventions/${id}/demarrer`);

    const reponse = await en(technicienBeauce).post(`/interventions/${id}/demarrer`);

    expect(reponse.status).toBe(409);
    expect(reponse.body.code).toBe('TRANSITION_INTERDITE');
  });

  describe('RG-2 : périmètre des sites', () => {
    it("refuse qu'un technicien démarre une intervention d'un autre site (403)", async () => {
      const { en, creer } = demarrerApi();
      const id = await creer(technicienPicardie, {
        siteId: SITES.picardie.id,
        equipementId: EQUIPEMENTS.digesteurPicardie.id,
      });

      const reponse = await en(technicienBeauce).post(`/interventions/${id}/demarrer`);

      expect(reponse.status).toBe(403);
      expect(reponse.body.code).toBe('ACCES_SITE_REFUSE');
    });

    it("le responsable démarre l'intervention de n'importe quel site", async () => {
      const { en, creer } = demarrerApi();
      const id = await creer(technicienPicardie, {
        siteId: SITES.picardie.id,
        equipementId: EQUIPEMENTS.digesteurPicardie.id,
      });

      const reponse = await en(responsable).post(`/interventions/${id}/demarrer`);

      expect(reponse.status).toBe(200);
      expect(reponse.body.statut).toBe('EN_COURS');
    });
  });

  it('refuse une intervention inexistante (404)', async () => {
    const { en } = demarrerApi();
    const reponse = await en(technicienBeauce).post('/interventions/999/demarrer');
    expect(reponse.status).toBe(404);
    expect(reponse.body.code).toBe('INTERVENTION_INTROUVABLE');
  });

  it('refuse un identifiant invalide (400)', async () => {
    const { en } = demarrerApi();
    const reponse = await en(technicienBeauce).post('/interventions/abc/demarrer');
    expect(reponse.status).toBe(400);
    expect(reponse.body.code).toBe('REQUETE_INVALIDE');
  });
});
