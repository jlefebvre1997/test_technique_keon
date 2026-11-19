export const config = {
  port: Number(process.env.PORT ?? 3000),
  fichierBase: process.env.FICHIER_BASE ?? 'donnees/interventions.db',
};
