import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from '../../lib/notifications';
import { useMemo } from 'react';
import {
  comparerDossiers,
  compterDocumentsParDossier,
  creerDossierGed,
  definirEntitesProductrices,
  importerPlanDirectionRoutes,
  libelleDossier,
  listDossiers,
  modifierDossierGed,
  supprimerDossierGed,
  type CreerDossierPayload,
  type GedDossier,
  type ModifierDossierPayload,
} from '../../services/ged/dossiers';

// Clé "non_classes" pour les documents archivés sans dossier_id — pas un uuid
// réel, jamais envoyée au backend, uniquement pour indexer la Map de comptage.
export const CLE_NON_CLASSES = 'non_classes' as const;

export function useDossiers(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['ged-dossiers', organisationId],
    queryFn: () => listDossiers(organisationId!),
    enabled: Boolean(organisationId),
  });
}

// Options de sélection triées/indentées selon la hiérarchie du plan de
// classement (parent_dossier_id) — un sous-dossier apparaît toujours juste
// après son parent, préfixé pour rendre la profondeur visible dans un
// <Select> plat (dépôt, classement, recherche Archives).
// v8.6 : tri selon l'ordre officiel du plan, libellé « CODE — Intitulé », et
// dossiers désactivés exclus (sauf la valeur déjà choisie, passée en `garder`).
export function useOptionsDossiersGed(organisationId: string | undefined, garder: string | null = null) {
  const { data: dossiers } = useDossiers(organisationId);

  return useMemo(() => {
    const enfantsParParent = new Map<string | null, GedDossier[]>();
    for (const d of dossiers ?? []) {
      if (d.actif === false && d.id !== garder) continue;
      const liste = enfantsParParent.get(d.parent_dossier_id) ?? [];
      liste.push(d);
      enfantsParParent.set(d.parent_dossier_id, liste);
    }
    for (const liste of enfantsParParent.values()) liste.sort(comparerDossiers);

    const options: { value: string; label: string }[] = [];
    const parcourir = (parentId: string | null, profondeur: number) => {
      for (const d of enfantsParParent.get(parentId) ?? []) {
        options.push({ value: d.id, label: `${'\u00a0\u00a0'.repeat(profondeur)}${libelleDossier(d)}` });
        parcourir(d.id, profondeur + 1);
      }
    };
    parcourir(null, 0);
    return options;
  }, [dossiers, garder]);
}

// Comptage de documents archivés par dossier, pour les badges de l'arbre
// Archives — CLE_NON_CLASSES agrège les documents dont dossier_id est null.
export function useCompteurDocumentsParDossier(organisationId: string | undefined) {
  const requete = useQuery({
    queryKey: ['ged-compteur-documents-dossier', organisationId],
    queryFn: compterDocumentsParDossier,
    enabled: Boolean(organisationId),
  });
  const compteurs = useMemo(() => {
    const map = new Map<string, number>();
    for (const ligne of requete.data ?? []) {
      map.set(ligne.dossier_id ?? CLE_NON_CLASSES, ligne.nb);
    }
    return map;
  }, [requete.data]);
  return { ...requete, compteurs };
}

export function useCreerDossierGed(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreerDossierPayload) => creerDossierGed(payload),
    onSuccess: () => {
      message.success('Dossier créé.');
      void queryClient.invalidateQueries({ queryKey: ['ged-dossiers', organisationId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useModifierDossierGed(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ModifierDossierPayload) => modifierDossierGed(payload),
    onSuccess: () => {
      message.success('Dossier mis à jour.');
      void queryClient.invalidateQueries({ queryKey: ['ged-dossiers', organisationId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

function useInvaliderPlan(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['ged-dossiers', organisationId] });
    void queryClient.invalidateQueries({ queryKey: ['ged-compteur-documents-dossier', organisationId] });
  };
}

export function useSupprimerDossierGed(organisationId: string | undefined) {
  const invalider = useInvaliderPlan(organisationId);
  return useMutation({
    mutationFn: (id: string) => supprimerDossierGed(id),
    onSuccess: () => {
      message.success('Dossier supprimé.');
      invalider();
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useEntitesProductrices(organisationId: string | undefined) {
  const invalider = useInvaliderPlan(organisationId);
  return useMutation({
    mutationFn: ({ id, entiteIds }: { id: string; entiteIds: string[] }) => definirEntitesProductrices(id, entiteIds),
    onSuccess: () => {
      message.success('Entités productrices enregistrées.');
      invalider();
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useImporterPlanDirectionRoutes(organisationId: string | undefined) {
  const invalider = useInvaliderPlan(organisationId);
  return useMutation({
    mutationFn: () => importerPlanDirectionRoutes(),
    onSuccess: (r) => {
      message.success(`Plan de classement importé : ${r.nbDossiers} dossiers.`);
      invalider();
    },
    onError: (error: Error) => message.error(error.message),
  });
}
