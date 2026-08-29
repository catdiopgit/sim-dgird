import * as path from 'node:path';

// Racine de stockage des fichiers (pièces jointes/décharges courrier) — doit être
// HORS du dossier de déploiement sur le VPS cible (décision d, MIGRATION.md :
// disque local, pas de MinIO/S3) pour ne jamais risquer de perdre les fichiers à
// un redéploiement qui remplace dist-server/. STORAGE_ROOT doit donc être défini
// explicitement en production (chemin absolu). En local, défaut : ./storage à la
// racine du dépôt (hors dist-server/, à exclure du contrôle de version).
export function getStorageRoot(): string {
  const configured = process.env.STORAGE_ROOT;
  if (configured) return path.resolve(configured);
  return path.resolve(__dirname, '../../storage');
}
