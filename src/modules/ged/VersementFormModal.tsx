import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEntites } from '../../hooks/administration/useEntites';
import { useDossiers } from '../../hooks/ged/useDossiers';
import { useCreerVersement } from '../../hooks/ged/useVersements';
import type { GedVersement } from '../../services/ged/versements';

const schema = z.object({
  objet: z.string().min(1, 'Requis'),
  entiteId: z.string().optional(),
  dossierCibleId: z.string().optional(),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  onClose: () => void;
  onCree: (versement: GedVersement) => void;
}

// Première étape du dépôt (GED V2) : constituer le brouillon (objet du lot,
// entité, dossier de classement cible — un seul dossier par versement). Les
// documents eux-mêmes sont ajoutés ensuite sur la fiche du versement.
export function VersementFormModal({ open, organisationId, onClose, onCree }: Props) {
  const { data: entites } = useEntites(organisationId);
  const { data: dossiers } = useDossiers(organisationId);
  const creer = useCreerVersement(organisationId);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { objet: '', entiteId: '', dossierCibleId: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ objet: '', entiteId: '', dossierCibleId: '', description: '' });
    }
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    creer.mutate(
      {
        p_objet: values.objet,
        p_entite_id: values.entiteId || null,
        p_dossier_cible_id: values.dossierCibleId || null,
        p_description: values.description || null,
      },
      { onSuccess: (versement) => onCree(versement) },
    );
  };

  return (
    <Modal
      open={open}
      title="Nouveau versement"
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={creer.isPending}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Objet du versement">
          <Controller name="objet" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>

        <Form.Item label="Entité">
          <Controller
            name="entiteId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Dossier de classement cible" help="Proposition — l'archiviste pourra la confirmer au classement">
          <Controller
            name="dossierCibleId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(dossiers ?? []).map((d) => ({ value: d.id, label: d.libelle }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Description">
          <Controller
            name="description"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
