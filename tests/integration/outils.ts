import request from 'supertest';
import { ouvrirBase } from '../../src/infrastructure/persistance/client';
import { chargerReferentielDemo } from '../../src/infrastructure/persistance/referentiel-demo';
import { creerApp } from '../../src/interface/http/app';

export { EQUIPEMENTS, SITES, UTILISATEURS } from '../../src/infrastructure/persistance/referentiel-demo';

/** Application réelle sur une base SQLite en mémoire neuve, migrée, avec le référentiel de démonstration. */
export function demarrerApi() {
  const db = ouvrirBase(':memory:');
  chargerReferentielDemo(db);
  const app = creerApp(db);

  /** Requêtes émises au nom d'un utilisateur du référentiel. */
  const en = (utilisateur: { id: number }) => {
    const entete = ['X-Utilisateur-Id', String(utilisateur.id)] as const;
    return {
      get: (url: string) => request(app).get(url).set(...entete),
      post: (url: string, corps: object = {}) => request(app).post(url).set(...entete).send(corps),
      patch: (url: string, corps: object = {}) => request(app).patch(url).set(...entete).send(corps),
    };
  };

  return { app, en };
}
