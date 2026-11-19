import express from 'express';
import type { BaseDeDonnees } from '../../infrastructure/persistance/client';
import { DepotInterventionsDrizzle } from '../../infrastructure/persistance/depot-interventions.drizzle';
import { DepotReferentielDrizzle } from '../../infrastructure/persistance/depot-referentiel.drizzle';
import { gestionErreurs } from './erreurs';
import { identification } from './identification';
import { routesInterventions } from './interventions.routes';

/** Assemble l'application. Sans écoute réseau, pour être testée avec supertest. */
export function creerApp(db: BaseDeDonnees) {
  const depots = {
    interventions: new DepotInterventionsDrizzle(db),
    referentiel: new DepotReferentielDrizzle(db),
  };

  const app = express();
  app.use(express.json());
  app.use(identification(depots.referentiel));
  app.use(routesInterventions(depots));
  app.use((_req, res) => {
    res.status(404).json({ code: 'ROUTE_INCONNUE', message: 'Route inconnue.' });
  });
  app.use(gestionErreurs);
  return app;
}
