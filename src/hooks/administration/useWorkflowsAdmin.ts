import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  createWorkflowActeur,
  createWorkflowDefinition,
  createWorkflowEtape,
  createWorkflowTransition,
  creerAssociation,
  definirWorkflowDefinitionDefaut,
  deleteWorkflowActeur,
  deleteWorkflowDefinition,
  deleteWorkflowEtape,
  deleteWorkflowTransition,
  listWorkflowActeurs,
  listWorkflowDefinitionAssociations,
  listWorkflowDefinitions,
  listWorkflowEtapes,
  listWorkflowTransitions,
  retirerAssociation,
  updateWorkflowDefinition,
  updateWorkflowEtape,
  updateWorkflowTransition,
  type WorkflowActeurInsert,
  type WorkflowDefinitionAssociationInsert,
  type WorkflowDefinitionInsert,
  type WorkflowDefinitionUpdate,
  type WorkflowEtapeInsert,
  type WorkflowEtapeUpdate,
  type WorkflowTransitionInsert,
  type WorkflowTransitionUpdate,
} from '../../services/administration/workflows';

export function useWorkflowDefinitions(organisationId: string | undefined, moduleId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-definitions-admin', organisationId, moduleId],
    queryFn: () => listWorkflowDefinitions(organisationId!, moduleId),
    enabled: Boolean(organisationId),
  });
}

export function useWorkflowDefinitionMutations(organisationId: string | undefined, moduleId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['workflow-definitions-admin', organisationId, moduleId] });

  const create = useMutation({
    mutationFn: (insert: WorkflowDefinitionInsert) => createWorkflowDefinition(insert),
    onSuccess: () => { message.success('Workflow créé.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: WorkflowDefinitionUpdate }) =>
      updateWorkflowDefinition(id, patch),
    onSuccess: () => { message.success('Workflow mis à jour.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteWorkflowDefinition(id),
    onSuccess: () => { message.success('Workflow supprimé.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const setDefault = useMutation({
    mutationFn: (id: string) => definirWorkflowDefinitionDefaut(id),
    onSuccess: () => { message.success('Workflow par défaut mis à jour.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  return { create, update, remove, setDefault };
}

export function useWorkflowEtapes(workflowDefinitionId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-etapes-admin', workflowDefinitionId],
    queryFn: () => listWorkflowEtapes(workflowDefinitionId!),
    enabled: Boolean(workflowDefinitionId),
  });
}

export function useWorkflowEtapeMutations(workflowDefinitionId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['workflow-etapes-admin', workflowDefinitionId] });

  const create = useMutation({
    mutationFn: (insert: WorkflowEtapeInsert) => createWorkflowEtape(insert),
    onSuccess: () => { message.success('Étape créée.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: WorkflowEtapeUpdate }) => updateWorkflowEtape(id, patch),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteWorkflowEtape(id),
    onSuccess: () => { message.success('Étape supprimée.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  return { create, update, remove };
}

export function useWorkflowTransitions(workflowDefinitionId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-transitions-admin', workflowDefinitionId],
    queryFn: () => listWorkflowTransitions(workflowDefinitionId!),
    enabled: Boolean(workflowDefinitionId),
  });
}

export function useWorkflowTransitionMutations(workflowDefinitionId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['workflow-transitions-admin', workflowDefinitionId] });

  const create = useMutation({
    mutationFn: (insert: WorkflowTransitionInsert) => createWorkflowTransition(insert),
    onSuccess: () => { message.success('Transition créée.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: WorkflowTransitionUpdate }) =>
      updateWorkflowTransition(id, patch),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteWorkflowTransition(id),
    onSuccess: () => { message.success('Transition supprimée.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  return { create, update, remove };
}

export function useWorkflowActeurs(transitionId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-acteurs-admin', transitionId],
    queryFn: () => listWorkflowActeurs(transitionId!),
    enabled: Boolean(transitionId),
  });
}

export function useWorkflowActeurMutations(transitionId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['workflow-acteurs-admin', transitionId] });

  const create = useMutation({
    mutationFn: (insert: WorkflowActeurInsert) => createWorkflowActeur(insert),
    onSuccess: () => { message.success('Acteur ajouté.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteWorkflowActeur(id),
    onSuccess: () => { message.success('Acteur retiré.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  return { create, remove };
}

export function useWorkflowDefinitionAssociations(workflowDefinitionId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-associations-admin', workflowDefinitionId],
    queryFn: () => listWorkflowDefinitionAssociations(workflowDefinitionId!),
    enabled: Boolean(workflowDefinitionId),
  });
}

export function useWorkflowAssociationMutations(workflowDefinitionId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['workflow-associations-admin', workflowDefinitionId] });

  const create = useMutation({
    mutationFn: (insert: WorkflowDefinitionAssociationInsert) => creerAssociation(insert),
    onSuccess: () => { message.success('Association créée.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => retirerAssociation(id),
    onSuccess: () => { message.success('Association retirée.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  return { create, remove };
}
