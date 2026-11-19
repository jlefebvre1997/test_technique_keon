import { describe, expect, it } from 'vitest';
import { demarrerApi, EQUIPEMENTS, SITES, UTILISATEURS } from './outils';

const { technicienBeauce, technicienPicardie, responsable } = UTILISATEURS;

const creation = (surcharge: object = {}) => ({
  siteId: SITES.beauce.id,
  equipementId: EQUIPEMENTS.digesteurBeauce.id,
  dateDebut: '2026-01-15T10:30',
  description: 'Remplacement du joint de la trappe de visite',
  ...surcharge,
});

describe('POST /interventions : créer une intervention', () => {
  it('RG-1 : crée une intervention OUVERTE, sans durée, pour le technicien qui la saisit', async () => {
    const { en } = demarrerApi();
    const reponse = await en(technicienBeauce).post('/interventions', creation());

    expect(reponse.status).toBe(201);
    expect(reponse.body).toEqual({
      id: expect.any(Number),
      siteId: SITES.beauce.id,
      equipementId: EQUIPEMENTS.digesteurBeauce.id,
      technicienId: technicienBeauce.id,
      dateDebut: '2026-01-15T10:30:00+01:00',
      dureeMinutes: null,
      description: 'Remplacement du joint de la trappe de visite',
      statut: 'OUVERTE',
    });
  });

  it('RG-1 : enregistre la durée en minutes si elle est fournie', async () => {
    const { en } = demarrerApi();
    const reponse = await en(technicienBeauce).post('/interventions', creation({ dureeMinutes: 90 }));
    expect(reponse.status).toBe(201);
    expect(reponse.body.dureeMinutes).toBe(90);
  });

  it('refuse de fixer le statut à la création', async () => {
    const { en } = demarrerApi();
    const reponse = await en(technicienBeauce).post('/interventions', creation({ statut: 'CLOSE' }));
    expect(reponse.status).toBe(400);
    expect(reponse.body.code).toBe('REQUETE_INVALIDE');
  });

  describe('RG-2 : périmètre des sites', () => {
    it("refuse qu'un technicien crée sur un site qui n'est pas le sien (403)", async () => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).post(
        '/interventions',
        creation({ siteId: SITES.picardie.id, equipementId: EQUIPEMENTS.digesteurPicardie.id }),
      );
      expect(reponse.status).toBe(403);
      expect(reponse.body.code).toBe('ACCES_SITE_REFUSE');
    });

    it('H4 : refuse qu’un technicien crée une intervention pour un autre technicien (403)', async () => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).post('/interventions', creation({ technicienId: technicienPicardie.id }));
      expect(reponse.status).toBe(403);
      expect(reponse.body.code).toBe('ACTION_REFUSEE');
    });

    it('H5 : le responsable crée sur n’importe quel site, pour un technicien rattaché à ce site', async () => {
      const { en } = demarrerApi();
      const reponse = await en(responsable).post(
        '/interventions',
        creation({
          siteId: SITES.picardie.id,
          equipementId: EQUIPEMENTS.digesteurPicardie.id,
          technicienId: technicienPicardie.id,
        }),
      );
      expect(reponse.status).toBe(201);
      expect(reponse.body.siteId).toBe(SITES.picardie.id);
      expect(reponse.body.technicienId).toBe(technicienPicardie.id);
    });

    it('H4 : refuse un technicien non rattaché au site (422)', async () => {
      const { en } = demarrerApi();
      const reponse = await en(responsable).post('/interventions', creation({ technicienId: technicienPicardie.id }));
      expect(reponse.status).toBe(422);
      expect(reponse.body.code).toBe('TECHNICIEN_NON_RATTACHE');
    });

    it('H4 : refuse une intervention affectée à un responsable plutôt qu’à un technicien (422)', async () => {
      const { en } = demarrerApi();
      const reponse = await en(responsable).post('/interventions', creation());
      expect(reponse.status).toBe(422);
      expect(reponse.body.code).toBe('TECHNICIEN_NON_RATTACHE');
    });

    it('refuse un site inexistant (404)', async () => {
      const { en } = demarrerApi();
      const reponse = await en(responsable).post(
        '/interventions',
        creation({ siteId: 999, technicienId: technicienBeauce.id }),
      );
      expect(reponse.status).toBe(404);
      expect(reponse.body.code).toBe('SITE_INTROUVABLE');
    });
  });

  describe('H13 : équipement du site', () => {
    it("refuse un équipement d'un autre site (422)", async () => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).post(
        '/interventions',
        creation({ equipementId: EQUIPEMENTS.digesteurPicardie.id }),
      );
      expect(reponse.status).toBe(422);
      expect(reponse.body.code).toBe('EQUIPEMENT_HORS_SITE');
    });

    it('refuse un équipement inexistant (422)', async () => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).post('/interventions', creation({ equipementId: 999 }));
      expect(reponse.status).toBe(422);
      expect(reponse.body.code).toBe('EQUIPEMENT_HORS_SITE');
    });
  });

  describe('RG-6 : date de début saisie et restituée en heure de Paris', () => {
    it.each([
      ['heure d’hiver', '2026-01-15T10:30', '2026-01-15T10:30:00+01:00'],
      ['heure d’été', '2026-07-15T10:30', '2026-07-15T10:30:00+02:00'],
      ['heure ambiguë du passage à l’heure d’hiver : première occurrence', '2026-10-25T02:30', '2026-10-25T02:30:00+02:00'],
    ])('%s', async (_cas, saisie, attendu) => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).post('/interventions', creation({ dateDebut: saisie }));
      expect(reponse.status).toBe(201);
      expect(reponse.body.dateDebut).toBe(attendu);
    });

    it.each([
      ['heure inexistante du passage à l’heure d’été', '2026-03-29T02:30'],
      ['date avec décalage UTC', '2026-01-15T10:30Z'],
      ['date avec décalage explicite', '2026-01-15T10:30+01:00'],
      ['date impossible', '2026-02-30T10:30'],
      ['date sans heure', '2026-01-15'],
    ])('refuse une %s (400)', async (_cas, saisie) => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).post('/interventions', creation({ dateDebut: saisie }));
      expect(reponse.status).toBe(400);
      expect(reponse.body.code).toBe('DATE_INVALIDE');
    });
  });

  describe('Validation des données', () => {
    it.each([
      ['nulle', 0],
      ['négative', -15],
      ['non entière', 1.5],
    ])('H7 : refuse une durée %s (400)', async (_cas, dureeMinutes) => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).post('/interventions', creation({ dureeMinutes }));
      expect(reponse.status).toBe(400);
      expect(reponse.body.code).toBe('DUREE_INVALIDE');
    });

    it('refuse une description vide (400)', async () => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).post('/interventions', creation({ description: '   ' }));
      expect(reponse.status).toBe(400);
      expect(reponse.body.code).toBe('DESCRIPTION_REQUISE');
    });

    it('refuse une requête incomplète (400)', async () => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).post('/interventions', { siteId: SITES.beauce.id });
      expect(reponse.status).toBe(400);
      expect(reponse.body.code).toBe('REQUETE_INVALIDE');
    });
  });
});
