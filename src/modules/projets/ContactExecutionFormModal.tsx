import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useContactExecutionMutations } from '../../hooks/projets/useContactsExecution';

const schema = z.object({
  nom: z.string().min(1, 'Requis'),
  fonction: z.string().optional(),
  email: z.string().optional(),
  telephone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  projetId: string;
  onClose: () => void;
}

const VIDE: FormValues = { nom: '', fonction: '', email: '', telephone: '' };

// §4 Contact de l'organisme chargé d'exécuter le projet (consultant,
// entreprise...) sans compte SIM — sert ensuite de responsable possible pour
// un livrable, ou de "chargé de l'exécution" du projet.
export function ContactExecutionFormModal({ open, projetId, onClose }: Props) {
  const { create } = useContactExecutionMutations(projetId);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  });

  useEffect(() => {
    if (open) reset(VIDE);
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    create.mutate(
      {
        projet_id: projetId,
        nom: values.nom,
        fonction: values.fonction || null,
        email: values.email || null,
        telephone: values.telephone || null,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      open={open}
      title="Ajouter un contact d'exécution"
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={create.isPending}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Nom">
          <Controller name="nom" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Fonction">
          <Controller name="fonction" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Email">
          <Controller name="email" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Téléphone">
          <Controller name="telephone" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
