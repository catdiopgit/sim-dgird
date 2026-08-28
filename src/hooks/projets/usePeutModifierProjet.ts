import { useMembresProjet } from './useMembresProjet';
import type { Projet } from '../../services/projets/projets';

type ProjetPourDroits = Pick<Projet, 'id' | 'responsable_id' | 'entite_id' | 'cloture_statut'>;

// Miroir client (aide UX, RLS = seule barrière réelle) de app.can_modifier_projet
// (0066) : responsable, permission projets/modifier, ou membre actif
// "contributeur" (peut_modifier) — et plus rien une fois la clôture confirmée.
// Centralisé ici pour éviter que chaque page (Projet/Phase/Activité) réimplémente
// sa propre version, comme c'était le cas avant V2.
export function usePeutModifierProjet(
  projet: ProjetPourDroits | undefined | null,
  profileId: string | undefined,
  can: (moduleCode: string, actionCode: string, entiteId?: string | null) => boolean,
): boolean {
  const { data: membres } = useMembresProjet(projet?.id);

  if (!projet) return false;
  if (projet.cloture_statut === 'confirmee') return false;
  if (projet.responsable_id === profileId) return true;
  if (can('projets', 'modifier', projet.entite_id)) return true;

  return Boolean(
    membres?.some((m) => m.utilisateur_id === profileId && m.date_retrait === null && m.peut_modifier),
  );
}
