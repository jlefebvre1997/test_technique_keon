import { DateTime } from 'luxon';
import { DateHeureParis, ZONE_PARIS } from './date-heure-paris';
import { ErreurMetier } from './erreurs';

const FORMAT_JOUR = /^\d{4}-\d{2}-\d{2}$/;

/**
 * H8 : période en jours entiers, à l'heure de Paris, bornes incluses.
 * Représentée par l'intervalle [minuit du premier jour ; minuit du lendemain du dernier jour[.
 */
export class Periode {
  private constructor(
    readonly debut: DateHeureParis,
    readonly finExclue: DateHeureParis,
  ) {}

  /** `du` et `au` au format AAAA-MM-JJ. */
  static depuisSaisie(du: string, au: string): Periode {
    const premierJour = minuitAParis(du);
    const dernierJour = minuitAParis(au);
    if (dernierJour < premierJour) {
      throw new ErreurMetier('PERIODE_INVALIDE', `Période invalide : le ${au} est antérieur au ${du}.`);
    }
    return new Periode(DateHeureParis.depuisInstant(premierJour), DateHeureParis.depuisInstant(dernierJour.plus({ days: 1 })));
  }

  /** Les deux bornes vont ensemble : aucune période si elles sont absentes toutes les deux. */
  static optionnelle(du: string | undefined, au: string | undefined): Periode | undefined {
    if (du === undefined && au === undefined) return undefined;
    if (du === undefined || au === undefined) {
      throw new ErreurMetier('PERIODE_INVALIDE', 'Une période se définit par ses deux bornes : du et au.');
    }
    return Periode.depuisSaisie(du, au);
  }
}

function minuitAParis(jour: string): DateTime<true> {
  const date = FORMAT_JOUR.test(jour) ? DateTime.fromISO(jour, { zone: ZONE_PARIS }) : undefined;
  if (!date?.isValid) {
    throw new ErreurMetier('PERIODE_INVALIDE', `Date « ${jour} » invalide : format attendu AAAA-MM-JJ.`);
  }
  return date.startOf('day');
}
