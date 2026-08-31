import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, DatePicker, Descriptions, Empty, Form, Input, InputNumber, Select, Skeleton } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMarcheAttribution, useMarcheAttributionMutation } from '../../hooks/marches/useMarcheAttribution';
import { useMarcheCandidats } from '../../hooks/marches/useMarcheCandidats';

const schema = z.object({
  candidatAttributaireId: z.string().min(1, 'Requis'),
  montantAttribue: z.number().optional(),
  dateAttribution: z.custom<dayjs.Dayjs | null>().optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  marcheId: string;
  peutModifier: boolean;
}

// §16 Attribution du marché — l'attributaire est sélectionné parmi les
// entreprises/consultants déjà enregistrés pour ce marché (server/marches/
// marche-attributions.service.ts le vérifie explicitement).
export function MarcheAttributionTab({ marcheId, peutModifier }: Props) {
  const { data: attribution, isLoading } = useMarcheAttribution(marcheId);
  const { data: candidats } = useMarcheCandidats(marcheId);
  const enregistrer = useMarcheAttributionMutation(marcheId);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { candidatAttributaireId: '', montantAttribue: undefined, dateAttribution: null, observations: '' },
  });

  useEffect(() => {
    reset(
      attribution
        ? {
            candidatAttributaireId: attribution.candidat_attributaire_id,
            montantAttribue: attribution.montant_attribue ?? undefined,
            dateAttribution: attribution.date_attribution ? dayjs(attribution.date_attribution) : null,
            observations: attribution.observations ?? '',
          }
        : { candidatAttributaireId: '', montantAttribue: undefined, dateAttribution: null, observations: '' },
    );
  }, [attribution, reset]);

  const candidatParId = useMemo(() => new Map((candidats ?? []).map((c) => [c.id, c.nom])), [candidats]);

  const onSubmit = (values: FormValues) => {
    enregistrer.mutate({
      candidat_attributaire_id: values.candidatAttributaireId,
      montant_attribue: values.montantAttribue ?? null,
      date_attribution: values.dateAttribution ? values.dateAttribution.format('YYYY-MM-DD') : null,
      observations: values.observations || null,
    });
  };

  if (isLoading) return <Skeleton active />;

  if (!peutModifier) {
    return (
      <Card title="Attribution">
        {attribution ? (
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Attributaire">{candidatParId.get(attribution.candidat_attributaire_id) ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Montant attribué">
              {attribution.montant_attribue != null ? `${attribution.montant_attribue.toLocaleString('fr-FR')} FCFA` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Date d'attribution">
              {attribution.date_attribution ? new Date(attribution.date_attribution).toLocaleDateString('fr-FR') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Observations">{attribution.observations ?? '—'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="Aucune attribution enregistrée." />
        )}
      </Card>
    );
  }

  if (!candidats || candidats.length === 0) {
    return (
      <Card title="Attribution">
        <Empty description="Ajoutez au moins un candidat (onglet Entreprises et consultants) avant d'enregistrer l'attribution." />
      </Card>
    );
  }

  return (
    <Card title="Attribution du marché">
      <Form layout="vertical">
        <Form.Item label="Entreprise / consultant attributaire">
          <Controller
            name="candidatAttributaireId"
            control={control}
            render={({ field }) => (
              <Select {...field} options={candidats.map((c) => ({ value: c.id, label: c.nom }))} />
            )}
          />
        </Form.Item>
        <Form.Item label="Montant attribué">
          <Controller
            name="montantAttribue"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={0} style={{ width: '100%' }} onChange={(v) => field.onChange(v ?? undefined)} />
            )}
          />
        </Form.Item>
        <Form.Item label="Date d'attribution">
          <Controller
            name="dateAttribution"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Observations">
          <Controller name="observations" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} />} />
        </Form.Item>
        <Button type="primary" loading={enregistrer.isPending} onClick={handleSubmit(onSubmit)}>
          Enregistrer l'attribution
        </Button>
      </Form>
      <Card size="small" style={{ marginTop: 16 }} type="inner" title="Avis d'attribution">
        Les avis d'attribution provisoire et définitive s'ajoutent depuis l'onglet Documents (joindre un document de type
        approprié, rattaché directement au marché).
      </Card>
    </Card>
  );
}
