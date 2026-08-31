import type { Marche } from '../../services/marches/marches';

type MarchePourDroits = Pick<Marche, 'responsable_id' | 'entite_id' | 'statut_cloture'>;

// Miroir client (aide UX, l'autorité réelle reste server/marches/marches.service.ts
// MarchesService.canModifier) : responsable du marché ou permission marches/modifier
// sur l'entité porteuse — plus rien une fois le marché clôturé.
export function usePeutModifierMarche(
  marche: MarchePourDroits | undefined | null,
  profileId: string | undefined,
  can: (moduleCode: string, actionCode: string, entiteId?: string | null) => boolean,
): boolean {
  if (!marche) return false;
  if (marche.statut_cloture === 'cloture') return false;
  if (marche.responsable_id === profileId) return true;
  return can('marches', 'modifier', marche.entite_id);
}
