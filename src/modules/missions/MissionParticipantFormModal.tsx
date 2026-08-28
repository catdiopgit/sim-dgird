import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useMissionsReferentiel } from '../../hooks/missions/useMissions';
import { useParticipantMutations } from '../../hooks/missions/useParticipants';

const schema = z.object({
  utilisateurId: z.string().min(1, 'Requis'),
  roleParticipantValeurId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  missionId: string;
  onClose: () => void;
}

export function MissionParticipantFormModal({ open, organisationId, missionId, onClose }: Props) {
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: referentiel } = useMissionsReferentiel(organisationId);
  const { ajouter } = useParticipantMutations(missionId);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { utilisateurId: '', roleParticipantValeurId: '' },
  });

  useEffect(() => {
    if (open) reset({ utilisateurId: '', roleParticipantValeurId: '' });
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    ajouter.mutate(
      {
        mission_id: missionId,
        utilisateur_id: values.utilisateurId,
        role_participant_valeur_id: values.roleParticipantValeurId || null,
      },
      { onSuccess: () => onClose() },
    );
  };

  const optionsUtilisateurs = (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }));

  return (
    <Modal
      open={open}
      title="Ajouter un participant"
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={ajouter.isPending}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Utilisateur">
          <Controller
            name="utilisateurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                autoFocus
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={optionsUtilisateurs}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Rôle">
          <Controller
            name="roleParticipantValeurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(referentiel?.typesParticipant ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
