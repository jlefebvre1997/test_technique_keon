import type { RequestHandler, Response } from 'express';
import type { DepotReferentiel, Utilisateur } from '../../domaine/referentiel/referentiel';

/**
 * Identification provisoire et NON SÉCURISÉE par l'en-tête X-Utilisateur-Id (doc technique §5.3).
 * L'authentification est hors périmètre : à remplacer par le SSO de l'entreprise.
 */
export function identification(referentiel: DepotReferentiel): RequestHandler {
  return (req, res, next) => {
    const valeur = req.header('X-Utilisateur-Id') ?? '';
    const utilisateur = /^\d+$/.test(valeur) ? referentiel.trouverUtilisateur(Number(valeur)) : undefined;
    if (!utilisateur) {
      res.status(401).json({
        code: 'NON_IDENTIFIE',
        message: 'Utilisateur non identifié : en-tête X-Utilisateur-Id absent ou inconnu.',
      });
      return;
    }
    res.locals.utilisateur = utilisateur;
    next();
  };
}

export function utilisateurCourant(res: Response): Utilisateur {
  return res.locals.utilisateur as Utilisateur;
}
