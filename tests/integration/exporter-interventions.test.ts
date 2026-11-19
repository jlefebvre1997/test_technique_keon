import { describe, expect, it } from 'vitest';
import { demarrerApi, EQUIPEMENTS, SITES, UTILISATEURS } from './outils';

const { technicienBeauce, technicienPicardie, responsable } = UTILISATEURS;
const urlBeauce = `/sites/${SITES.beauce.id}/interventions/export.csv`;
const surPicardie = { siteId: SITES.picardie.id, equipementId: EQUIPEMENTS.digesteurPicardie.id };

const BOM = '﻿';
const ENTETE =
  'Référence;Code site;Site;Code équipement;Équipement;Matricule technicien;Technicien;Date de début;Durée (minutes);Statut;Description';

/** Lignes de données du CSV, sans BOM ni en-tête. */
const lignes = (csv: string) => csv.replace(BOM, '').split('\r\n').slice(1).filter(Boolean);

describe('GET /sites/:siteId/interventions/export.csv : export CSV pour le contrôle de gestion', () => {
  it('RG-7, H9 : exporte les interventions du site sur la période, lisibles dans Excel', async () => {
    const api = demarrerApi();
    const ete = await api.creer(technicienBeauce, {
      equipementId: EQUIPEMENTS.cogenerationBeauce.id,
      dateDebut: '2026-07-15T08:00',
      dureeMinutes: 90,
      description: 'Vidange moteur',
    });
    await api.en(technicienBeauce).post(`/interventions/${ete}/demarrer`).expect(200);
    await api.en(technicienBeauce).post(`/interventions/${ete}/cloturer`).expect(200);
    const hiver = await api.creer(technicienBeauce, { dateDebut: '2026-01-15T10:30' });
    await api.creer(technicienPicardie, { ...surPicardie, dateDebut: '2026-03-10T09:00' });

    const reponse = await api.en(technicienBeauce).get(`${urlBeauce}?du=2026-01-01&au=2026-12-31`);

    expect(reponse.status).toBe(200);
    expect(reponse.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(reponse.headers['content-disposition']).toMatch(
      /^attachment; filename="?interventions-METHA-BEAUCE-2026-01-01-2026-12-31\.csv"?$/,
    );
    expect(reponse.text).toBe(
      BOM +
        [
          ENTETE,
          `${hiver};METHA-BEAUCE;Méthanisation de la Beauce;DIGESTEUR-1;Digesteur principal;T001;Léa Martin;15/01/2026 10:30;;OUVERTE;Remplacement du joint de la trappe de visite`,
          `${ete};METHA-BEAUCE;Méthanisation de la Beauce;COGEN-1;Moteur de cogénération;T001;Léa Martin;15/07/2026 08:00;90;CLOSE;Vidange moteur`,
        ].join('\r\n') +
        '\r\n',
    );
  });

  it('exporte un fichier réduit à l’en-tête quand la période est vide', async () => {
    const { en } = demarrerApi();
    const reponse = await en(technicienBeauce).get(`${urlBeauce}?du=2026-01-01&au=2026-01-31`);
    expect(reponse.status).toBe(200);
    expect(reponse.text).toBe(`${BOM}${ENTETE}\r\n`);
  });

  it('RG-6, H8 : période en jours entiers à l’heure de Paris, dates exportées en heure de Paris', async () => {
    const api = demarrerApi();
    const finJanvier = await api.creer(technicienBeauce, { dateDebut: '2026-01-31T23:30' });
    // 01/02 00:30 à Paris = 31/01 23:30 UTC : hors du mois de janvier
    await api.creer(technicienBeauce, { dateDebut: '2026-02-01T00:30' });

    const reponse = await api.en(technicienBeauce).get(`${urlBeauce}?du=2026-01-01&au=2026-01-31`);

    const exportees = lignes(reponse.text);
    expect(exportees).toHaveLength(1);
    expect(exportees[0]).toContain(`${finJanvier};`);
    expect(exportees[0]).toContain(';31/01/2026 23:30;');
  });

  describe('H9 : texte libre', () => {
    it('échappe séparateur, guillemets et retours à la ligne', async () => {
      const api = demarrerApi();
      await api.creer(technicienBeauce, { description: 'Fuite "importante"; joint changé\nà surveiller' });

      const reponse = await api.en(technicienBeauce).get(`${urlBeauce}?du=2026-01-01&au=2026-12-31`);

      expect(reponse.text).toContain(';"Fuite ""importante""; joint changé\nà surveiller"\r\n');
    });

    it.each(['=HYPERLINK("http://exemple.test")', '+33 6 00 00 00 00', '-15 bar', '@SOMME(A1:A2)'])(
      'neutralise une formule Excel en début de texte : %s',
      async (description) => {
        const api = demarrerApi();
        await api.creer(technicienBeauce, { description });

        const reponse = await api.en(technicienBeauce).get(`${urlBeauce}?du=2026-01-01&au=2026-12-31`);

        const derniereColonne = lignes(reponse.text)[0]?.split(';').at(-1);
        expect(derniereColonne?.replace(/^"|"$/g, '').replaceAll('""', '"')).toBe(`'${description}`);
      },
    );
  });

  describe('RG-2, H10 : périmètre des sites', () => {
    it("refuse qu'un technicien exporte un site qui n'est pas le sien (403)", async () => {
      const { en } = demarrerApi();
      const reponse = await en(technicienBeauce).get(
        `/sites/${SITES.picardie.id}/interventions/export.csv?du=2026-01-01&au=2026-12-31`,
      );
      expect(reponse.status).toBe(403);
      expect(reponse.body.code).toBe('ACCES_SITE_REFUSE');
    });

    it('le responsable exporte n’importe quel site', async () => {
      const api = demarrerApi();
      const id = await api.creer(technicienPicardie, surPicardie);

      const reponse = await api
        .en(responsable)
        .get(`/sites/${SITES.picardie.id}/interventions/export.csv?du=2026-01-01&au=2026-12-31`);

      expect(reponse.status).toBe(200);
      expect(lignes(reponse.text).map((l) => l.split(';')[0])).toEqual([String(id)]);
    });

    it('refuse un site inexistant (404)', async () => {
      const { en } = demarrerApi();
      const reponse = await en(responsable).get('/sites/999/interventions/export.csv?du=2026-01-01&au=2026-12-31');
      expect(reponse.status).toBe(404);
      expect(reponse.body.code).toBe('SITE_INTROUVABLE');
    });
  });

  it.each([
    ['sans période', ''],
    ['sans fin de période', '?du=2026-01-01'],
    ['avec une période inversée', '?du=2026-02-01&au=2026-01-01'],
  ])('RG-7 : refuse un export %s (400)', async (_cas, requete) => {
    const { en } = demarrerApi();
    const reponse = await en(technicienBeauce).get(`${urlBeauce}${requete}`);
    expect(reponse.status).toBe(400);
    expect(reponse.body.code).toBe('PERIODE_INVALIDE');
  });
});
