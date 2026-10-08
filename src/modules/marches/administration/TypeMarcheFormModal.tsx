import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../../components/form/champ';
import { FormDialog } from '../../../components/form/form-dialog';
import { Input, Textarea } from '../../../components/ui/input';
import { Switch } from '../../../components/ui/switch';
import { useTypeMarcheMutations } from '../../../hooks/marches/useTypesMarche';
import { ariaErreur } from '../../../lib/form';
import type { TypeMarche } from '../../../services/marches/typesMarche';

const schema = z.object({
  code: z.string().min(1, 'Requis'),
  libelle: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  ordre: z.number().optional(),
  actif: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  type?: TypeMarche | null;
  onClose: () => void;
}

const DEFAUTS: FormValues = { code: '', libelle: '', description: '', ordre: 0, actif: true };

// §7 Paramétrage — types de marché, entièrement paramétrables depuis l'administration.
export function TypeMarcheFormModal({ open, organisationId, type, onClose }: Props) {
  const { create, update } = useTypeMarcheMutations();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAUTS });

  useEffect(() => {
    if (!open) return;
    reset(type ? { code: type.code, libelle: type.libelle, description: type.description ?? '', ordre: type.ordre, actif: type.actif } : DEFAUTS);
  }, [open, type, reset]);

  const onSubmit = (values: FormValues) => {
    const patch = {
      code: values.code,
      libelle: values.libelle,
      description: values.description || null,
      ordre: values.ordre ?? 0,
      ...(type ? { actif: values.actif ?? true } : {}),
    };
    if (type) {
      update.mutate({ id: type.id, patch }, { onSuccess: () => onClose() });
    } else {
      create.mutate({ ...patch, organisation_id: organisationId }, { onSuccess: () => onClose() });
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre={type ? 'Modifier le type de marché' : 'Nouveau type de marché'}
      onSubmit={handleSubmit(onSubmit)}
      enCours={create.isPending || update.isPending}
      libelleValider={type ? 'Enregistrer' : 'Créer le type'}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
        <Champ label="Code" htmlFor="type-marche-code" requis erreur={errors.code?.message}>
          <Input autoFocus className="font-mono" {...ariaErreur('type-marche-code', errors.code)} {...register('code')} />
        </Champ>
        <Champ label="Ordre" htmlFor="type-marche-ordre">
          <Input id="type-marche-ordre" type="number" step={1} {...register('ordre', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })} />
        </Champ>
      </div>
      <Champ label="Libellé" htmlFor="type-marche-libelle" requis erreur={errors.libelle?.message}>
        <Input {...ariaErreur('type-marche-libelle', errors.libelle)} {...register('libelle')} />
      </Champ>
      <Champ label="Description" htmlFor="type-marche-description">
        <Textarea id="type-marche-description" rows={2} {...register('description')} />
      </Champ>
      {type && (
        <div className="rounded-lg border border-border">
          <Controller
            name="actif"
            control={control}
            render={({ field }) => (
              <label htmlFor="type-marche-actif" className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                <span>
                  <span className="block text-[14px] font-medium">Actif</span>
                  <span className="block text-[12px] text-muted-foreground">Un type inactif n'est plus proposé à la création d'un marché.</span>
                </span>
                <Switch id="type-marche-actif" checked={field.value ?? true} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        </div>
      )}
    </FormDialog>
  );
}
