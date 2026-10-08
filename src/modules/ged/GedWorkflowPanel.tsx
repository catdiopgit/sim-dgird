import { WorkflowPanel } from '../../components/workflow/WorkflowPanel';
import {
  useExecuterTransitionVersement,
  useTransitionsDisponiblesVersement,
  useWorkflowHistorique,
  useWorkflowInstance,
} from '../../hooks/ged/useWorkflowGed';
import type { GedVersement } from '../../services/ged/versements';

interface Props {
  versement: GedVersement;
  organisationId: string;
}

export function GedWorkflowPanel({ versement, organisationId }: Props) {
  const { data: instance, isLoading: chargementInstance } = useWorkflowInstance(versement.id);
  const { data: historique, isLoading: chargementHistorique } = useWorkflowHistorique(versement.id);
  const { data: transitions, isLoading } = useTransitionsDisponiblesVersement(versement.id);
  const executer = useExecuterTransitionVersement(versement.id);

  return (
    <WorkflowPanel
      titre="Circuit de validation"
      organisationId={organisationId}
      instance={instance}
      historique={historique}
      chargement={chargementInstance || chargementHistorique}
      etapeLibelle={versement.etape_libelle}
      transitions={transitions}
      chargementTransitions={isLoading}
      enExecution={executer.isPending}
      onExecuter={(transitionId, commentaire) => executer.mutate({ transitionId, commentaire })}
    />
  );
}
