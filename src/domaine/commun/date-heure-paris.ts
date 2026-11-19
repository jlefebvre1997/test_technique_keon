import { DateTime, IANAZone } from 'luxon';
import { ErreurMetier } from './erreurs';

/** RG-6 : les dates sont saisies et affichées en heure de Paris. */
export const ZONE_PARIS = IANAZone.create('Europe/Paris');

const FORMAT_SAISIE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const FORMAT_STOCKAGE = "yyyy-MM-dd'T'HH:mm:ss'Z'";
const TROIS_HEURES_MS = 3 * 60 * 60 * 1000;

/**
 * Un instant, saisi et restitué en heure de Paris, stocké en UTC.
 * - Une heure inexistante (passage à l'heure d'été) est refusée.
 * - Une heure ambiguë (passage à l'heure d'hiver) est interprétée comme sa première occurrence.
 */
export class DateHeureParis {
  private constructor(private readonly instantUtc: DateTime<true>) {}

  /** Saisie au format AAAA-MM-JJTHH:MM[:SS], heure locale de Paris, sans décalage. */
  static depuisSaisie(valeur: string): DateHeureParis {
    const murale = FORMAT_SAISIE.test(valeur) ? DateTime.fromISO(valeur, { zone: 'utc' }) : undefined;
    if (!murale?.isValid) {
      throw new ErreurMetier(
        'DATE_INVALIDE',
        `Date « ${valeur} » invalide : format attendu AAAA-MM-JJTHH:MM, en heure de Paris, sans décalage.`,
      );
    }
    // Instants UTC dont l'heure à Paris correspond à l'heure saisie : 0 (heure inexistante), 1 ou 2 (heure ambiguë).
    const muraleMs = murale.toMillis();
    const decalages = new Set([ZONE_PARIS.offset(muraleMs - TROIS_HEURES_MS), ZONE_PARIS.offset(muraleMs + TROIS_HEURES_MS)]);
    const candidats = [...decalages]
      .map((decalage) => muraleMs - decalage * 60_000)
      .filter((instant) => ZONE_PARIS.offset(instant) * 60_000 === muraleMs - instant)
      .sort((a, b) => a - b);
    const premier = candidats[0];
    if (premier === undefined) {
      throw new ErreurMetier(
        'DATE_INVALIDE',
        `Date « ${valeur} » invalide : cette heure n'existe pas à Paris (passage à l'heure d'été).`,
      );
    }
    return new DateHeureParis(DateTime.fromMillis(premier, { zone: 'utc' }) as DateTime<true>);
  }

  static depuisStockage(valeur: string): DateHeureParis {
    const instant = DateTime.fromISO(valeur, { zone: 'utc' });
    if (!instant.isValid) throw new Error(`Date stockée invalide : ${valeur}`);
    return new DateHeureParis(instant);
  }

  static maintenant(): DateHeureParis {
    return new DateHeureParis(DateTime.utc().startOf('second'));
  }

  /** ISO 8601 UTC à largeur fixe : 2026-03-29T08:30:00Z. */
  versStockage(): string {
    return this.instantUtc.toFormat(FORMAT_STOCKAGE);
  }

  /** ISO 8601 avec le décalage de Paris : 2026-03-29T10:30:00+02:00. */
  versAffichage(): string {
    return this.instantUtc.setZone(ZONE_PARIS).toISO({ suppressMilliseconds: true }) as string;
  }

  /** Format lu nativement par Excel en français : 29/03/2026 10:30. */
  versAffichageCsv(): string {
    return this.instantUtc.setZone(ZONE_PARIS).toFormat('dd/MM/yyyy HH:mm');
  }
}
