import { zodResolver } from '@hookform/resolvers/zod';
import { DatePicker, Form, Input, Modal, Segmented, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useCourrierReferentiel, useCreerCourrier } from '../../hooks/courrier/useCourriers';
import type { Courrier, SensCourrier } from '../../services/courrier/courriers';

const schema = z.object({
  sens: z.enum(['entrant', 'sortant', 'interne']),
  entiteId: z.string().min(1, 'Requis'),
  objet: z.string().min(1, 'Requis'),
  typeValeurId: z.string().optional(),
  prioriteValeurId: z.string().optional(),
  confidentialiteValeurId: z.string().optional(),
  modeTransmissionValeurId: z.string().optional(),
  dateCourrier: z.custom<dayjs.Dayjs | null>().optional(),
  dateReception: z.custom<dayjs.Dayjs | null>().optional(),
  dateEnvoi: z.custom<dayjs.Dayjs | null>().optional(),
  expediteurNom: z.string().optional(),
  expediteurTypeValeurId: z.string().optional(),
  destinataireTexte: z.string().optional(),
  entiteDestinataireId: z.string().optional(),
  agentDestinataireId: z.string().optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  sensInitial: SensCourrier;
  onClose: () => void;
  onCree: (courrier: Courrier) => void;
}

const LABEL_SENS: Record<SensCourrier, string> = {
  entrant: 'Entrant',
  sortant: 'Sortant',
  interne: 'Interne',
};

export function CourrierFormModal({ open, organisationId, sensInitial, onClose, onCree }: Props) {
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const creer = useCreerCourrier(organisationId);

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sens: sensInitial,
      entiteId: '',
      objet: '',
      typeValeurId: '',
      prioriteValeurId: '',
      confidentialiteValeurId: '',
      modeTransmissionValeurId: '',
      dateCourrier: dayjs(),
      dateReception: null,
      dateEnvoi: null,
      expediteurNom: '',
      expediteurTypeValeurId: '',
      destinataireTexte: '',
      entiteDestinataireId: '',
      agentDestinataireId: '',
      observations: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        sens: sensInitial,
        entiteId: '',
        objet: '',
        typeValeurId: '',
        prioriteValeurId: '',
        confidentialiteValeurId: '',
        modeTransmissionValeurId: '',
        dateCourrier: dayjs(),
        dateReception: null,
        dateEnvoi: null,
        expediteurNom: '',
        expediteurTypeValeurId: '',
        destinataireTexte: '',
        entiteDestinataireId: '',
        agentDestinataireId: '',
        observations: '',
      });
    }
  }, [open, sensInitial, reset]);

  const sens = watch('sens');

  const onSubmit = (values: FormValues) => {
    creer.mutate(
      {
        p_entite_id: values.entiteId,
        p_sens: values.sens,
        p_objet: values.objet,
        p_type_valeur_id: values.typeValeurId || null,
        p_priorite_valeur_id: values.prioriteValeurId || null,
        p_confidentialite_valeur_id: values.confidentialiteValeurId || null,
        p_mode_transmission_valeur_id: values.modeTransmissionValeurId || null,
        p_date_courrier: values.dateCourrier ? values.dateCourrier.format('YYYY-MM-DD') : null,
        p_date_reception: values.dateReception ? values.dateReception.toISOString() : null,
        p_date_envoi: values.dateEnvoi ? values.dateEnvoi.toISOString() : null,
        p_expediteur_nom: values.expediteurNom || null,
        p_expediteur_type_valeur_id: values.expediteurTypeValeurId || null,
        p_destinataire_texte: values.destinataireTexte || null,
        p_entite_destinataire_id: values.entiteDestinataireId || null,
        p_agent_destinataire_id: values.agentDestinataireId || null,
        p_observations: values.observations || null,
      },
      { onSuccess: (courrier) => onCree(courrier) },
    );
  };

  return (
    <Modal
      open={open}
      title="Nouveau courrier"
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={creer.isPending}
      width={640}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Sens">
          <Controller
            name="sens"
            control={control}
            render={({ field }) => (
              <Segmented
                {...field}
                options={(['entrant', 'sortant', 'interne'] as SensCourrier[]).map((s) => ({
                  value: s,
                  label: LABEL_SENS[s],
                }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Entité en charge">
          <Controller
            name="entiteId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Sélectionner une entité"
                options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Objet">
          <Controller name="objet" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>

        <Form.Item label="Type de courrier">
          <Controller
            name="typeValeurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(referentiel?.types ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Priorité">
          <Controller
            name="prioriteValeurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(referentiel?.priorites ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Confidentialité">
          <Controller
            name="confidentialiteValeurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(referentiel?.confidentialites ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Date du courrier">
          <Controller
            name="dateCourrier"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>

        {sens === 'entrant' && (
          <>
            <Form.Item label="Date de réception">
              <Controller
                name="dateReception"
                control={control}
                render={({ field }) => <DatePicker {...field} showTime style={{ width: '100%' }} />}
              />
            </Form.Item>
            <Form.Item label="Expéditeur">
              <Controller
                name="expediteurNom"
                control={control}
                render={({ field }) => <Input {...field} placeholder="Nom de l'expéditeur" />}
              />
            </Form.Item>
            <Form.Item label="Type d'expéditeur">
              <Controller
                name="expediteurTypeValeurId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    allowClear
                    options={(referentiel?.typesExpediteur ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
                  />
                )}
              />
            </Form.Item>
            <Form.Item label="Agent destinataire">
              <Controller
                name="agentDestinataireId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    allowClear
                    options={(utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))}
                  />
                )}
              />
            </Form.Item>
          </>
        )}

        {sens === 'sortant' && (
          <>
            <Form.Item label="Date d'envoi">
              <Controller
                name="dateEnvoi"
                control={control}
                render={({ field }) => <DatePicker {...field} showTime style={{ width: '100%' }} />}
              />
            </Form.Item>
            <Form.Item label="Destinataire">
              <Controller
                name="destinataireTexte"
                control={control}
                render={({ field }) => <Input {...field} placeholder="Nom du destinataire" />}
              />
            </Form.Item>
            <Form.Item label="Mode de transmission">
              <Controller
                name="modeTransmissionValeurId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    allowClear
                    options={(referentiel?.modesTransmission ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
                  />
                )}
              />
            </Form.Item>
          </>
        )}

        {sens === 'interne' && (
          <>
            <Form.Item label="Entité destinataire">
              <Controller
                name="entiteDestinataireId"
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
            <Form.Item label="Agent destinataire">
              <Controller
                name="agentDestinataireId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    allowClear
                    options={(utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))}
                  />
                )}
              />
            </Form.Item>
          </>
        )}

        <Form.Item label="Observations">
          <Controller
            name="observations"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
