import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEntites } from '../../hooks/administration/useEntites';
import { useCreerDossierGed, useModifierDossierGed } from '../../hooks/ged/useDossiers';
import type { GedDossier } from '../../services/ged/dossiers';

const schema = z.object({
  libelle: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  entiteId: z.string().optional(),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  // Dossier à renommer (édition) ; absent = création.
  dossier?: GedDossier | null;
  // Parent pré-rempli pour une création lancée depuis un nœud de l'arbre.
  parentDossierId?: string | null;
  onClose: () => void;
  // Notifié avec le dossier créé (pas en édition) — permet par exemple au
  // Classement documentaire de sélectionner immédiatement le nouveau dossier.
  onCree?: (dossier: GedDossier) => void;
}

export function DossierFormModal({ open, organisationId, dossier, parentDossierId, onClose, onCree }: Props) {
  const { data: entites } = useEntites(organisationId);
  const creer = useCreerDossierGed(organisationId);
  const modifier = useModifierDossierGed(organisationId);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { libelle: '', code: '', entiteId: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        libelle: dossier?.libelle ?? '',
        code: dossier?.code ?? '',
        entiteId: dossier?.entite_id ?? '',
        description: dossier?.description ?? '',
      });
    }
  }, [open, dossier, reset]);

  const enCours = creer.isPending || modifier.isPending;

  const onSubmit = (values: FormValues) => {
    if (dossier) {
      modifier.mutate(
        {
          p_dossier_id: dossier.id,
          p_libelle: values.libelle,
          p_description: values.description || null,
        },
        { onSuccess: () => onClose() },
      );
    } else {
      creer.mutate(
        {
          p_libelle: values.libelle,
          p_code: values.code,
          p_entite_id: values.entiteId || null,
          p_parent_dossier_id: parentDossierId ?? null,
          p_description: values.description || null,
        },
        {
          onSuccess: (nouveauDossier) => {
            onCree?.(nouveauDossier);
            onClose();
          },
        },
      );
    }
  };

  return (
    <Modal
      open={open}
      title={dossier ? 'Renommer le dossier' : 'Nouveau dossier'}
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={enCours}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Libellé">
          <Controller name="libelle" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>

        {!dossier && (
          <Form.Item label="Code" help="Identifiant court, unique dans l'organisation">
            <Controller name="code" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
        )}

        {!dossier && (
          <Form.Item label="Entité" help="Laisser vide pour un dossier transverse (partagé par toute l'organisation)">
            <Controller
              name="entiteId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  allowClear
                  placeholder="Dossier transverse"
                  options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))}
                />
              )}
            />
          </Form.Item>
        )}

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
