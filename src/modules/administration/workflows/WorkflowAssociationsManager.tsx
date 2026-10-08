import { Link2, LoaderCircle, Unlink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActionsLigne, BoutonSuppression } from '../../../components/form/actions-ligne';
import { Button } from '../../../components/ui/button';
import { NativeSelect } from '../../../components/ui/native-select';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Tableau } from '../../../components/ui/tableau';
import {
  useWorkflowAssociationMutations,
  useWorkflowDefinitionAssociations,
} from '../../../hooks/administration/useWorkflowsAdmin';
import { listListesValeurs, listValeursListes } from '../../../services/administration/parametrage';
import type { WorkflowDefinitionAssociation } from '../../../services/administration/workflows';

interface Props {
  workflowDefinitionId: string;
  organisationId: string;
  moduleId: string;
  peutModifier: boolean;
}

export function WorkflowAssociationsManager({ workflowDefinitionId, organisationId, moduleId, peutModifier }: Props) {
  const { data: associations, isLoading } = useWorkflowDefinitionAssociations(workflowDefinitionId);
  const { create, remove } = useWorkflowAssociationMutations(workflowDefinitionId);

  const { data: listes } = useQuery({
    queryKey: ['listes-valeurs-module', organisationId, moduleId],
    queryFn: async () => (await listListesValeurs(organisationId)).filter((l) => l.module_id === moduleId),
    enabled: Boolean(organisationId && moduleId),
  });

  const [listeId, setListeId] = useState<string | undefined>();
  const { data: valeurs } = useQuery({
    queryKey: ['valeurs-listes-pour-liste', listeId],
    queryFn: () => listValeursListes(listeId!),
    enabled: Boolean(listeId),
  });
  const [valeurId, setValeurId] = useState<string | undefined>();

  useEffect(() => {
    setValeurId(undefined);
  }, [listeId]);

  // Pour afficher le libellé des associations déjà créées, il faut résoudre
  // valeur_liste_id -> libellé pour toutes les listes du module (pas seulement
  // celle sélectionnée dans le formulaire).
  const { data: toutesLesValeurs } = useQuery({
    queryKey: ['valeurs-listes-toutes', (listes ?? []).map((l) => l.id).join(',')],
    queryFn: async () => {
      const resultats = await Promise.all((listes ?? []).map((l) => listValeursListes(l.id)));
      return resultats.flat();
    },
    enabled: (listes ?? []).length > 0,
  });
  const valeurParId = useMemo(
    () => new Map((toutesLesValeurs ?? []).map((v) => [v.id, v.libelle])),
    [toutesLesValeurs],
  );

  const onAjouter = () => {
    if (!valeurId) return;
    create.mutate(
      { workflow_definition_id: workflowDefinitionId, valeur_liste_id: valeurId },
      { onSuccess: () => setValeurId(undefined) },
    );
  };

  return (
    <div>
      <EnTeteSection
        titre="Association à une valeur"
        description="Ce workflow est utilisé automatiquement quand la valeur associée est sélectionnée (par exemple le sens du courrier), à la place du workflow par défaut du module."
      />
      {peutModifier && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <NativeSelect
            aria-label="Liste de valeurs"
            className="h-9 text-[13px] sm:w-56"
            value={listeId ?? ''}
            onChange={(e) => setListeId(e.target.value || undefined)}
          >
            <option value="">Choisir une liste</option>
            {(listes ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.libelle}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Valeur"
            className="h-9 text-[13px] sm:w-56"
            value={valeurId ?? ''}
            onChange={(e) => setValeurId(e.target.value || undefined)}
            disabled={!listeId}
          >
            <option value="">Choisir une valeur</option>
            {(valeurs ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.libelle}
              </option>
            ))}
          </NativeSelect>
          <Button onClick={onAjouter} disabled={!valeurId || create.isPending}>
            {create.isPending ? <LoaderCircle className="animate-spin" /> : <Link2 />}
            Associer
          </Button>
        </div>
      )}
      <Tableau<WorkflowDefinitionAssociation>
        libelle="Valeurs associées"
        lignes={associations}
        cleLigne={(a) => a.id}
        chargement={isLoading}
        minLargeur={320}
        vide={{ icone: Link2, titre: 'Aucune association', description: 'Le workflow ne s’applique que s’il est le workflow par défaut du module.' }}
        colonnes={[
          {
            cle: 'valeur',
            titre: 'Valeur associée',
            rendu: (a) => <span className="font-medium">{valeurParId.get(a.valeur_liste_id) ?? a.valeur_liste_id}</span>,
          },
          ...(peutModifier
            ? [
                {
                  cle: 'actions',
                  titre: <span className="sr-only">Actions</span>,
                  className: 'w-14',
                  rendu: (a: WorkflowDefinitionAssociation) => (
                    <ActionsLigne>
                      <BoutonSuppression
                        libelle={`Retirer l'association ${valeurParId.get(a.valeur_liste_id) ?? ''}`}
                        titre="Retirer cette association ?"
                        libelleConfirmer="Retirer"
                        enCours={remove.isPending}
                        onConfirmer={(fermer) => remove.mutate(a.id, { onSuccess: fermer })}
                        icone={<Unlink />}
                      >
                        <p>
                          La valeur <strong>{valeurParId.get(a.valeur_liste_id) ?? '—'}</strong> ne déclenchera plus ce workflow.
                        </p>
                      </BoutonSuppression>
                    </ActionsLigne>
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
