import { config } from '../src/config';
import { ouvrirBase } from '../src/infrastructure/persistance/client';
import { chargerReferentielDemo } from '../src/infrastructure/persistance/referentiel-demo';

chargerReferentielDemo(ouvrirBase(config.fichierBase));
console.log(`Référentiel de démonstration chargé dans ${config.fichierBase}`);
