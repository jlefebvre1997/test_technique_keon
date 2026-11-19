import { describe, expect, it } from 'vitest';
import { demarrerApi, EQUIPEMENTS, SITES, UTILISATEURS } from './outils';

const { technicienBeauce, technicienPicardie, responsable } = UTILISATEURS;
const urlBeauce = `/sites/${SITES.beauce.id}/interventions`;
const surPicardie = { siteId: SITES.picardie.id, equipementId: EQUIPEMENTS.digesteurPicardie.id };

describe('GET /sites/:siteId/interventions : lister les interventions d’un site', () => {
  it('liste les interventions du site, triées par date de début, avec leurs données en heure de Paris', async () => {
    const api = demarrerApi();
    const plusTard = await api.creer(technicienBeauce, { dateDebut: '2026-07-15T08:00', dureeMinutes: 60 });
    const plusTot = await api.creer(technicienBeauce, { dateDebut: '2026-01-15T10:30' });
    await api.creer(technicienPicardie, surPicardie);

    const reponse = await api.en(technicienBeauce).get(urlBeauce);

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual([
      {
        id: plusTot,
        siteId: SITES.beauce.id,
        equipementId: EQUIPEMENTS.digesteurBeauce.id,
        technicienId: technicienBeauce.id,
        dateDebut: '2026-01-15T10:30:00+01:00',
        dureeMinutes: null,
        description: 'Remplacement du joint de la trappe de visite',
        statut: 'OUVERTE',
      },
      expect.objectContaining({ id: plusTard, dateDebut: '2026-07-15T08:00:00+02:00', dureeMinutes: 60 }),
    ]);
  });

  it('renvoie une liste vide pour un site sans intervention', async () => {
    const { en } = demarrerApi();
    const reponse = await en(technicienBeauce).get(urlBeauce);
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual([]);
  });

  describe('RG-2 : périmètre des sites', () => {
    it("refuse qu'un technicien liste un site qui n'est pas le sien (403)", async () => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).get(`/sites/${SITES.picardie.id}/interventions`);
      expect(reponse.status).toBe(403);
      expect(reponse.body.code).toBe('ACCES_SITE_REFUSE');
    });

    it('le responsable liste n’importe quel site', async () => {
      const api = demarrerApi();
      const id = await api.creer(technicienPicardie, surPicardie);

      const reponse = await api.en(responsable).get(`/sites/${SITES.picardie.id}/interventions`);

      expect(reponse.status).toBe(200);
      expect(reponse.body.map((i: { id: number }) => i.id)).toEqual([id]);
    });

    it('refuse un site inexistant (404)', async () => {
      const { en } = demarrerApi();
      const reponse = await en(responsable).get('/sites/999/interventions');
      expect(reponse.status).toBe(404);
      expect(reponse.body.code).toBe('SITE_INTROUVABLE');
    });
  });

  describe('Filtre par statut', () => {
    it.each(['OUVERTE', 'EN_COURS', 'CLOSE'])('ne renvoie que les interventions %s', async (statut) => {
      const api = demarrerApi();
      const ouverte = await api.creer(technicienBeauce);
      const enCours = await api.creer(technicienBeauce, { dureeMinutes: 30 });
      const close = await api.creer(technicienBeauce, { dureeMinutes: 30 });
      const tech = api.en(technicienBeauce);
      await tech.post(`/interventions/${enCours}/demarrer`).expect(200);
      await tech.post(`/interventions/${close}/demarrer`).expect(200);
      await tech.post(`/interventions/${close}/cloturer`).expect(200);
      const attendu = { OUVERTE: ouverte, EN_COURS: enCours, CLOSE: close }[statut];

      const reponse = await tech.get(`${urlBeauce}?statut=${statut}`);

      expect(reponse.status).toBe(200);
      expect(reponse.body.map((i: { id: number }) => i.id)).toEqual([attendu]);
      expect(reponse.body[0].statut).toBe(statut);
    });

    it('refuse un statut inconnu (400)', async () => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).get(`${urlBeauce}?statut=TERMINEE`);
      expect(reponse.status).toBe(400);
      expect(reponse.body.code).toBe('REQUETE_INVALIDE');
    });
  });

  describe('RG-6, H8 : filtre par période, en jours entiers à l’heure de Paris, bornes incluses', () => {
    /** Interventions à cheval sur des minuits de Paris qui ne sont pas des minuits UTC. */
    async function interventionsAutourDeMinuit(api: ReturnType<typeof demarrerApi>) {
      return {
        // 31/01 23:30 à Paris = 31/01 22:30 UTC
        finJanvier: await api.creer(technicienBeauce, { dateDebut: '2026-01-31T23:30' }),
        // 01/02 00:30 à Paris = 31/01 23:30 UTC : appartient au 1er février, pas au 31 janvier
        debutFevrier: await api.creer(technicienBeauce, { dateDebut: '2026-02-01T00:30' }),
        // 01/08 01:00 à Paris (heure d'été) = 31/07 23:00 UTC
        debutAout: await api.creer(technicienBeauce, { dateDebut: '2026-08-01T01:00' }),
      };
    }

    it.each([
      ['un jour d’hiver', '2026-01-31', '2026-01-31', ['finJanvier']],
      ['le jour suivant', '2026-02-01', '2026-02-01', ['debutFevrier']],
      ['un jour d’été', '2026-08-01', '2026-08-01', ['debutAout']],
      ['plusieurs mois', '2026-01-31', '2026-08-01', ['finJanvier', 'debutFevrier', 'debutAout']],
      ['une période sans intervention', '2026-03-01', '2026-03-31', []],
    ] as const)('%s : du %s au %s', async (_cas, du, au, attendus) => {
      const api = demarrerApi();
      const ids = await interventionsAutourDeMinuit(api);

      const reponse = await api.en(technicienBeauce).get(`${urlBeauce}?du=${du}&au=${au}`);

      expect(reponse.status).toBe(200);
      expect(reponse.body.map((i: { id: number }) => i.id)).toEqual(attendus.map((nom) => ids[nom]));
    });

    it('combine période et statut', async () => {
      const api = demarrerApi();
      const { finJanvier } = await interventionsAutourDeMinuit(api);
      await api.en(technicienBeauce).post(`/interventions/${finJanvier}/demarrer`).expect(200);

      const reponse = await api.en(technicienBeauce).get(`${urlBeauce}?du=2026-01-01&au=2026-02-28&statut=EN_COURS`);

      expect(reponse.body.map((i: { id: number }) => i.id)).toEqual([finJanvier]);
    });

    it.each([
      ['une fin antérieure au début', 'du=2026-02-01&au=2026-01-31'],
      ['un début sans fin', 'du=2026-02-01'],
      ['une fin sans début', 'au=2026-02-01'],
      ['une date mal formée', 'du=01/02/2026&au=2026-02-28'],
      ['une date impossible', 'du=2026-02-30&au=2026-03-01'],
    ])('refuse %s (400)', async (_cas, requete) => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).get(`${urlBeauce}?${requete}`);
      expect(reponse.status).toBe(400);
      expect(reponse.body.code).toBe('PERIODE_INVALIDE');
    });
  });
});
