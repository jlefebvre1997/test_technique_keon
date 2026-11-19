import { DateTime, IANAZone } from 'luxon';
import { ErreurMetier } from './erreurs';

/** RG-6 : les dates sont saisies et affichées en heure de Paris. */
export const ZONE_PARIS = IANAZone.create('Europe/Paris');

const FORMAT_SAISIE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const FORMAT_STOCKAGE = "yyyy-MM-dd'T'HH:mm:ss'Z'";

/**
 * Un instant, saisi et restitué en heure de Paris, stocké en UTC.
 * - Une heure inexistante (passage à l'heure d'été) est refusée.
 * - Une heure ambiguë (passage à l'heure d'hiver) est interprétée comme sa première occurrence.
 */
export class DateHeureParis {
  private constructor(private readonly instantUtc: DateTime<true>) {}

  /** Saisie au format AAAA-MM-JJTHH:MM[:SS], heure locale de Paris, sans décalage. */
  static depuisSaisie(valeur: string): DateHeureParis {
    const date = FORMAT_SAISIE.test(valeur) ? DateTime.fromISO(valeur, { zone: ZONE_PARIS }) : undefined;
    if (!date?.isValid) {
      throw new ErreurMetier(
        'DATE_INVALIDE',
        `Date « ${valeur} » invalide : format attendu AAAA-MM-JJTHH:MM, en heure de Paris, sans décalage.`,
      );
    }
    // Luxon décale une heure inexistante (passage à l'heure d'été) : si l'heure relue diffère de la saisie, elle n'existe pas.
    const relue = date.toFormat(valeur.length > 16 ? "yyyy-MM-dd'T'HH:mm:ss" : "yyyy-MM-dd'T'HH:mm");
    if (relue !== valeur) {
      throw new ErreurMetier(
        'DATE_INVALIDE',
        `Date « ${valeur} » invalide : cette heure n'existe pas à Paris (passage à l'heure d'été).`,
      );
    }
    // Heure ambiguë (passage à l'heure d'hiver) : Luxon prend la seconde occurrence, on retient la première.
    const premiere = date.getPossibleOffsets().reduce((a, b) => (b.toMillis() < a.toMillis() ? b : a), date);
    return new DateHeureParis(premiere.toUTC());
  }

  static depuisStockage(valeur: string): DateHeureParis {
    const instant = DateTime.fromISO(valeur, { zone: 'utc' });
    if (!instant.isValid) throw new Error(`Date stockée invalide : ${valeur}`);
    return new DateHeureParis(instant);
  }

  static depuisInstant(instant: DateTime<true>): DateHeureParis {
    return new DateHeureParis(instant.toUTC());
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
