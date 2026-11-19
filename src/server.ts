import { config } from './config';
import { ouvrirBase } from './infrastructure/persistance/client';
import { creerApp } from './interface/http/app';

const app = creerApp(ouvrirBase(config.fichierBase));
app.listen(config.port, () => {
  console.log(`API de suivi des interventions : http://localhost:${config.port}`);
});
