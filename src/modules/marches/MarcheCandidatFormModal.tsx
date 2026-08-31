import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMarcheCandidatMutations } from '../../hooks/marches/useMarcheCandidats';
import type { MarcheCandidat } from '../../services/marches/candidats';

const schema = z.object({
  nom: z.string().min(1, 'Requis'),
  type: z.enum(['entreprise', 'consultant']),
  coordonnees: z.string().optional(),
  informationsComplementaires: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  marcheId: string;
  candidat?: MarcheCandidat | null;
  onClose: () => void;
}

const DEFAUTS: FormValues = { nom: '', type: 'entreprise', coordonnees: '', informationsComplementaires: '' };

// §15 — fonctionnalité optionnelle : entreprises/consultants participant à la procédure.
export function MarcheCandidatFormModal({ open, marcheId, candidat, onClose }: Props) {
  const { create, update } = useMarcheCandidatMutations(marcheId);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAUTS,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      candidat
        ? {
            nom: candidat.nom,
            type: candidat.type,
            coordonnees: candidat.coordonnees ?? '',
            informationsComplementaires: candidat.informations_complementaires ?? '',
          }
        : DEFAUTS,
    );
  }, [open, candidat, reset]);

  const enCours = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    const patch = {
      nom: values.nom,
      type: values.type,
      coordonnees: values.coordonnees || null,
      informations_complementaires: values.informationsComplementaires || null,
    };
    if (candidat) {
      update.mutate({ id: candidat.id, patch }, { onSuccess: () => onClose() });
    } else {
      create.mutate(patch, { onSuccess: () => onClose() });
    }
  };

  return (
    <Modal
      open={open}
      title={candidat ? 'Modifier le candidat' : 'Nouveau candidat'}
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={enCours}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Nom / raison sociale">
          <Controller name="nom" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Type">
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={[
                  { value: 'entreprise', label: 'Entreprise' },
                  { value: 'consultant', label: 'Consultant' },
                ]}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Coordonnées">
          <Controller name="coordonnees" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} />} />
        </Form.Item>
        <Form.Item label="Informations complémentaires">
          <Controller
            name="informationsComplementaires"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
