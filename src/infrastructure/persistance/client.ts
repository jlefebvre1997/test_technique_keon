import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type BaseDeDonnees = BetterSQLite3Database<typeof schema>;

const DOSSIER_MIGRATIONS = fileURLToPath(new URL('../../../drizzle', import.meta.url));

/** Ouvre la base (fichier ou ':memory:') et applique les migrations. */
export function ouvrirBase(fichier: string): BaseDeDonnees {
  if (fichier !== ':memory:') mkdirSync(dirname(fichier), { recursive: true });
  const sqlite = new Database(fichier);
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: DOSSIER_MIGRATIONS });
  return db;
}
