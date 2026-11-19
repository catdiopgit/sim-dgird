import { BadRequestException } from '@nestjs/common';
import * as path from 'node:path';

// v8.6.6 — liste blanche des fichiers acceptés au téléversement. Tout le
// reste (exécutables, scripts, pages HTML, SVG…) est refusé. Pour les PDF et
// les images, le début du fichier doit correspondre à son type annoncé.
const DOCUMENTS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
  '.rtf', '.txt', '.csv', '.zip', '.msg', '.eml',
]);
const IMAGES = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tif', '.tiff', '.bmp']);

const signatures: Record<string, (b: Buffer) => boolean> = {
  '.pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  '.png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  '.jpg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  '.jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  '.gif': (b) => b.subarray(0, 4).toString('latin1') === 'GIF8',
  '.webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  '.zip': (b) => b[0] === 0x50 && b[1] === 0x4b,
  '.docx': (b) => b[0] === 0x50 && b[1] === 0x4b,
  '.xlsx': (b) => b[0] === 0x50 && b[1] === 0x4b,
  '.pptx': (b) => b[0] === 0x50 && b[1] === 0x4b,
};

export interface FichierAValider {
  originalname: string;
  buffer: Buffer;
  size?: number;
}

export function validerFichier(fichier: FichierAValider | undefined, options: { imagesSeulement?: boolean } = {}): void {
  if (!fichier) return;
  const extension = path.extname(fichier.originalname || '').toLowerCase();
  const autorises = options.imagesSeulement ? IMAGES : new Set([...DOCUMENTS, ...IMAGES]);
  if (!extension || !autorises.has(extension)) {
    throw new BadRequestException(
      options.imagesSeulement
        ? 'Format non accepté : choisissez une image PNG, JPG, GIF ou WEBP'
        : `Format de fichier non accepté (${extension || 'sans extension'}). Formats acceptés : PDF, images, Word, Excel, PowerPoint, OpenDocument, texte, CSV, ZIP`,
    );
  }
  if (!fichier.buffer || fichier.buffer.length === 0) throw new BadRequestException('Le fichier est vide');
  const signature = signatures[extension];
  if (signature && !signature(fichier.buffer)) {
    throw new BadRequestException(`Le contenu du fichier ne correspond pas à son extension ${extension}`);
  }
}
