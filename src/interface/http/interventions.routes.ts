import { Router } from 'express';
import type { Depots } from '../../application/depots';
import { cloturerIntervention } from '../../application/interventions/cloturer-intervention';
import { creerIntervention } from '../../application/interventions/creer-intervention';
import { exporterInterventions } from '../../application/interventions/exporter-interventions';
import { demarrerIntervention } from '../../application/interventions/demarrer-intervention';
import { listerInterventions } from '../../application/interventions/lister-interventions';
import { utilisateurCourant } from './identification';
import { interventionVersJson } from './presentation';
import { exportVersCsv } from './export-csv';
import { corpsCreation, filtresListe, parametresIntervention, parametresSite, periodeExport } from './schemas';

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

  routes.get('/sites/:siteId/interventions/export.csv', (req, res) => {
    const { siteId } = parametresSite.parse(req.params);
    const periode = periodeExport.parse(req.query);
    const { site, lignes } = exporterInterventions(depots, utilisateurCourant(res), siteId, periode);
    res
      .attachment(`interventions-${site.code}-${periode.du}-${periode.au}.csv`)
      .type('text/csv; charset=utf-8')
      .send(exportVersCsv(site, lignes));
  });

  return routes;
}
