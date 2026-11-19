import request from 'supertest';
import { ouvrirBase } from '../../src/infrastructure/persistance/client';
import { chargerReferentielDemo } from '../../src/infrastructure/persistance/referentiel-demo';
import { EQUIPEMENTS, SITES } from '../../src/infrastructure/persistance/referentiel-demo';
import { creerApp } from '../../src/interface/http/app';

export { EQUIPEMENTS, SITES, UTILISATEURS } from '../../src/infrastructure/persistance/referentiel-demo';

/** Corps de création valide : technicien de la Beauce, sur le digesteur de la Beauce. */
export const nouvelleIntervention = (surcharge: object = {}) => ({
  siteId: SITES.beauce.id,
  equipementId: EQUIPEMENTS.digesteurBeauce.id,
  dateDebut: '2026-01-15T10:30',
  description: 'Remplacement du joint de la trappe de visite',
  ...surcharge,
});

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

  /** Crée une intervention via l'API et renvoie son identifiant. */
  const creer = async (utilisateur: { id: number }, surcharge: object = {}): Promise<number> => {
    const reponse = await en(utilisateur).post('/interventions', nouvelleIntervention(surcharge));
    if (reponse.status !== 201) throw new Error(`Création impossible : ${JSON.stringify(reponse.body)}`);
    return reponse.body.id;
  };

  return { app, en, creer };
}
