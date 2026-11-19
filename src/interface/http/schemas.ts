import { z } from 'zod';
import { STATUTS } from '../../domaine/maintenance/intervention.machine';

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

export const parametresIntervention = z.object({ id: z.coerce.number().int().positive() });

export const parametresSite = z.object({ siteId: z.coerce.number().int().positive() });

export const filtresListe = z.strictObject({
  statut: z.enum(STATUTS).optional(),
  du: z.string().optional(),
  au: z.string().optional(),
});

export const periodeExport = z.strictObject({
  du: z.string().optional(),
  au: z.string().optional(),
});

export const corpsCorrectionDuree = z.strictObject({ dureeMinutes: z.number() });
