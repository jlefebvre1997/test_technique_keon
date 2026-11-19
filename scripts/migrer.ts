import { config } from '../src/config';
import { ouvrirBase } from '../src/infrastructure/persistance/client';

ouvrirBase(config.fichierBase);
console.log(`Migrations appliquées sur ${config.fichierBase}`);
