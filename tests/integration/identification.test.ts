import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { demarrerApi, SITES, UTILISATEURS } from './outils';

describe('Identification de l’utilisateur', () => {
  const url = `/sites/${SITES.beauce.id}/interventions`;

  it('refuse une requête sans en-tête X-Utilisateur-Id (401)', async () => {
    const { app } = demarrerApi();
    const reponse = await request(app).get(url);
    expect(reponse.status).toBe(401);
    expect(reponse.body.code).toBe('NON_IDENTIFIE');
  });

  it('refuse un utilisateur inconnu (401)', async () => {
    const { app } = demarrerApi();
    const reponse = await request(app).get(url).set('X-Utilisateur-Id', '999');
    expect(reponse.status).toBe(401);
    expect(reponse.body.code).toBe('NON_IDENTIFIE');
  });

  it('laisse passer un utilisateur connu', async () => {
    const { en } = demarrerApi();
    const reponse = await en(UTILISATEURS.technicienBeauce).get('/route-inexistante');
    expect(reponse.status).toBe(404);
    expect(reponse.body.code).toBe('ROUTE_INCONNUE');
  });
});
