import { isValidHex } from './color';

// valeurs_listes.couleur contient des noms de préréglages antd (Tag color) :
// 'default', 'blue', 'gold'… ou un code hex. Hors antd, on les traduit vers
// les tokens de statut du design (src/index.css) pour rester cohérent en
// clair comme en sombre ; 'default' n'est pas une couleur CSS valide.
const PRESETS: Record<string, string> = {
  default: 'var(--st-neutral)',
  blue: 'var(--st-info)',
  geekblue: 'var(--st-info)',
  processing: 'var(--st-info)',
  green: 'var(--st-good)',
  success: 'var(--st-good)',
  red: 'var(--st-crit)',
  volcano: 'var(--st-crit)',
  error: 'var(--st-crit)',
  orange: 'var(--st-warn)',
  gold: 'var(--st-warn)',
  warning: 'var(--st-warn)',
  purple: '#7a5af5',
  magenta: '#d55181',
  cyan: '#13a8a8',
  lime: '#7cb305',
};

export function couleurReferentiel(couleur: string | null | undefined): string | undefined {
  if (!couleur) return undefined;
  if (isValidHex(couleur)) return couleur;
  return PRESETS[couleur];
}
