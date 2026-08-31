import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { usePhaseTypeMarcheMutations } from '../../../hooks/marches/useTypesMarche';
import type { PhaseTypeMarche } from '../../../services/marches/typesMarche';

const schema = z.object({
  nom: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  ordre: z.number().optional(),
  duree: z.number().min(1, 'Doit être supérieur à 0'),
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

  const { control, handleSubmit, reset } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAUTS });

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
    <Modal
      open={open}
      title={phase ? 'Modifier la phase' : 'Nouvelle phase'}
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={create.isPending || update.isPending}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Nom">
          <Controller name="nom" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Description">
          <Controller name="description" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} />} />
        </Form.Item>
        <Form.Item label="Ordre">
          <Controller
            name="ordre"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} style={{ width: '100%' }} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Form.Item>
        <Form.Item label="Durée prévue">
          <Controller
            name="duree"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={1} style={{ width: '100%' }} onChange={(v) => field.onChange(v ?? 1)} />
            )}
          />
        </Form.Item>
        <Form.Item label="Unité de durée">
          <Controller
            name="uniteDuree"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={[
                  { value: 'jour', label: 'Jour(s)' },
                  { value: 'semaine', label: 'Semaine(s)' },
                  { value: 'mois', label: 'Mois' },
                ]}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Obligatoire">
          <Controller
            name="obligatoire"
            control={control}
            render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
          />
        </Form.Item>
        {phase && (
          <Form.Item label="Actif">
            <Controller
              name="actif"
              control={control}
              render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
