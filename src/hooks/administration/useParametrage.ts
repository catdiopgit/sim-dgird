import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  createListeValeurs,
  createRegleNumerotation,
  createValeurListe,
  deleteListeValeurs,
  deleteParametreOrganisation,
  deleteRegleNumerotation,
  deleteValeurListe,
  listListesValeurs,
  listParametresOrganisation,
  listReglesNumerotation,
  listValeursListes,
  updateListeValeurs,
  updateRegleNumerotation,
  updateValeurListe,
  upsertParametreOrganisation,
  type ListeValeursInsert,
  type ListeValeursUpdate,
  type RegleNumerotationInsert,
  type RegleNumerotationUpdate,
  type ValeurListeInsert,
  type ValeurListeUpdate,
} from '../../services/administration/parametrage';
import { messageErreurSuppression } from '../../utils/supabaseErrors';
import type { Json } from '../../types/database';

export function useListesValeurs(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['listes_valeurs', organisationId],
    queryFn: () => listListesValeurs(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useListeValeursMutations(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['listes_valeurs', organisationId] });

  const create = useMutation({
    mutationFn: (insert: ListeValeursInsert) => createListeValeurs(insert),
    onSuccess: () => { message.success('Liste créée.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ListeValeursUpdate }) => updateListeValeurs(id, patch),
    onSuccess: () => { message.success('Liste mise à jour.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteListeValeurs(id),
    onSuccess: () => { message.success('Liste supprimée.'); void invalidate(); },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'cette liste')),
  });
  return { create, update, remove };
}

export function useValeursListes(listeId: string | undefined) {
  return useQuery({
    queryKey: ['valeurs_listes', listeId],
    queryFn: () => listValeursListes(listeId!),
    enabled: Boolean(listeId),
  });
}

export function useValeurListeMutations(listeId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['valeurs_listes', listeId] });

  const create = useMutation({
    mutationFn: (insert: ValeurListeInsert) => createValeurListe(insert),
    onSuccess: () => { message.success('Valeur créée.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ValeurListeUpdate }) => updateValeurListe(id, patch),
    onSuccess: () => { message.success('Valeur mise à jour.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteValeurListe(id),
    onSuccess: () => { message.success('Valeur supprimée.'); void invalidate(); },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'cette valeur')),
  });
  return { create, update, remove };
}

export function useReglesNumerotation(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['regles_numerotation', organisationId],
    queryFn: () => listReglesNumerotation(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useRegleNumerotationMutations(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['regles_numerotation', organisationId] });

  const create = useMutation({
    mutationFn: (insert: RegleNumerotationInsert) => createRegleNumerotation(insert),
    onSuccess: () => { message.success('Règle créée.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RegleNumerotationUpdate }) =>
      updateRegleNumerotation(id, patch),
    onSuccess: () => { message.success('Règle mise à jour.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteRegleNumerotation(id),
    onSuccess: () => { message.success('Règle supprimée.'); void invalidate(); },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'cette règle')),
  });
  return { create, update, remove };
}

export function useParametresOrganisation(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['parametres_organisation', organisationId],
    queryFn: () => listParametresOrganisation(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useParametreOrganisationMutations(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['parametres_organisation', organisationId] });

  const upsert = useMutation({
    mutationFn: ({ cle, valeur, description }: { cle: string; valeur: Json; description: string | null }) =>
      upsertParametreOrganisation(organisationId!, cle, valeur, description),
    onSuccess: () => { message.success('Paramètre enregistré.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteParametreOrganisation(id),
    onSuccess: () => { message.success('Paramètre supprimé.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  return { upsert, remove };
}
