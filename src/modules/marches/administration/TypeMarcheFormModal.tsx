import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, InputNumber, Modal, Switch } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTypeMarcheMutations } from '../../../hooks/marches/useTypesMarche';
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

  const { control, handleSubmit, reset } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAUTS });

  useEffect(() => {
    if (!open) return;
    reset(
      type
        ? { code: type.code, libelle: type.libelle, description: type.description ?? '', ordre: type.ordre, actif: type.actif }
        : DEFAUTS,
    );
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
    <Modal
      open={open}
      title={type ? 'Modifier le type de marché' : 'Nouveau type de marché'}
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={create.isPending || update.isPending}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Code">
          <Controller name="code" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Libellé">
          <Controller name="libelle" control={control} render={({ field }) => <Input {...field} />} />
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
        {type && (
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
