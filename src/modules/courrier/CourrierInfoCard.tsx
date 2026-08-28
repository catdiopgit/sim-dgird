import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, DatePicker, Descriptions, Form, Input, Modal, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useCourrierReferentiel, useUpdateCourrier } from '../../hooks/courrier/useCourriers';
import type { Courrier, SensCourrier } from '../../services/courrier/courriers';

const LABEL_SENS: Record<SensCourrier, string> = {
  entrant: 'Entrant',
  sortant: 'Sortant',
  interne: 'Interne',
};

const schema = z.object({
  objet: z.string().min(1, 'Requis'),
  typeValeurId: z.string().optional(),
  prioriteValeurId: z.string().optional(),
  confidentialiteValeurId: z.string().optional(),
  modeTransmissionValeurId: z.string().optional(),
  dateCourrier: z.custom<dayjs.Dayjs | null>().optional(),
  expediteurNom: z.string().optional(),
  destinataireTexte: z.string().optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  courrier: Courrier;
  organisationId: string;
  entiteLibelle: string;
  peutModifier: boolean;
}

export function CourrierInfoCard({ courrier, organisationId, entiteLibelle, peutModifier }: Props) {
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const update = useUpdateCourrier(courrier.id);
  const [edition, setEdition] = useState(false);

  const typeLibelle = (referentiel?.types ?? []).find((v) => v.id === courrier.type_valeur_id)?.libelle;
  const prioriteInfo = (referentiel?.priorites ?? []).find((v) => v.id === courrier.priorite_valeur_id);
  const confidentialiteLibelle = (referentiel?.confidentialites ?? []).find(
    (v) => v.id === courrier.confidentialite_valeur_id,
  )?.libelle;
  const agentDestinataireLibelle = (utilisateurs ?? []).find((u) => u.id === courrier.agent_destinataire_id);
  const statutReceptionLibelle = (referentiel?.statutsReception ?? []).find(
    (v) => v.id === courrier.statut_reception_valeur_id,
  )?.libelle;

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { objet: '', observations: '' },
  });

  useEffect(() => {
    if (edition) {
      reset({
        objet: courrier.objet,
        typeValeurId: courrier.type_valeur_id ?? '',
        prioriteValeurId: courrier.priorite_valeur_id ?? '',
        confidentialiteValeurId: courrier.confidentialite_valeur_id ?? '',
        modeTransmissionValeurId: courrier.mode_transmission_valeur_id ?? '',
        dateCourrier: dayjs(courrier.date_courrier),
        expediteurNom: courrier.expediteur_nom ?? '',
        destinataireTexte: courrier.destinataire_texte ?? '',
        observations: courrier.observations ?? '',
      });
    }
  }, [edition, courrier, reset]);

  const onSubmit = (values: FormValues) => {
    update.mutate(
      {
        objet: values.objet,
        type_valeur_id: values.typeValeurId || null,
        priorite_valeur_id: values.prioriteValeurId || null,
        confidentialite_valeur_id: values.confidentialiteValeurId || null,
        mode_transmission_valeur_id: values.modeTransmissionValeurId || null,
        date_courrier: values.dateCourrier ? values.dateCourrier.format('YYYY-MM-DD') : courrier.date_courrier,
        expediteur_nom: values.expediteurNom || null,
        destinataire_texte: values.destinataireTexte || null,
        observations: values.observations || null,
      },
      { onSuccess: () => setEdition(false) },
    );
  };

  return (
    <Card
      title={
        <span>
          {courrier.numero} — <Tag>{LABEL_SENS[courrier.sens]}</Tag>
        </span>
      }
      extra={peutModifier && <Button onClick={() => setEdition(true)}>Modifier</Button>}
    >
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="Objet" span={2}>
          {courrier.objet}
        </Descriptions.Item>
        <Descriptions.Item label="Entité">{entiteLibelle}</Descriptions.Item>
        <Descriptions.Item label="Étape">{courrier.etape_libelle ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Type">{typeLibelle ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Priorité">
          {prioriteInfo ? <Tag color={prioriteInfo.couleur ?? undefined}>{prioriteInfo.libelle}</Tag> : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Confidentialité">{confidentialiteLibelle ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Date du courrier">
          {new Date(courrier.date_courrier).toLocaleDateString('fr-FR')}
        </Descriptions.Item>
        {courrier.sens === 'entrant' && (
          <>
            <Descriptions.Item label="Expéditeur">{courrier.expediteur_nom ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Statut à la réception">{statutReceptionLibelle ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Agent destinataire (imputation)">
              {agentDestinataireLibelle ? `${agentDestinataireLibelle.prenom} ${agentDestinataireLibelle.nom}` : '—'}
            </Descriptions.Item>
          </>
        )}
        {courrier.sens === 'sortant' && (
          <Descriptions.Item label="Destinataire" span={2}>
            {courrier.destinataire_texte ?? '—'}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Observations" span={2}>
          {courrier.observations ?? '—'}
        </Descriptions.Item>
      </Descriptions>

      <Modal
        open={edition}
        title="Modifier le courrier"
        onCancel={() => setEdition(false)}
        onOk={handleSubmit(onSubmit)}
        confirmLoading={update.isPending}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Objet">
            <Controller name="objet" control={control} render={({ field }) => <Input {...field} />} />
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
          {courrier.sens === 'entrant' && (
            <>
              <Form.Item label="Expéditeur">
                <Controller name="expediteurNom" control={control} render={({ field }) => <Input {...field} />} />
              </Form.Item>
            </>
          )}
          {courrier.sens === 'sortant' && (
            <>
              <Form.Item label="Destinataire">
                <Controller
                  name="destinataireTexte"
                  control={control}
                  render={({ field }) => <Input {...field} />}
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
          <Form.Item label="Observations">
            <Controller
              name="observations"
              control={control}
              render={({ field }) => <Input.TextArea {...field} rows={2} />}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
