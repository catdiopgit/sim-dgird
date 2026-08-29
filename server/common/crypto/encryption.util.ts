import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Chiffrement réversible (AES-256-GCM) pour des secrets que l'app doit pouvoir
// représenter en clair à un tiers (ex: mot de passe SMTP envoyé au serveur mail) —
// à ne PAS confondre avec bcrypt (hash à sens unique, pour des mots de passe
// utilisateur qu'on vérifie mais ne relit jamais).
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("Variable d'environnement manquante : ENCRYPTION_KEY");
  return scryptSync(secret, 'sim-dgird-encryption', 32);
}

export function encrypt(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(cipherText: string): string {
  const raw = Buffer.from(cipherText, 'base64');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
