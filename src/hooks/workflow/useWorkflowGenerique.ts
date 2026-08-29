import { useQuery } from '@tanstack/react-query';
import { listWorkflowEtapes } from '../../services/workflow/generique';

// useWorkflowInstance/useWorkflowHistorique génériques par id d'instance ont
// été retirés (Phase 8) : le backend n'expose plus de route par id
// d'instance/historique, seulement scopée par objet porteur — voir
// hooks/courrier/useWorkflow.ts, hooks/ged/useWorkflowGed.ts,
// hooks/missions/useWorkflowMission.ts pour les équivalents par module.
export function useWorkflowEtapes(workflowDefinitionId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-etapes', workflowDefinitionId],
    queryFn: () => listWorkflowEtapes(workflowDefinitionId!),
    enabled: Boolean(workflowDefinitionId),
    staleTime: 5 * 60_000,
  });
}
