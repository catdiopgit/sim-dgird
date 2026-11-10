import { useQuery } from '@tanstack/react-query';
import { env } from '../../config/env';
import { fetchEcheancesProchaines } from '../../services/dashboard/echeances';

export function useEcheancesProchaines(horizonJours = 30) {
  return useQuery({
    queryKey: ['echeances-prochaines', horizonJours],
    // Sans le module Missions, ses échéances (actions de mission) sont écartées.
    queryFn: async () => {
      const echeances = await fetchEcheancesProchaines(horizonJours);
      return env.missionsEnabled ? echeances : echeances.filter((e) => e.type !== 'action_mission');
    },
  });
}
