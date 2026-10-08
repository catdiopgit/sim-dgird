import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ArrowRightLeft, Plus, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ActionsLigne, BoutonModifier, BoutonSuppression } from '../../../components/form/actions-ligne';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Tableau } from '../../../components/ui/tableau';
import { Champ } from '../../../components/form/champ';
import { FormDialog } from '../../../components/form/form-dialog';
import { SectionFormulaire } from '../../../components/form/section-formulaire';
import { Input } from '../../../components/ui/input';
import { NativeSelect } from '../../../components/ui/native-select';
import {
  useWorkflowEtapes,
  useWorkflowTransitionMutations,
  useWorkflowTransitions,
} from '../../../hooks/administration/useWorkflowsAdmin';
import { ariaErreur } from '../../../lib/form';
import type { WorkflowTransition } from '../../../services/administration/workflows';
import { slugifier } from '../../../utils/slug';
import { WorkflowActeursManager } from './WorkflowActeursManager';

const schema = z.object({
  libelle_action: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  etape_source_id: z.string().optional(),
  etape_cible_id: z.string().min(1, 'Requis'),
  type_action: z.string().optional(),
  conditionChamp: z.string().optional(),
  conditionOperateur: z.string().optional(),
  conditionValeur: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const OPTIONS_TYPE_ACTION = [
  { value: 'imputation', label: 'Imputation' },
  { value: 'affectation', label: 'Affectation' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'redirection', label: 'Redirection' },
];

interface Props {
  workflowDefinitionId: string;
  organisationId: string;
  peutModifier: boolean;
}

export function WorkflowTransitionsManager({ workflowDefinitionId, organisationId, peutModifier }: Props) {
  const { data: transitions, isLoading } = useWorkflowTransitions(workflowDefinitionId);
  const { data: etapes } = useWorkflowEtapes(workflowDefinitionId);
  const { create, update, remove } = useWorkflowTransitionMutations(workflowDefinitionId);
  const [edition, setEdition] = useState<WorkflowTransition | 'nouveau' | null>(null);
  const [acteursDe, setActeursDe] = useState<WorkflowTransition | null>(null);

  const etapeParId = useMemo(() => new Map((etapes ?? []).map((e) => [e.id, e.libelle])), [etapes]);
  const optionsEtapes = (etapes ?? []).map((e) => ({ value: e.id, label: e.libelle }));

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      libelle_action: '',
      code: '',
      etape_source_id: '',
      etape_cible_id: '',
      type_action: '',
      conditionChamp: '',
      conditionOperateur: '=',
      conditionValeur: '',
    },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({
        libelle_action: '',
        code: '',
        etape_source_id: '',
        etape_cible_id: '',
        type_action: '',
        conditionChamp: '',
        conditionOperateur: '=',
        conditionValeur: '',
      });
    } else if (edition) {
      const condition = edition.condition as { champ?: string; operateur?: string; valeur?: string } | null;
      reset({
        libelle_action: edition.libelle_action,
        code: edition.code,
        etape_source_id: edition.etape_source_id ?? '',
        etape_cible_id: edition.etape_cible_id,
        type_action: edition.type_action ?? '',
        conditionChamp: condition?.champ ?? '',
        conditionOperateur: condition?.operateur ?? '=',
        conditionValeur: condition?.valeur ?? '',
      });
    }
  }, [edition, reset]);

  const libelleAction = watch('libelle_action');
  useEffect(() => {
    if (edition === 'nouveau' && libelleAction) setValue('code', slugifier(libelleAction));
  }, [libelleAction, edition, setValue]);

  const onSubmit = (values: FormValues) => {
    const condition =
      values.conditionChamp && values.conditionValeur
        ? { champ: values.conditionChamp, operateur: values.conditionOperateur || '=', valeur: values.conditionValeur }
        : null;
    const patch = {
      libelle_action: values.libelle_action,
      code: values.code,
      etape_source_id: values.etape_source_id || null,
      etape_cible_id: values.etape_cible_id,
      type_action: (values.type_action || null) as WorkflowTransition['type_action'],
      condition,
    };
    if (edition === 'nouveau') {
      create.mutate({ workflow_definition_id: workflowDefinitionId, ...patch }, { onSuccess: () => setEdition(null) });
    } else if (edition) {
      update.mutate({ id: edition.id, patch }, { onSuccess: () => setEdition(null) });
    }
  };

  return (
    <div>
      <EnTeteSection
        titre="Transitions"
        actions={
          peutModifier && (
            <Button variant="outline" size="sm" onClick={() => setEdition('nouveau')}>
              <Plus />
              Ajouter une transition
            </Button>
          )
        }
      />
      <Tableau<WorkflowTransition>
        libelle="Transitions du workflow"
        lignes={transitions}
        cleLigne={(t) => t.id}
        chargement={isLoading}
        minLargeur={760}
        vide={{ icone: ArrowRightLeft, titre: 'Aucune transition', description: 'Reliez les étapes entre elles par des actions.' }}
        colonnes={[
          { cle: 'action', titre: 'Action', rendu: (t) => <span className="font-medium">{t.libelle_action}</span> },
          {
            cle: 'parcours',
            titre: 'Parcours',
            rendu: (t) => (
              <span className="flex flex-wrap items-center gap-1.5">
                {t.etape_source_id ? (
                  (etapeParId.get(t.etape_source_id) ?? '—')
                ) : (
                  <span className="text-muted-foreground">N'importe où</span>
                )}
                <ArrowRight className="size-3.5 text-muted-foreground" aria-label="vers" />
                {etapeParId.get(t.etape_cible_id) ?? '—'}
              </span>
            ),
          },
          {
            cle: 'type',
            titre: "Type d'action",
            className: 'w-32',
            rendu: (t) =>
              t.type_action ? (
                <Badge variant="muted" shape="pill">
                  {OPTIONS_TYPE_ACTION.find((o) => o.value === t.type_action)?.label ?? t.type_action}
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            cle: 'condition',
            titre: 'Condition',
            rendu: (t) => {
              const c = t.condition as { champ?: string; operateur?: string; valeur?: string } | null;
              return c?.champ ? (
                <code className="block max-w-[200px] truncate font-mono text-[12px]" title={JSON.stringify(c)}>
                  {c.champ} {c.operateur} {c.valeur}
                </code>
              ) : (
                <span className="text-muted-foreground">—</span>
              );
            },
          },
          {
            cle: 'acteurs',
            titre: 'Acteurs',
            className: 'w-24',
            rendu: (t) => (
              <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setActeursDe(t)} aria-label={`Acteurs de ${t.libelle_action}`}>
                <Users />
                Gérer
              </Button>
            ),
          },
          ...(peutModifier
            ? [
                {
                  cle: 'actions',
                  titre: <span className="sr-only">Actions</span>,
                  className: 'w-20',
                  rendu: (t: WorkflowTransition) => (
                    <ActionsLigne>
                      <BoutonModifier libelle={`Modifier la transition ${t.libelle_action}`} onClick={() => setEdition(t)} />
                      <BoutonSuppression
                        libelle={`Supprimer la transition ${t.libelle_action}`}
                        titre="Supprimer cette transition ?"
                        enCours={remove.isPending}
                        onConfirmer={(fermer) => remove.mutate(t.id, { onSuccess: fermer })}
                      >
                        <p>
                          L'action <strong>{t.libelle_action}</strong> ne sera plus proposée sur les dossiers de ce circuit.
                        </p>
                      </BoutonSuppression>
                    </ActionsLigne>
                  ),
                },
              ]
            : []),
        ]}
      />

      <FormDialog
        open={edition !== null}
        onClose={() => setEdition(null)}
        titre={edition === 'nouveau' ? 'Nouvelle transition' : 'Modifier la transition'}
        onSubmit={handleSubmit(onSubmit)}
        enCours={create.isPending || update.isPending}
        libelleValider={edition === 'nouveau' ? 'Ajouter la transition' : 'Enregistrer'}
        largeur="lg"
      >
        <SectionFormulaire titre="Action">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Champ label="Libellé de l'action" htmlFor="transition-libelle" requis erreur={errors.libelle_action?.message}>
              <Input autoFocus placeholder="Ex. : Valider" {...ariaErreur('transition-libelle', errors.libelle_action)} {...register('libelle_action')} />
            </Champ>
            <Champ label="Code" htmlFor="transition-code" requis aide={edition === 'nouveau' ? 'Proposé à partir du libellé.' : undefined} erreur={errors.code?.message}>
              <Input className="font-mono" {...ariaErreur('transition-code', errors.code)} {...register('code')} />
            </Champ>
            <Champ label="Étape de départ" htmlFor="transition-source" aide="Vide = depuis n'importe quelle étape.">
              <NativeSelect id="transition-source" {...register('etape_source_id')}>
                <option value="">N'importe quelle étape</option>
                {optionsEtapes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </Champ>
            <Champ label="Étape d'arrivée" htmlFor="transition-cible" requis erreur={errors.etape_cible_id?.message}>
              <NativeSelect {...ariaErreur('transition-cible', errors.etape_cible_id)} {...register('etape_cible_id')}>
                <option value="">Sélectionner une étape</option>
                {optionsEtapes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </Champ>
          </div>
          <Champ
            label="Type d'action (courriers arrivés)"
            htmlFor="transition-type"
            aide="Ouvre la fenêtre d'action (Imputer à / En copie / Actions demandées) au lieu d'une simple confirmation."
          >
            <NativeSelect id="transition-type" {...register('type_action')}>
              <option value="">Aucun (confirmation simple)</option>
              {OPTIONS_TYPE_ACTION.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </Champ>
        </SectionFormulaire>
        <SectionFormulaire titre="Condition (facultative)">
          <p className="text-[13px] text-muted-foreground">
            Ex. : <code className="font-mono">priorite_valeur_id = &lt;id&gt;</code>. Laissez le champ vide pour une transition sans condition.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_100px_1fr]">
            <Champ label="Champ" htmlFor="transition-condition-champ">
              <Input id="transition-condition-champ" className="font-mono" placeholder="priorite_valeur_id" {...register('conditionChamp')} />
            </Champ>
            <Champ label="Opérateur" htmlFor="transition-condition-operateur">
              <NativeSelect id="transition-condition-operateur" className="font-mono" {...register('conditionOperateur')}>
                {['=', '<>', 'in', '>', '<', '>=', '<='].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </NativeSelect>
            </Champ>
            <Champ label="Valeur" htmlFor="transition-condition-valeur">
              <Input id="transition-condition-valeur" className="font-mono" {...register('conditionValeur')} />
            </Champ>
          </div>
        </SectionFormulaire>
      </FormDialog>

      <WorkflowActeursManager
        open={acteursDe !== null}
        transitionId={acteursDe?.id ?? null}
        libelleAction={acteursDe?.libelle_action ?? ''}
        organisationId={organisationId}
        peutModifier={peutModifier}
        onClose={() => setActeursDe(null)}
      />
    </div>
  );
}
