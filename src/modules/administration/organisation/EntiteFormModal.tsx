import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { UtilisateurOption } from '../../../services/administration/entites';
import type { TypeEntite } from '../../../services/administration/typeEntites';
import { slugifier } from '../../../utils/slug';

const schema = z.object({
  type_entite_id: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  libelle: z.string().min(1, 'Requis'),
  sigle: z.string().optional(),
  responsable_utilisateur_id: z.string().optional(),
  personne_receptrice_id: z.string().optional(),
});
export type EntiteFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  titre: string;
  valeursInitiales?: Partial<EntiteFormValues>;
  estNouveau: boolean;
  typeEntites: TypeEntite[];
  utilisateursOptions: UtilisateurOption[];
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: EntiteFormValues) => void;
}

export function EntiteFormModal({
  open,
  titre,
  valeursInitiales,
  estNouveau,
  typeEntites,
  utilisateursOptions,
  confirmLoading,
  onCancel,
  onSubmit,
}: Props) {
  const { control, handleSubmit, reset, setValue, watch } = useForm<EntiteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type_entite_id: '',
      code: '',
      libelle: '',
      sigle: '',
      responsable_utilisateur_id: '',
      personne_receptrice_id: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        type_entite_id: valeursInitiales?.type_entite_id ?? '',
        code: valeursInitiales?.code ?? '',
        libelle: valeursInitiales?.libelle ?? '',
        sigle: valeursInitiales?.sigle ?? '',
        responsable_utilisateur_id: valeursInitiales?.responsable_utilisateur_id ?? '',
        personne_receptrice_id: valeursInitiales?.personne_receptrice_id ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const libelle = watch('libelle');
  useEffect(() => {
    if (estNouveau && libelle) {
      setValue('code', slugifier(libelle));
    }
  }, [libelle, estNouveau, setValue]);

  return (
    <Modal
      open={open}
      title={titre}
      onCancel={onCancel}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={confirmLoading}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Type d'entité">
          <Controller
            name="type_entite_id"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={typeEntites.map((t) => ({ value: t.id, label: t.libelle }))}
                placeholder="Sélectionner un type"
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Libellé">
          <Controller name="libelle" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Code">
          <Controller name="code" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Sigle">
          <Controller name="sigle" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Responsable">
          <Controller
            name="responsable_utilisateur_id"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                placeholder="Aucun"
                options={utilisateursOptions.map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))}
              />
            )}
          />
        </Form.Item>
        <Form.Item
          label="Personne réceptrice des courriers"
          tooltip="Reçoit automatiquement une copie/notification des courriers imputés à cette entité. Distinct du responsable : souvent un secrétariat plutôt que le chef de l'entité."
        >
          <Controller
            name="personne_receptrice_id"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                placeholder="Aucune"
                options={utilisateursOptions.map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))}
              />
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
