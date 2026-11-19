import { stringify } from 'csv-stringify/sync';
import type { LigneExport } from '../../application/interventions/exporter-interventions';
import type { Site } from '../../domaine/referentiel/referentiel';

const COLONNES = [
  'Référence',
  'Code site',
  'Site',
  'Code équipement',
  'Équipement',
  'Matricule technicien',
  'Technicien',
  'Date de début',
  'Durée (minutes)',
  'Statut',
  'Description',
] as const;

/**
 * H9 : CSV destiné à Excel en français. Séparateur « ; », UTF-8 avec BOM, fins de ligne CRLF,
 * dates en heure de Paris (JJ/MM/AAAA HH:MM), durée en minutes.
 */
export function exportVersCsv(site: Site, lignes: LigneExport[]): string {
  return stringify(
    lignes.map(({ intervention: i, equipement, technicien }) => [
      i.id,
      site.code,
      site.nom,
      equipement.code,
      equipement.libelle,
      technicien.matricule,
      `${technicien.prenom} ${technicien.nom}`,
      i.dateDebut.versAffichageCsv(),
      i.dureeMinutes ?? '',
      i.statut,
      neutraliserFormule(i.description),
    ]),
    { header: true, columns: [...COLONNES], delimiter: ';', record_delimiter: '\r\n', bom: true },
  );
}

/** Empêche Excel d'interpréter un texte libre comme une formule (CSV injection). */
function neutraliserFormule(texte: string): string {
  return /^[=+\-@\t\r]/.test(texte) ? `'${texte}` : texte;
}
