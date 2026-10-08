import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../../components/form/champ';
import { FormDialog } from '../../../components/form/form-dialog';
import { Input, Textarea } from '../../../components/ui/input';
import { NativeSelect } from '../../../components/ui/native-select';
import { Switch } from '../../../components/ui/switch';
import { usePhaseTypeMarcheMutations } from '../../../hooks/marches/useTypesMarche';
import { ariaErreur } from '../../../lib/form';
import type { PhaseTypeMarche } from '../../../services/marches/typesMarche';

const schema = z.object({
  nom: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  ordre: z.number().optional(),
  duree: z.number({ message: 'Requis' }).min(1, 'Doit être supérieur à 0'),
  uniteDuree: z.enum(['jour', 'semaine', 'mois']),
  obligatoire: z.boolean(),
  actif: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  typeMarcheId: string;
  phase?: PhaseTypeMarche | null;
  onClose: () => void;
}

const DEFAUTS: FormValues = { nom: '', description: '', ordre: 0, duree: 5, uniteDuree: 'jour', obligatoire: true, actif: true };

// §7 Phases-modèles d'un type de marché : nom, ordre, durée, unité, caractère
// obligatoire/optionnel — dupliquées en phases réelles à la création d'un
// marché de ce type (PhasesMarcheService.planifier).
export function PhaseTypeMarcheFormModal({ open, typeMarcheId, phase, onClose }: Props) {
  const { create, update } = usePhaseTypeMarcheMutations(typeMarcheId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAUTS });

  useEffect(() => {
    if (!open) return;
    reset(
      phase
        ? {
            nom: phase.nom,
            description: phase.description ?? '',
            ordre: phase.ordre,
            duree: phase.duree,
            uniteDuree: phase.unite_duree,
            obligatoire: phase.obligatoire,
            actif: phase.actif,
          }
        : DEFAUTS,
    );
  }, [open, phase, reset]);

  const onSubmit = (values: FormValues) => {
    const patch = {
      nom: values.nom,
      description: values.description || null,
      ordre: values.ordre ?? 0,
      duree: values.duree,
      unite_duree: values.uniteDuree,
      obligatoire: values.obligatoire,
      ...(phase ? { actif: values.actif ?? true } : {}),
    };
    if (phase) {
      update.mutate({ id: phase.id, patch }, { onSuccess: () => onClose() });
    } else {
      create.mutate(patch, { onSuccess: () => onClose() });
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre={phase ? 'Modifier la phase' : 'Nouvelle phase'}
      onSubmit={handleSubmit(onSubmit)}
      enCours={create.isPending || update.isPending}
      libelleValider={phase ? 'Enregistrer' : 'Ajouter la phase'}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
        <Champ label="Nom" htmlFor="phase-type-nom" requis erreur={errors.nom?.message}>
          <Input autoFocus {...ariaErreur('phase-type-nom', errors.nom)} {...register('nom')} />
        </Champ>
        <Champ label="Ordre" htmlFor="phase-type-ordre">
          <Input id="phase-type-ordre" type="number" step={1} {...register('ordre', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })} />
        </Champ>
      </div>
      <Champ label="Description" htmlFor="phase-type-description">
        <Textarea id="phase-type-description" rows={2} {...register('description')} />
      </Champ>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ label="Durée prévue" htmlFor="phase-type-duree" requis erreur={errors.duree?.message}>
          <Input
            type="number"
            min={1}
            step={1}
            {...ariaErreur('phase-type-duree', errors.duree)}
            {...register('duree', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
          />
        </Champ>
        <Champ label="Unité de durée" htmlFor="phase-type-unite">
          <NativeSelect id="phase-type-unite" {...register('uniteDuree')}>
            <option value="jour">Jour(s)</option>
            <option value="semaine">Semaine(s)</option>
            <option value="mois">Mois</option>
          </NativeSelect>
        </Champ>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        <Controller
          name="obligatoire"
          control={control}
          render={({ field }) => (
            <label htmlFor="phase-type-obligatoire" className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
              <span>
                <span className="block text-[14px] font-medium">Obligatoire</span>
                <span className="block text-[12px] text-muted-foreground">La phase doit être réalisée avant la clôture du marché.</span>
              </span>
              <Switch id="phase-type-obligatoire" checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
        {phase && (
          <Controller
            name="actif"
            control={control}
            render={({ field }) => (
              <label htmlFor="phase-type-actif" className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                <span>
                  <span className="block text-[14px] font-medium">Active</span>
                  <span className="block text-[12px] text-muted-foreground">Une phase inactive n'est plus dupliquée dans les nouveaux marchés.</span>
                </span>
                <Switch id="phase-type-actif" checked={field.value ?? true} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        )}
      </div>
    </FormDialog>
  );
}
