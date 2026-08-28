import { zodResolver } from '@hookform/resolvers/zod';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Popconfirm, Select, Table, Tooltip, Typography, Modal } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEntites } from '../../../hooks/administration/useEntites';
import {
  useRegleNumerotationMutations,
  useReglesNumerotation,
} from '../../../hooks/administration/useParametrage';
import { useModulesActions } from '../../../hooks/administration/useRolesAdmin';
import type { RegleNumerotation } from '../../../services/administration/parametrage';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

const schema = z.object({
  moduleId: z.string().min(1, 'Requis'),
  entiteId: z.string().optional(),
  format: z.string().min(1, 'Requis'),
  reinitialisation: z.enum(['annuelle', 'mensuelle', 'jamais']),
  niveauRacineChemin: z.number().nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ReglesNumerotationManager({ organisationId, peutModifier }: Props) {
  const { data: regles, isLoading } = useReglesNumerotation(organisationId);
  const { modules } = useModulesActions();
  const { data: entites } = useEntites(organisationId);
  const { create, update, remove } = useRegleNumerotationMutations(organisationId);
  const [edition, setEdition] = useState<RegleNumerotation | 'nouveau' | null>(null);

  const moduleParId = useMemo(() => new Map((modules.data ?? []).map((m) => [m.id, m.libelle])), [modules.data]);
  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { moduleId: '', entiteId: '', format: '', reinitialisation: 'annuelle', niveauRacineChemin: null },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({ moduleId: '', entiteId: '', format: '', reinitialisation: 'annuelle', niveauRacineChemin: null });
    } else if (edition) {
      reset({
        moduleId: edition.module_id,
        entiteId: edition.entite_id ?? '',
        format: edition.format,
        reinitialisation: edition.reinitialisation,
        niveauRacineChemin: edition.niveau_racine_chemin,
      });
    }
  }, [edition, reset]);

  const onSubmit = (values: FormValues) => {
    const patch = {
      module_id: values.moduleId,
      entite_id: values.entiteId || null,
      format: values.format,
      reinitialisation: values.reinitialisation,
      niveau_racine_chemin: values.niveauRacineChemin ?? null,
    };
    if (edition === 'nouveau') {
      create.mutate({ organisation_id: organisationId, ...patch }, { onSuccess: () => setEdition(null) });
    } else if (edition) {
      update.mutate({ id: edition.id, patch }, { onSuccess: () => setEdition(null) });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Règles de numérotation
        </Typography.Title>
        {peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setEdition('nouveau')}>
            Ajouter une règle
          </Button>
        )}
      </div>
      <Typography.Paragraph type="secondary">
        Gabarit avec <code>{'{ANNEE}'}</code>, <code>{'{MOIS}'}</code>, <code>{'{SEQ}'}</code> ou{' '}
        <code>{'{SEQ:n}'}</code> (zéro-padding sur n chiffres), et pour intégrer l'organisation et
        l'entité qui traite le dossier : <code>{'{ORGANISATION}'}</code>, <code>{'{ENTITE}'}</code>{' '}
        (sigle de l'entité, ou son code si aucun sigle n'est renseigné) et{' '}
        <code>{'{CHEMIN_ENTITE}'}</code> (sigles des entités depuis la racine réelle de
        l'organigramme jusqu'à l'entité, séparés par « / » — laisser « Niveau racine » vide) — ex.{' '}
        <code>{'{ANNEE}/{ORGANISATION}/{CHEMIN_ENTITE}/{SEQ:5}'}</code> → <code>2026/DGDDI/DG/DIM/00002</code>.
      </Typography.Paragraph>
      <Table<RegleNumerotation>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={regles}
        pagination={false}
        columns={[
          { title: 'Module', render: (_, r) => moduleParId.get(r.module_id) ?? '—' },
          { title: 'Entité', render: (_, r) => (r.entite_id ? entiteParId.get(r.entite_id) : 'Organisation entière') },
          { title: 'Format', dataIndex: 'format' },
          { title: 'Séquence actuelle', dataIndex: 'sequence_courante', width: 130 },
          { title: 'Réinitialisation', dataIndex: 'reinitialisation', width: 130 },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 140,
                  render: (_: unknown, record: RegleNumerotation) => (
                    <span>
                      <Button type="link" size="small" onClick={() => setEdition(record)}>
                        Modifier
                      </Button>
                      <Popconfirm title="Supprimer cette règle ?" onConfirm={() => remove.mutate(record.id)}>
                        <Button type="link" size="small" danger>
                          Supprimer
                        </Button>
                      </Popconfirm>
                    </span>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Modal
        open={edition !== null}
        title={edition === 'nouveau' ? 'Nouvelle règle de numérotation' : 'Modifier la règle'}
        onCancel={() => setEdition(null)}
        onOk={handleSubmit(onSubmit)}
        confirmLoading={create.isPending || update.isPending}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Module">
            <Controller
              name="moduleId"
              control={control}
              render={({ field }) => (
                <Select {...field} options={(modules.data ?? []).map((m) => ({ value: m.id, label: m.libelle }))} />
              )}
            />
          </Form.Item>
          <Form.Item label="Entité (vide = règle par défaut de l'organisation)">
            <Controller
              name="entiteId"
              control={control}
              render={({ field }) => (
                <Select {...field} allowClear options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))} />
              )}
            />
          </Form.Item>
          <Tooltip title="Placeholders : {ANNEE}, {MOIS}, {SEQ}, {SEQ:n}, {ORGANISATION}, {ENTITE}, {CHEMIN_ENTITE}">
            <Form.Item label="Format">
              <Controller name="format" control={control} render={({ field }) => <Input {...field} placeholder="{ANNEE}/{ORGANISATION}/{CHEMIN_ENTITE}/{SEQ:5}" />} />
            </Form.Item>
          </Tooltip>
          <Form.Item label="Niveau racine du chemin d'entité (vide = depuis la racine, utilisé par {CHEMIN_ENTITE})">
            <Controller
              name="niveauRacineChemin"
              control={control}
              render={({ field }) => (
                <InputNumber {...field} min={0} style={{ width: '100%' }} placeholder="Depuis la racine" />
              )}
            />
          </Form.Item>
          <Form.Item label="Réinitialisation">
            <Controller
              name="reinitialisation"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={[
                    { value: 'annuelle', label: 'Annuelle' },
                    { value: 'mensuelle', label: 'Mensuelle' },
                    { value: 'jamais', label: 'Jamais' },
                  ]}
                />
              )}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
