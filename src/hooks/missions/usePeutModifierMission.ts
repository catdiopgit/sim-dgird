import type { Mission } from '../../services/missions/missions';

type MissionPourDroits = Pick<Mission, 'id' | 'responsable_id' | 'entite_id'>;

// Miroir client (aide UX, RLS = seule barrière réelle) de
// app.can_modifier_mission (0077) : responsable ou permission missions/modifier.
export function usePeutModifierMission(
  mission: MissionPourDroits | undefined | null,
  profileId: string | undefined,
  can: (moduleCode: string, actionCode: string, entiteId?: string | null) => boolean,
): boolean {
  if (!mission) return false;
  if (mission.responsable_id === profileId) return true;
  return can('missions', 'modifier', mission.entite_id);
}
