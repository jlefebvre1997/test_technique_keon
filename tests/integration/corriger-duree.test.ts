import { describe, expect, it } from 'vitest';
import { demarrerApi, EQUIPEMENTS, SITES, UTILISATEURS } from './outils';

const { technicienBeauce, technicienPicardie, responsable } = UTILISATEURS;

/** Crée une intervention de 60 minutes et la mène jusqu'au statut demandé. */
async function intervention(api: ReturnType<typeof demarrerApi>, statut: 'OUVERTE' | 'EN_COURS' | 'CLOSE', surcharge: object = {}) {
  const auteur = 'siteId' in surcharge ? technicienPicardie : technicienBeauce;
  const id = await api.creer(auteur, { dureeMinutes: 60, ...surcharge });
  if (statut !== 'OUVERTE') await api.en(auteur).post(`/interventions/${id}/demarrer`).expect(200);
  if (statut === 'CLOSE') await api.en(auteur).post(`/interventions/${id}/cloturer`).expect(200);
  return id;
}

describe('POST /interventions/:id/corriger-duree : corriger la durée d’une intervention close', () => {
  it('RG-5 : le responsable corrige la durée, l’intervention reste CLOSE', async () => {
    const api = demarrerApi();
    const id = await intervention(api, 'CLOSE');

    const reponse = await api.en(responsable).post(`/interventions/${id}/corriger-duree`, { dureeMinutes: 75 });

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({ id, dureeMinutes: 75, statut: 'CLOSE' });
    const liste = await api.en(responsable).get(`/sites/${SITES.beauce.id}/interventions`);
    expect(liste.body).toEqual([reponse.body]);
  });

  it('RG-5 : le responsable corrige la durée sur n’importe quel site', async () => {
    const api = demarrerApi();
    const id = await intervention(api, 'CLOSE', { siteId: SITES.picardie.id, equipementId: EQUIPEMENTS.digesteurPicardie.id });

    const reponse = await api.en(responsable).post(`/interventions/${id}/corriger-duree`, { dureeMinutes: 30 });

    expect(reponse.status).toBe(200);
    expect(reponse.body.dureeMinutes).toBe(30);
  });

  it("RG-5 : refuse qu'un technicien corrige la durée, même sur son site (403)", async () => {
    const api = demarrerApi();
    const id = await intervention(api, 'CLOSE');

    const reponse = await api.en(technicienBeauce).post(`/interventions/${id}/corriger-duree`, { dureeMinutes: 75 });

    expect(reponse.status).toBe(403);
    expect(reponse.body.code).toBe('ACTION_REFUSEE');
    const liste = await api.en(technicienBeauce).get(`/sites/${SITES.beauce.id}/interventions`);
    expect(liste.body[0].dureeMinutes).toBe(60);
  });

  it.each(['OUVERTE', 'EN_COURS'] as const)(
    'H1 : refuse la correction sur une intervention %s (409)',
    async (statut) => {
      const api = demarrerApi();
      const id = await intervention(api, statut);

      const reponse = await api.en(responsable).post(`/interventions/${id}/corriger-duree`, { dureeMinutes: 75 });

      expect(reponse.status).toBe(409);
      expect(reponse.body.code).toBe('INTERVENTION_NON_CLOSE');
    },
  );

  it.each([
    ['nulle', 0],
    ['négative', -10],
    ['non entière', 12.5],
  ])('H7 : refuse une durée %s (400), la durée enregistrée reste inchangée', async (_cas, dureeMinutes) => {
    const api = demarrerApi();
    const id = await intervention(api, 'CLOSE');

    const reponse = await api.en(responsable).post(`/interventions/${id}/corriger-duree`, { dureeMinutes });

    expect(reponse.status).toBe(400);
    expect(reponse.body.code).toBe('DUREE_INVALIDE');
    const liste = await api.en(responsable).get(`/sites/${SITES.beauce.id}/interventions`);
    expect(liste.body[0].dureeMinutes).toBe(60);
  });

  it.each([
    ['absente', {}],
    ['vide', { dureeMinutes: null }],
    ['accompagnée d’un autre champ', { dureeMinutes: 75, description: 'Autre chose' }],
  ])('RG-5 : refuse une correction %s (400)', async (_cas, corps) => {
    const api = demarrerApi();
    const id = await intervention(api, 'CLOSE');

    const reponse = await api.en(responsable).post(`/interventions/${id}/corriger-duree`, corps);

    expect(reponse.status).toBe(400);
    expect(reponse.body.code).toBe('REQUETE_INVALIDE');
  });

  it('refuse une intervention inexistante (404)', async () => {
    const { en } = demarrerApi();
    const reponse = await en(responsable).post('/interventions/999/corriger-duree', { dureeMinutes: 75 });
    expect(reponse.status).toBe(404);
    expect(reponse.body.code).toBe('INTERVENTION_INTROUVABLE');
  });
});
