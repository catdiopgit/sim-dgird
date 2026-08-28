import { zodResolver } from '@hookform/resolvers/zod';
import { DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useActionSuiviMutations } from '../../hooks/missions/useActionsSuivi';
import { useMissionsReferentiel } from '../../hooks/missions/useMissions';

const schema = z.object({
  description: z.string().min(1, 'Requis'),
  responsableId: z.string().optional(),
  dateEcheance: z.custom<dayjs.Dayjs | null>().optional(),
  statutValeurId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  missionId: string;
  onClose: () => void;
}

const DEFAUTS: FormValues = { description: '', responsableId: '', dateEcheance: null, statutValeurId: '' };

export function MissionActionSuiviFormModal({ open, organisationId, missionId, onClose }: Props) {
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: referentiel } = useMissionsReferentiel(organisationId);
  const { creer } = useActionSuiviMutations(missionId);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAUTS,
  });

  useEffect(() => {
    if (open) reset(DEFAUTS);
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    creer.mutate(
      {
        mission_id: missionId,
        description: values.description,
        responsable_id: values.responsableId || null,
        date_echeance: values.dateEcheance ? values.dateEcheance.format('YYYY-MM-DD') : null,
        statut_valeur_id: values.statutValeurId || null,
      },
      { onSuccess: () => onClose() },
    );
  };

  const optionsUtilisateurs = (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }));

  return (
    <Modal
      open={open}
      title="Ajouter une action de suivi"
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={creer.isPending}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Description">
          <Controller
            name="description"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} autoFocus />}
          />
        </Form.Item>
        <Form.Item label="Responsable">
          <Controller
            name="responsableId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={optionsUtilisateurs}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Échéance">
          <Controller
            name="dateEcheance"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Statut">
          <Controller
            name="statutValeurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(referentiel?.statutsAction ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
