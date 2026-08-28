import { zodResolver } from '@hookform/resolvers/zod';
import { DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useMissionMutations } from '../../hooks/missions/useMissions';
import type { Mission } from '../../services/missions/missions';

const schema = z
  .object({
    entiteId: z.string().min(1, 'Requis'),
    objet: z.string().min(1, 'Requis'),
    responsableId: z.string().optional(),
    lieu: z.string().optional(),
    dateDepart: z.custom<dayjs.Dayjs>(),
    dateRetour: z.custom<dayjs.Dayjs>(),
    objectifs: z.string().optional(),
    activitesPrevues: z.string().optional(),
    budgetPrevu: z.number().optional(),
  })
  .refine((v) => !v.dateDepart || !v.dateRetour || !v.dateRetour.isBefore(v.dateDepart), {
    message: 'La date de retour doit être postérieure à la date de départ',
    path: ['dateRetour'],
  });
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  mission?: Mission | null;
  onClose: () => void;
  onCree?: (mission: Mission) => void;
}

const DEFAUTS: FormValues = {
  entiteId: '',
  objet: '',
  responsableId: '',
  lieu: '',
  dateDepart: dayjs(),
  dateRetour: dayjs().add(1, 'day'),
  objectifs: '',
  activitesPrevues: '',
  budgetPrevu: undefined,
};

// Seule la création passe par fn_creer_mission (numérotation + démarrage du
// workflow) — la modification ne touche que les champs descriptifs, jamais
// reference/workflow_instance_id/etape_*, gérés uniquement côté workflow.
export function MissionFormModal({ open, organisationId, mission, onClose, onCree }: Props) {
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { create, update } = useMissionMutations(organisationId);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAUTS,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      mission
        ? {
            entiteId: mission.entite_id,
            objet: mission.objet,
            responsableId: mission.responsable_id ?? '',
            lieu: mission.lieu ?? '',
            dateDepart: dayjs(mission.date_depart),
            dateRetour: dayjs(mission.date_retour),
            objectifs: mission.objectifs ?? '',
            activitesPrevues: mission.activites_prevues ?? '',
            budgetPrevu: mission.budget_prevu ?? undefined,
          }
        : DEFAUTS,
    );
  }, [open, mission, reset]);

  const enCours = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    if (mission) {
      update.mutate(
        {
          id: mission.id,
          patch: {
            entite_id: values.entiteId,
            objet: values.objet,
            responsable_id: values.responsableId || null,
            lieu: values.lieu || null,
            date_depart: values.dateDepart.format('YYYY-MM-DD'),
            date_retour: values.dateRetour.format('YYYY-MM-DD'),
            objectifs: values.objectifs || null,
            activites_prevues: values.activitesPrevues || null,
            budget_prevu: values.budgetPrevu ?? null,
          },
        },
        { onSuccess: () => onClose() },
      );
    } else {
      create.mutate(
        {
          entite_id: values.entiteId,
          objet: values.objet,
          responsable_id: values.responsableId || null,
          lieu: values.lieu || null,
          date_depart: values.dateDepart.format('YYYY-MM-DD'),
          date_retour: values.dateRetour.format('YYYY-MM-DD'),
          objectifs: values.objectifs || null,
          activites_prevues: values.activitesPrevues || null,
          budget_prevu: values.budgetPrevu ?? null,
        },
        {
          onSuccess: (nouvelleMission) => {
            onCree?.(nouvelleMission);
            onClose();
          },
        },
      );
    }
  };

  const optionsUtilisateurs = (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }));

  return (
    <Modal
      open={open}
      title={mission ? 'Modifier la mission' : 'Nouvelle mission'}
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={enCours}
      destroyOnHidden
      width={640}
    >
      <Form layout="vertical">
        <Form.Item label="Objet">
          <Controller name="objet" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Entité">
          <Controller
            name="entiteId"
            control={control}
            render={({ field }) => (
              <Select {...field} options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))} />
            )}
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
        <Form.Item label="Lieu">
          <Controller name="lieu" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Date de départ">
          <Controller
            name="dateDepart"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Date de retour">
          <Controller
            name="dateRetour"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Objectifs">
          <Controller name="objectifs" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} />} />
        </Form.Item>
        <Form.Item label="Activités prévues">
          <Controller
            name="activitesPrevues"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} />}
          />
        </Form.Item>
        <Form.Item label="Budget prévu">
          <Controller
            name="budgetPrevu"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={0} style={{ width: '100%' }} onChange={(v) => field.onChange(v ?? undefined)} />
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
