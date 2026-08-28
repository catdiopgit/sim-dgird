import {
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileWordOutlined,
} from '@ant-design/icons';
import type { ComponentType, CSSProperties } from 'react';

export type CategorieFichier = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image' | 'autre';

export interface InfosTypeFichier {
  categorie: CategorieFichier;
  icone: ComponentType<{ style?: CSSProperties }>;
  couleur: string;
  libelle: string;
}

const EXTENSIONS: Record<string, CategorieFichier> = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  odt: 'word',
  xls: 'excel',
  xlsx: 'excel',
  ods: 'excel',
  csv: 'excel',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  odp: 'powerpoint',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
};

function extensionDe(nomFichier: string | null | undefined): string | null {
  if (!nomFichier) return null;
  const idx = nomFichier.lastIndexOf('.');
  if (idx === -1 || idx === nomFichier.length - 1) return null;
  return nomFichier.slice(idx + 1).toLowerCase();
}

function categorieDepuisMime(typeMime: string | null | undefined): CategorieFichier | null {
  if (!typeMime) return null;
  if (typeMime === 'application/pdf') return 'pdf';
  if (typeMime.startsWith('image/')) return 'image';
  if (typeMime.includes('word') || typeMime === 'application/msword') return 'word';
  if (typeMime.includes('sheet') || typeMime === 'application/vnd.ms-excel' || typeMime === 'text/csv') return 'excel';
  if (typeMime.includes('presentation') || typeMime === 'application/vnd.ms-powerpoint') return 'powerpoint';
  return null;
}

const CATALOGUE: Record<CategorieFichier, { icone: ComponentType<{ style?: CSSProperties }>; couleur: string; libelle: string }> = {
  pdf: { icone: FilePdfOutlined, couleur: '#d4380d', libelle: 'PDF' },
  word: { icone: FileWordOutlined, couleur: '#1d4ed8', libelle: 'Word' },
  excel: { icone: FileExcelOutlined, couleur: '#15803d', libelle: 'Excel' },
  powerpoint: { icone: FilePptOutlined, couleur: '#c2410c', libelle: 'PowerPoint' },
  image: { icone: FileImageOutlined, couleur: '#7c3aed', libelle: 'Image' },
  autre: { icone: FileOutlined, couleur: '#64748b', libelle: 'Fichier' },
};

// Détermine la catégorie d'un fichier à partir de son type MIME (priorité) ou,
// à défaut, de son extension — sert à choisir l'icône affichée sur les cartes
// document et le mode de prévisualisation (PDF/image intégrés, sinon repli
// fiche + téléchargement, cf. Refonte de la page Archives §4 et §6).
export function getInfosTypeFichier(
  typeMime: string | null | undefined,
  nomFichier: string | null | undefined,
): InfosTypeFichier {
  const categorie = categorieDepuisMime(typeMime) ?? EXTENSIONS[extensionDe(nomFichier) ?? ''] ?? 'autre';
  return { categorie, ...CATALOGUE[categorie] };
}

export function formatTailleFichier(octets: number | null | undefined): string {
  if (!octets) return '—';
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}
