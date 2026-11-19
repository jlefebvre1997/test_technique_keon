import { Router } from 'express';
import type { Depots } from '../../application/depots';
import { cloturerIntervention } from '../../application/interventions/cloturer-intervention';
import { creerIntervention } from '../../application/interventions/creer-intervention';
import { demarrerIntervention } from '../../application/interventions/demarrer-intervention';
import { listerInterventions } from '../../application/interventions/lister-interventions';
import { utilisateurCourant } from './identification';
import { interventionVersJson } from './presentation';
import { corpsCreation, filtresListe, parametresIntervention, parametresSite } from './schemas';

export function routesInterventions(depots: Depots): Router {
  const routes = Router();

  routes.post('/interventions', (req, res) => {
    const intervention = creerIntervention(depots, utilisateurCourant(res), corpsCreation.parse(req.body));
    res.status(201).json(interventionVersJson(intervention));
  });

  routes.post('/interventions/:id/demarrer', (req, res) => {
    const { id } = parametresIntervention.parse(req.params);
    res.json(interventionVersJson(demarrerIntervention(depots, utilisateurCourant(res), id)));
  });

  routes.post('/interventions/:id/cloturer', (req, res) => {
    const { id } = parametresIntervention.parse(req.params);
    res.json(interventionVersJson(cloturerIntervention(depots, utilisateurCourant(res), id)));
  });

  routes.get('/sites/:siteId/interventions', (req, res) => {
    const { siteId } = parametresSite.parse(req.params);
    const interventions = listerInterventions(depots, utilisateurCourant(res), siteId, filtresListe.parse(req.query));
    res.json(interventions.map(interventionVersJson));
  });

  return routes;
}
