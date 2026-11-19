import { z } from 'zod';

// Contrôle de forme uniquement : les règles métier (durée positive, date en heure de Paris,
// description non vide…) sont vérifiées par le domaine, qui renvoie un code d'erreur stable.

const identifiant = z.number().int().positive();

export const corpsCreation = z.strictObject({
  siteId: identifiant,
  equipementId: identifiant,
  technicienId: identifiant.optional(),
  dateDebut: z.string(),
  dureeMinutes: z.number().nullable().optional(),
  description: z.string(),
});
