import { describe, expect, it } from 'vitest';
import { demarrerApi, EQUIPEMENTS, SITES, UTILISATEURS } from './outils';

const { technicienBeauce, technicienPicardie, responsable } = UTILISATEURS;
const urlBeauce = `/sites/${SITES.beauce.id}/interventions`;

describe('PATCH /interventions/:id : modifier une intervention non close', () => {
  it('H3 : modifie la date de début, la durée et la description', async () => {
    const api = demarrerApi();
    const id = await api.creer(technicienBeauce);

    const reponse = await api.en(technicienBeauce).patch(`/interventions/${id}`, {
      dateDebut: '2026-07-01T14:00',
      dureeMinutes: 45,
      description: 'Remplacement du joint et contrôle de l’agitateur',
    });

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({
      id,
      dateDebut: '2026-07-01T14:00:00+02:00',
      dureeMinutes: 45,
      description: 'Remplacement du joint et contrôle de l’agitateur',
      statut: 'OUVERTE',
    });
    const liste = await api.en(technicienBeauce).get(urlBeauce);
    expect(liste.body).toEqual([reponse.body]);
  });

  it('ne modifie que les champs fournis', async () => {
    const api = demarrerApi();
    const id = await api.creer(technicienBeauce, { dureeMinutes: 30 });

    const reponse = await api.en(technicienBeauce).patch(`/interventions/${id}`, { description: 'Nouvelle description' });

    expect(reponse.body).toMatchObject({
      description: 'Nouvelle description',
      dureeMinutes: 30,
      dateDebut: '2026-01-15T10:30:00+01:00',
    });
  });

  it('H3, RG-3 : renseigne la durée d’une intervention EN_COURS, qui peut alors être clôturée', async () => {
    const api = demarrerApi();
    const id = await api.creer(technicienBeauce);
    const tech = api.en(technicienBeauce);
    await tech.post(`/interventions/${id}/demarrer`).expect(200);
    expect((await tech.post(`/interventions/${id}/cloturer`)).body.code).toBe('DUREE_REQUISE');

    await tech.patch(`/interventions/${id}`, { dureeMinutes: 50 }).expect(200);
    const cloture = await tech.post(`/interventions/${id}/cloturer`);

    expect(cloture.status).toBe(200);
    expect(cloture.body).toMatchObject({ statut: 'CLOSE', dureeMinutes: 50 });
  });

  it('efface la durée d’une intervention non close', async () => {
    const api = demarrerApi();
    const id = await api.creer(technicienBeauce, { dureeMinutes: 30 });

    const reponse = await api.en(technicienBeauce).patch(`/interventions/${id}`, { dureeMinutes: null });

    expect(reponse.status).toBe(200);
    expect(reponse.body.dureeMinutes).toBeNull();
  });

  describe('RG-4 : une intervention close ne peut plus être modifiée', () => {
    it.each([
      ['le technicien', technicienBeauce, { description: 'Modification tardive' }],
      ['le responsable', responsable, { description: 'Modification tardive' }],
      ['le responsable, même pour la seule durée', responsable, { dureeMinutes: 90 }],
    ])('refuse la modification par %s (409), rien ne change', async (_cas, utilisateur, corps) => {
      const api = demarrerApi();
      const id = await api.creer(technicienBeauce, { dureeMinutes: 30 });
      await api.en(technicienBeauce).post(`/interventions/${id}/demarrer`).expect(200);
      const close = await api.en(technicienBeauce).post(`/interventions/${id}/cloturer`).expect(200);

      const reponse = await api.en(utilisateur).patch(`/interventions/${id}`, corps);

      expect(reponse.status).toBe(409);
      expect(reponse.body.code).toBe('INTERVENTION_CLOSE');
      const liste = await api.en(responsable).get(urlBeauce);
      expect(liste.body).toEqual([close.body]);
    });
  });

  describe('RG-2 : périmètre des sites', () => {
    it("refuse qu'un technicien modifie une intervention d'un autre site (403)", async () => {
      const api = demarrerApi();
      const id = await api.creer(technicienPicardie, {
        siteId: SITES.picardie.id,
        equipementId: EQUIPEMENTS.digesteurPicardie.id,
      });

      const reponse = await api.en(technicienBeauce).patch(`/interventions/${id}`, { description: 'Intrusion' });

      expect(reponse.status).toBe(403);
      expect(reponse.body.code).toBe('ACCES_SITE_REFUSE');
    });

    it('le responsable modifie une intervention de n’importe quel site', async () => {
      const api = demarrerApi();
      const id = await api.creer(technicienPicardie, {
        siteId: SITES.picardie.id,
        equipementId: EQUIPEMENTS.digesteurPicardie.id,
      });

      const reponse = await api.en(responsable).patch(`/interventions/${id}`, { dureeMinutes: 20 });

      expect(reponse.status).toBe(200);
      expect(reponse.body.dureeMinutes).toBe(20);
    });
  });

  describe('Validation', () => {
    it.each([
      ['le site', { siteId: SITES.picardie.id }],
      ['l’équipement', { equipementId: EQUIPEMENTS.cogenerationBeauce.id }],
      ['le technicien', { technicienId: technicienPicardie.id }],
      ['le statut', { statut: 'CLOSE' }],
    ])('refuse de modifier %s, fixé à la création ou piloté par les actions (400)', async (_cas, corps) => {
      const api = demarrerApi();
      const id = await api.creer(technicienBeauce);
      const reponse = await api.en(responsable).patch(`/interventions/${id}`, corps);
      expect(reponse.status).toBe(400);
      expect(reponse.body.code).toBe('REQUETE_INVALIDE');
    });

    it('refuse une modification vide (400)', async () => {
      const api = demarrerApi();
      const id = await api.creer(technicienBeauce);
      const reponse = await api.en(technicienBeauce).patch(`/interventions/${id}`, {});
      expect(reponse.status).toBe(400);
      expect(reponse.body.code).toBe('REQUETE_INVALIDE');
    });

    it.each([
      ['RG-6 : une heure inexistante à Paris', { dateDebut: '2026-03-29T02:30' }, 'DATE_INVALIDE'],
      ['H7 : une durée nulle', { dureeMinutes: 0 }, 'DUREE_INVALIDE'],
      ['une description vide', { description: '  ' }, 'DESCRIPTION_REQUISE'],
    ])('refuse %s (400)', async (_cas, corps, code) => {
      const api = demarrerApi();
      const id = await api.creer(technicienBeauce);
      const reponse = await api.en(technicienBeauce).patch(`/interventions/${id}`, corps);
      expect(reponse.status).toBe(400);
      expect(reponse.body.code).toBe(code);
    });

    it('refuse une intervention inexistante (404)', async () => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).patch('/interventions/999', { description: 'Rien' });
      expect(reponse.status).toBe(404);
      expect(reponse.body.code).toBe('INTERVENTION_INTROUVABLE');
    });
  });
});
