/** Codes stables des refus métier. La correspondance HTTP est faite dans interface/http/erreurs.ts. */
export type CodeErreur =
  | 'ACCES_SITE_REFUSE'
  | 'ACTION_REFUSEE'
  | 'SITE_INTROUVABLE'
  | 'INTERVENTION_INTROUVABLE'
  | 'EQUIPEMENT_HORS_SITE'
  | 'TECHNICIEN_NON_RATTACHE'
  | 'DATE_INVALIDE'
  | 'PERIODE_INVALIDE'
  | 'DUREE_INVALIDE'
  | 'DESCRIPTION_REQUISE'
  | 'DUREE_REQUISE'
  | 'TRANSITION_INTERDITE'
  | 'INTERVENTION_CLOSE'
  | 'INTERVENTION_NON_CLOSE';

export class ErreurMetier extends Error {
  constructor(
    readonly code: CodeErreur,
    message: string,
  ) {
    super(message);
    this.name = 'ErreurMetier';
  }
}
