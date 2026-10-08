import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Star, Workflow } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ActionsLigne, BoutonModifier, BoutonSuppression } from '../../../components/form/actions-ligne';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { NativeSelect } from '../../../components/ui/native-select';
import { Skeleton } from '../../../components/ui/skeleton';
import { Switch as Interrupteur } from '../../../components/ui/switch';
import { Tableau } from '../../../components/ui/tableau';
import { Champ } from '../../../components/form/champ';
import { FormDialog } from '../../../components/form/form-dialog';
import { Input, Textarea } from '../../../components/ui/input';
import { useModulesActions } from '../../../hooks/administration/useRolesAdmin';
import {
  useWorkflowDefinitionMutations,
  useWorkflowDefinitions,
} from '../../../hooks/administration/useWorkflowsAdmin';
import { useProfile } from '../../../hooks/useProfile';
import { ariaErreur } from '../../../lib/form';
import type { WorkflowDefinition } from '../../../services/administration/workflows';
import { slugifier } from '../../../utils/slug';
import { WorkflowAssociationsManager } from './WorkflowAssociationsManager';
import { WorkflowDiagram } from './WorkflowDiagram';
import { WorkflowEtapesManager } from './WorkflowEtapesManager';
import { WorkflowTransitionsManager } from './WorkflowTransitionsManager';

const schema = z.object({
  libelle: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function WorkflowsTab() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;
  const peutModifier = can('administration', 'modifier');
  const { modules } = useModulesActions();

  const [moduleId, setModuleId] = useState<string | undefined>();
  useEffect(() => {
    if (!moduleId && modules.data && modules.data.length > 0) {
      const courrier = modules.data.find((m) => m.code === 'courrier');
      setModuleId((courrier ?? modules.data[0]).id);
    }
  }, [modules.data, moduleId]);

  const { data: definitions, isLoading } = useWorkflowDefinitions(organisationId, moduleId);
  const { create, update, remove, setDefault } = useWorkflowDefinitionMutations(organisationId, moduleId);
  const [edition, setEdition] = useState<WorkflowDefinition | 'nouveau' | null>(null);
  const [selection, setSelection] = useState<WorkflowDefinition | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { libelle: '', code: '', description: '' },
  });

  useEffect(() => {
    if (edition === 'nouveau') reset({ libelle: '', code: '', description: '' });
    else if (edition) reset({ libelle: edition.libelle, code: edition.code, description: edition.description ?? '' });
  }, [edition, reset]);

  const libelle = watch('libelle');
  useEffect(() => {
    if (edition === 'nouveau' && libelle) setValue('code', slugifier(libelle));
  }, [libelle, edition, setValue]);

  const onSubmit = (values: FormValues) => {
    if (edition === 'nouveau') {
      if (!organisationId || !moduleId) return;
      create.mutate(
        { organisation_id: organisationId, module_id: moduleId, code: values.code, libelle: values.libelle, description: values.description || null },
        { onSuccess: () => setEdition(null) },
      );
    } else if (edition) {
      update.mutate(
        { id: edition.id, patch: { libelle: values.libelle, description: values.description || null } },
        { onSuccess: () => setEdition(null) },
      );
    }
  };

  if (!organisationId) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-[13px] text-muted-foreground">
        Un workflow définit le circuit (étapes, transitions, acteurs autorisés) suivi par les courriers, documents ou
        missions. Aucun circuit n'est codé en dur : tout se configure ici.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <NativeSelect
          aria-label="Module"
          className="h-9 w-full text-[13px] sm:w-56"
          value={moduleId ?? ''}
          onChange={(e) => {
            setModuleId(e.target.value);
            setSelection(null);
          }}
        >
          {(modules.data ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.libelle}
            </option>
          ))}
        </NativeSelect>
        {peutModifier && (
          <Button onClick={() => setEdition('nouveau')}>
            <Plus />
            Nouveau workflow
          </Button>
        )}
      </div>

      <Tableau<WorkflowDefinition>
        libelle="Workflows du module"
        lignes={definitions}
        cleLigne={(d) => d.id}
        chargement={isLoading}
        minLargeur={600}
        onLigneClic={setSelection}
        estActive={(d) => d.id === selection?.id}
        vide={{ icone: Workflow, titre: 'Aucun workflow pour ce module' }}
        colonnes={[
          {
            cle: 'libelle',
            titre: 'Libellé',
            rendu: (d) => (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{d.libelle}</span>
                {d.est_defaut && (
                  <Badge variant="success" shape="pill">
                    Par défaut
                  </Badge>
                )}
              </span>
            ),
          },
          { cle: 'code', titre: 'Code', rendu: (d) => <span className="font-mono text-[12px] text-muted-foreground">{d.code}</span> },
          {
            cle: 'actif',
            titre: 'Actif',
            className: 'w-20',
            rendu: (d) => (
              <span onClick={(e) => e.stopPropagation()} className="inline-flex">
                <Interrupteur
                  aria-label={`Workflow ${d.libelle} actif`}
                  checked={d.actif}
                  disabled={!peutModifier}
                  onCheckedChange={(c) => update.mutate({ id: d.id, patch: { actif: c } })}
                />
              </span>
            ),
          },
          ...(peutModifier
            ? [
                {
                  cle: 'actions',
                  titre: <span className="sr-only">Actions</span>,
                  className: 'w-px whitespace-nowrap',
                  rendu: (d: WorkflowDefinition) => (
                    <ActionsLigne>
                      {!d.est_defaut && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          disabled={setDefault.isPending}
                          onClick={() => setDefault.mutate(d.id)}
                        >
                          <Star />
                          Définir par défaut
                        </Button>
                      )}
                      <BoutonModifier libelle={`Modifier ${d.libelle}`} onClick={() => setEdition(d)} />
                      <BoutonSuppression
                        libelle={`Supprimer ${d.libelle}`}
                        titre="Supprimer ce workflow ?"
                        enCours={remove.isPending}
                        onConfirmer={(fermer) =>
                          remove.mutate(d.id, {
                            onSuccess: () => {
                              if (selection?.id === d.id) setSelection(null);
                              fermer();
                            },
                          })
                        }
                      >
                        <p>
                          Le workflow <strong>{d.libelle}</strong>, ses étapes et ses transitions seront supprimés.
                        </p>
                      </BoutonSuppression>
                    </ActionsLigne>
                  ),
                },
              ]
            : []),
        ]}
      />

      {!selection && (definitions ?? []).length > 0 && (
        <p className="text-[13px] text-muted-foreground">Sélectionnez un workflow pour configurer son circuit.</p>
      )}

      {selection && moduleId && (
        <section aria-label={`Configuration du workflow ${selection.libelle}`} className="space-y-8 border-t border-border pt-6">
          <h2 className="font-serif-title text-[22px] font-semibold leading-tight">{selection.libelle}</h2>
          <WorkflowDiagram workflowDefinitionId={selection.id} peutModifier={peutModifier} />
          <WorkflowEtapesManager workflowDefinitionId={selection.id} peutModifier={peutModifier} />
          <WorkflowTransitionsManager
            workflowDefinitionId={selection.id}
            organisationId={organisationId}
            peutModifier={peutModifier}
          />
          <WorkflowAssociationsManager
            workflowDefinitionId={selection.id}
            organisationId={organisationId}
            moduleId={moduleId}
            peutModifier={peutModifier}
          />
        </section>
      )}

      <FormDialog
        open={edition !== null}
        onClose={() => setEdition(null)}
        titre={edition === 'nouveau' ? 'Nouveau workflow' : 'Modifier le workflow'}
        description={edition === 'nouveau' ? 'Les étapes et transitions se configurent ensuite.' : undefined}
        onSubmit={handleSubmit(onSubmit)}
        enCours={create.isPending || update.isPending}
        libelleValider={edition === 'nouveau' ? 'Créer le workflow' : 'Enregistrer'}
      >
        <Champ label="Libellé" htmlFor="workflow-libelle" requis erreur={errors.libelle?.message}>
          <Input autoFocus {...ariaErreur('workflow-libelle', errors.libelle)} {...register('libelle')} />
        </Champ>
        <Champ
          label="Code"
          htmlFor="workflow-code"
          requis
          erreur={errors.code?.message}
          aide={edition === 'nouveau' ? 'Proposé à partir du libellé.' : "Le code d'un workflow existant n'est pas modifiable."}
        >
          <Input className="font-mono" disabled={edition !== 'nouveau'} {...ariaErreur('workflow-code', errors.code)} {...register('code')} />
        </Champ>
        <Champ label="Description" htmlFor="workflow-description">
          <Textarea id="workflow-description" rows={2} {...register('description')} />
        </Champ>
      </FormDialog>
    </div>
  );
}
