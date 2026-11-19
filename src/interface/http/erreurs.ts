import type { ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { ErreurMetier, type CodeErreur } from '../../domaine/commun/erreurs';

const STATUT_HTTP: Record<CodeErreur, number> = {
  DATE_INVALIDE: 400,
  PERIODE_INVALIDE: 400,
  DUREE_INVALIDE: 400,
  DESCRIPTION_REQUISE: 400,
  ACCES_SITE_REFUSE: 403,
  ACTION_REFUSEE: 403,
  SITE_INTROUVABLE: 404,
  INTERVENTION_INTROUVABLE: 404,
  TRANSITION_INTERDITE: 409,
  INTERVENTION_CLOSE: 409,
  INTERVENTION_NON_CLOSE: 409,
  DUREE_REQUISE: 422,
  EQUIPEMENT_HORS_SITE: 422,
  TECHNICIEN_NON_RATTACHE: 422,
};

/** Traduit les erreurs en réponses HTTP au format { code, message }. */
export const gestionErreurs: ErrorRequestHandler = (erreur, _req, res, _next) => {
  if (erreur instanceof ErreurMetier) {
    res.status(STATUT_HTTP[erreur.code]).json({ code: erreur.code, message: erreur.message });
    return;
  }
  if (erreur instanceof z.ZodError) {
    res.status(400).json({ code: 'REQUETE_INVALIDE', message: z.prettifyError(erreur) });
    return;
  }
  if (erreur?.type === 'entity.parse.failed') {
    res.status(400).json({ code: 'REQUETE_INVALIDE', message: 'Le corps de la requête doit être un JSON valide.' });
    return;
  }
  console.error(erreur);
  res.status(500).json({ code: 'ERREUR_INTERNE', message: 'Erreur interne.' });
};
