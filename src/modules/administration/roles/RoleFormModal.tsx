import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Role } from '../../../services/administration/roles';
import { slugifier } from '../../../utils/slug';

const schema = z.object({
  code: z.string().min(1, 'Requis'),
  libelle: z.string().min(1, 'Requis'),
  description: z.string().optional(),
});
export type RoleFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  role?: Role | null;
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: RoleFormValues) => void;
}

export function RoleFormModal({ open, role, confirmLoading, onCancel, onSubmit }: Props) {
  const estNouveau = !role;
  const { control, handleSubmit, reset, setValue, watch } = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', libelle: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ code: role?.code ?? '', libelle: role?.libelle ?? '', description: role?.description ?? '' });
    }
  }, [open, role, reset]);

  const libelle = watch('libelle');
  useEffect(() => {
    if (estNouveau && libelle) setValue('code', slugifier(libelle));
  }, [libelle, estNouveau, setValue]);

  return (
    <Modal
      open={open}
      title={estNouveau ? 'Nouveau rôle' : 'Modifier le rôle'}
      onCancel={onCancel}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={confirmLoading}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Libellé">
          <Controller name="libelle" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Code">
          <Controller name="code" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Description">
          <Controller name="description" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} />} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
