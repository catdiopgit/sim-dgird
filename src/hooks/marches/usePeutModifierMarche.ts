import type { AccesMarches, Marche } from '../../services/marches/marches';

type MarchePourDroits = Pick<Marche, 'statut_cloture'>;

// Miroir client (aide UX, l'autorité réelle reste MarchesService.canModifier) :
// recette 2026-11, seuls les membres de la cellule de passation des marchés
// agissent sur un marché — plus rien une fois le marché clôturé.
export function usePeutModifierMarche(marche: MarchePourDroits | undefined | null, acces: AccesMarches | undefined): boolean {
  if (!marche || !acces) return false;
  if (marche.statut_cloture === 'cloture') return false;
  return acces.membre;
}
