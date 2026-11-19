import { describe, expect, it } from 'vitest';
import { demarrerApi, EQUIPEMENTS, SITES, UTILISATEURS } from './outils';

const { technicienBeauce, technicienPicardie, responsable } = UTILISATEURS;
const surPicardie = { siteId: SITES.picardie.id, equipementId: EQUIPEMENTS.digesteurPicardie.id };

/** Crée une intervention et la passe EN_COURS. */
async function interventionEnCours(api: ReturnType<typeof demarrerApi>, utilisateur: { id: number }, surcharge: object = {}) {
  const id = await api.creer(utilisateur, surcharge);
  await api.en(utilisateur).post(`/interventions/${id}/demarrer`).expect(200);
  return id;
}

describe('POST /interventions/:id/cloturer : clôturer une intervention', () => {
  it('RG-3 : clôture une intervention EN_COURS dont la durée est renseignée', async () => {
    const api = demarrerApi();
    const id = await interventionEnCours(api, technicienBeauce, { dureeMinutes: 120 });

    const reponse = await api.en(technicienBeauce).post(`/interventions/${id}/cloturer`);

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({ id, statut: 'CLOSE', dureeMinutes: 120 });
  });

  it('RG-3 : refuse la clôture sans durée (422), et l’intervention reste EN_COURS', async () => {
    const api = demarrerApi();
    const id = await interventionEnCours(api, technicienBeauce);

    const reponse = await api.en(technicienBeauce).post(`/interventions/${id}/cloturer`);
    expect(reponse.status).toBe(422);
    expect(reponse.body.code).toBe('DUREE_REQUISE');

    // Toujours EN_COURS : une nouvelle tentative bute encore sur la durée, pas sur le statut.
    const nouvelleTentative = await api.en(technicienBeauce).post(`/interventions/${id}/cloturer`);
    expect(nouvelleTentative.body.code).toBe('DUREE_REQUISE');
  });

  it('H2 : refuse de clôturer directement une intervention OUVERTE (409)', async () => {
    const api = demarrerApi();
    const id = await api.creer(technicienBeauce, { dureeMinutes: 30 });

    const reponse = await api.en(technicienBeauce).post(`/interventions/${id}/cloturer`);

    expect(reponse.status).toBe(409);
    expect(reponse.body.code).toBe('TRANSITION_INTERDITE');
  });

  describe('RG-4 : une intervention close est figée', () => {
    it.each(['cloturer', 'demarrer'])('refuse de la %s à nouveau (409)', async (action) => {
      const api = demarrerApi();
      const id = await interventionEnCours(api, technicienBeauce, { dureeMinutes: 30 });
      await api.en(technicienBeauce).post(`/interventions/${id}/cloturer`).expect(200);

      const reponse = await api.en(responsable).post(`/interventions/${id}/${action}`);

      expect(reponse.status).toBe(409);
      expect(reponse.body.code).toBe('TRANSITION_INTERDITE');
    });
  });

  describe('RG-2 : périmètre des sites', () => {
    it("refuse qu'un technicien clôture une intervention d'un autre site (403)", async () => {
      const api = demarrerApi();
      const id = await interventionEnCours(api, technicienPicardie, { ...surPicardie, dureeMinutes: 30 });

      const reponse = await api.en(technicienBeauce).post(`/interventions/${id}/cloturer`);

      expect(reponse.status).toBe(403);
      expect(reponse.body.code).toBe('ACCES_SITE_REFUSE');
    });

    it("le responsable clôture l'intervention de n'importe quel site", async () => {
      const api = demarrerApi();
      const id = await interventionEnCours(api, technicienPicardie, { ...surPicardie, dureeMinutes: 30 });

      const reponse = await api.en(responsable).post(`/interventions/${id}/cloturer`);

      expect(reponse.status).toBe(200);
      expect(reponse.body.statut).toBe('CLOSE');
    });
  });

  it('refuse une intervention inexistante (404)', async () => {
    const { en } = demarrerApi();
    const reponse = await en(technicienBeauce).post('/interventions/999/cloturer');
    expect(reponse.status).toBe(404);
    expect(reponse.body.code).toBe('INTERVENTION_INTROUVABLE');
  });
});
