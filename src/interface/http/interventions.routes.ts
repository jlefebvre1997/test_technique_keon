import { Router } from 'express';
import type { Depots } from '../../application/depots';
import { creerIntervention } from '../../application/interventions/creer-intervention';
import { demarrerIntervention } from '../../application/interventions/demarrer-intervention';
import { utilisateurCourant } from './identification';
import { interventionVersJson } from './presentation';
import { corpsCreation, parametresIntervention } from './schemas';

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

  return routes;
}
