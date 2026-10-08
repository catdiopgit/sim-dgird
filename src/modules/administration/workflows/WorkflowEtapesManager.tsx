import { zodResolver } from '@hookform/resolvers/zod';
import { ListOrdered, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ActionsLigne, BoutonModifier, BoutonSuppression } from '../../../components/form/actions-ligne';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Tableau } from '../../../components/ui/tableau';
import { couleurReferentiel } from '../../../utils/couleurReferentiel';
import { Champ } from '../../../components/form/champ';
import { ChampCouleur } from '../../../components/form/champ-couleur';
import { FormDialog } from '../../../components/form/form-dialog';
import { Input } from '../../../components/ui/input';
import { NativeSelect } from '../../../components/ui/native-select';
import {
  useWorkflowEtapeMutations,
  useWorkflowEtapes,
} from '../../../hooks/administration/useWorkflowsAdmin';
import { ariaErreur } from '../../../lib/form';
import type { WorkflowEtape } from '../../../services/administration/workflows';
import { slugifier } from '../../../utils/slug';

const OPTIONS_TYPE_ETAPE = [
  { value: 'initiale', label: 'Initiale' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'finale', label: 'Finale' },
  { value: 'rejet', label: 'Rejet' },
];

const VARIANTE_TYPE_ETAPE: Record<string, 'outline' | 'muted' | 'success' | 'critical'> = {
  initiale: 'outline',
  intermediaire: 'muted',
  finale: 'success',
  rejet: 'critical',
};

const schema = z.object({
  libelle: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  ordre: z.number().int(),
  type_etape: z.enum(['initiale', 'intermediaire', 'finale', 'rejet']),
  delai_jours: z.number().int().nullable().optional(),
  couleur: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  workflowDefinitionId: string;
  peutModifier: boolean;
}

export function WorkflowEtapesManager({ workflowDefinitionId, peutModifier }: Props) {
  const { data: etapes, isLoading } = useWorkflowEtapes(workflowDefinitionId);
  const { create, update, remove } = useWorkflowEtapeMutations(workflowDefinitionId);
  const [edition, setEdition] = useState<WorkflowEtape | 'nouveau' | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { libelle: '', code: '', ordre: 0, type_etape: 'intermediaire', delai_jours: null, couleur: '' },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({
        libelle: '',
        code: '',
        ordre: (etapes?.length ?? 0) + 1,
        type_etape: 'intermediaire',
        delai_jours: null,
        couleur: '',
      });
    } else if (edition) {
      reset({
        libelle: edition.libelle,
        code: edition.code,
        ordre: edition.ordre,
        type_etape: edition.type_etape,
        delai_jours: edition.delai_jours,
        couleur: edition.couleur ?? '',
      });
    }
  }, [edition, reset, etapes]);

  const libelle = watch('libelle');
  useEffect(() => {
    if (edition === 'nouveau' && libelle) setValue('code', slugifier(libelle));
  }, [libelle, edition, setValue]);

  const onSubmit = (values: FormValues) => {
    const patch = {
      libelle: values.libelle,
      code: values.code,
      ordre: values.ordre,
      type_etape: values.type_etape,
      delai_jours: values.delai_jours ?? null,
      couleur: values.couleur || null,
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
        titre="Étapes"
        actions={
          peutModifier && (
            <Button variant="outline" size="sm" onClick={() => setEdition('nouveau')}>
              <Plus />
              Ajouter une étape
            </Button>
          )
        }
      />
      <Tableau<WorkflowEtape>
        libelle="Étapes du workflow"
        lignes={etapes}
        cleLigne={(e) => e.id}
        chargement={isLoading}
        minLargeur={560}
        vide={{ icone: ListOrdered, titre: 'Aucune étape', description: 'Commencez par une étape initiale.' }}
        colonnes={[
          { cle: 'ordre', titre: 'Ordre', className: 'w-16 tabular-nums text-muted-foreground', rendu: (e) => e.ordre },
          {
            cle: 'libelle',
            titre: 'Libellé',
            rendu: (e) => (
              <span className="flex items-center gap-2 font-medium">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: couleurReferentiel(e.couleur) ?? 'var(--st-neutral)' }}
                />
                {e.libelle}
              </span>
            ),
          },
          { cle: 'code', titre: 'Code', rendu: (e) => <span className="font-mono text-[12px] text-muted-foreground">{e.code}</span> },
          {
            cle: 'type',
            titre: 'Type',
            className: 'w-32',
            rendu: (e) => (
              <Badge variant={VARIANTE_TYPE_ETAPE[e.type_etape] ?? 'muted'} shape="pill">
                {OPTIONS_TYPE_ETAPE.find((o) => o.value === e.type_etape)?.label ?? e.type_etape}
              </Badge>
            ),
          },
          {
            cle: 'delai',
            titre: 'Délai',
            className: 'w-20 tabular-nums',
            rendu: (e) => (e.delai_jours != null ? `${e.delai_jours} j` : <span className="text-muted-foreground">—</span>),
          },
          ...(peutModifier
            ? [
                {
                  cle: 'actions',
                  titre: <span className="sr-only">Actions</span>,
                  className: 'w-20',
                  rendu: (e: WorkflowEtape) => (
                    <ActionsLigne>
                      <BoutonModifier libelle={`Modifier l'étape ${e.libelle}`} onClick={() => setEdition(e)} />
                      <BoutonSuppression
                        libelle={`Supprimer l'étape ${e.libelle}`}
                        titre="Supprimer cette étape ?"
                        enCours={remove.isPending}
                        onConfirmer={(fermer) => remove.mutate(e.id, { onSuccess: fermer })}
                      >
                        <p>
                          L'étape <strong>{e.libelle}</strong> sera supprimée, ainsi que les transitions qui y mènent ou en
                          partent.
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
        titre={edition === 'nouveau' ? 'Nouvelle étape' : "Modifier l'étape"}
        onSubmit={handleSubmit(onSubmit)}
        enCours={create.isPending || update.isPending}
        libelleValider={edition === 'nouveau' ? "Ajouter l'étape" : 'Enregistrer'}
      >
        <Champ label="Libellé" htmlFor="etape-libelle" requis erreur={errors.libelle?.message}>
          <Input autoFocus {...ariaErreur('etape-libelle', errors.libelle)} {...register('libelle')} />
        </Champ>
        <Champ label="Code" htmlFor="etape-code" requis aide={edition === 'nouveau' ? 'Proposé à partir du libellé.' : undefined} erreur={errors.code?.message}>
          <Input className="font-mono" {...ariaErreur('etape-code', errors.code)} {...register('code')} />
        </Champ>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Champ label="Type" htmlFor="etape-type">
            <NativeSelect id="etape-type" {...register('type_etape')}>
              {OPTIONS_TYPE_ETAPE.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </Champ>
          <Champ label="Ordre" htmlFor="etape-ordre" erreur={errors.ordre?.message}>
            <Input type="number" step={1} {...ariaErreur('etape-ordre', errors.ordre)} {...register('ordre', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })} />
          </Champ>
          <Champ label="Délai (jours)" htmlFor="etape-delai" aide="Facultatif." erreur={errors.delai_jours?.message}>
            <Input
              type="number"
              step={1}
              min={0}
              {...ariaErreur('etape-delai', errors.delai_jours)}
              {...register('delai_jours', { setValueAs: (v) => (v === '' || v === null ? null : Number(v)) })}
            />
          </Champ>
        </div>
        <Champ label="Couleur" htmlFor="etape-couleur">
          <Controller
            name="couleur"
            control={control}
            render={({ field }) => <ChampCouleur id="etape-couleur" value={field.value} onChange={field.onChange} />}
          />
        </Champ>
      </FormDialog>
    </div>
  );
}
