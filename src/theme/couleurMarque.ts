import type { ThemeMode } from '../stores/uiPreferences';
import { isValidHex, lighten } from '../utils/color';

// Couleur institutionnelle de l'organisation (organisations.couleur_primaire),
// appliquée aux tokens --primary / --ring / --chart-1 par App.tsx.
export const DEFAULT_BRAND_COLOR = '#1E5A46';

export function resolveBrandColor(couleurPrimaire?: string | null): string {
  return isValidHex(couleurPrimaire) ? couleurPrimaire : DEFAULT_BRAND_COLOR;
}

/** Couleur primaire effectivement affichée : éclaircie en mode sombre pour rester lisible. */
export function brandColorForMode(brandColor: string, mode: ThemeMode): string {
  return mode === 'dark' ? lighten(brandColor, 0.38) : brandColor;
}
