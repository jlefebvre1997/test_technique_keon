import { Router } from 'express';
import type { Depots } from '../../application/depots';
import { creerIntervention } from '../../application/interventions/creer-intervention';
import { utilisateurCourant } from './identification';
import { interventionVersJson } from './presentation';
import { corpsCreation } from './schemas';

export function routesInterventions(depots: Depots): Router {
  const routes = Router();

  routes.post('/interventions', (req, res) => {
    const intervention = creerIntervention(depots, utilisateurCourant(res), corpsCreation.parse(req.body));
    res.status(201).json(interventionVersJson(intervention));
  });

  return routes;
}
