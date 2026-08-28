import { zodResolver } from '@hookform/resolvers/zod';
import { PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Popconfirm, Select, Table, Tag, Tooltip, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useWorkflowEtapes,
  useWorkflowTransitionMutations,
  useWorkflowTransitions,
} from '../../../hooks/administration/useWorkflowsAdmin';
import type { WorkflowTransition } from '../../../services/administration/workflows';
import { slugifier } from '../../../utils/slug';
import { WorkflowActeursManager } from './WorkflowActeursManager';

const schema = z.object({
  libelle_action: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  etape_source_id: z.string().optional(),
  etape_cible_id: z.string().min(1, 'Requis'),
  type_action: z.string().optional(),
  conditionChamp: z.string().optional(),
  conditionOperateur: z.string().optional(),
  conditionValeur: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const OPTIONS_TYPE_ACTION = [
  { value: 'imputation', label: 'Imputation' },
  { value: 'affectation', label: 'Affectation' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'redirection', label: 'Redirection' },
];

interface Props {
  workflowDefinitionId: string;
  organisationId: string;
  peutModifier: boolean;
}

export function WorkflowTransitionsManager({ workflowDefinitionId, organisationId, peutModifier }: Props) {
  const { data: transitions, isLoading } = useWorkflowTransitions(workflowDefinitionId);
  const { data: etapes } = useWorkflowEtapes(workflowDefinitionId);
  const { create, update, remove } = useWorkflowTransitionMutations(workflowDefinitionId);
  const [edition, setEdition] = useState<WorkflowTransition | 'nouveau' | null>(null);
  const [acteursDe, setActeursDe] = useState<WorkflowTransition | null>(null);

  const etapeParId = useMemo(() => new Map((etapes ?? []).map((e) => [e.id, e.libelle])), [etapes]);
  const optionsEtapes = (etapes ?? []).map((e) => ({ value: e.id, label: e.libelle }));

  const { control, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      libelle_action: '',
      code: '',
      etape_source_id: '',
      etape_cible_id: '',
      type_action: '',
      conditionChamp: '',
      conditionOperateur: '=',
      conditionValeur: '',
    },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({
        libelle_action: '',
        code: '',
        etape_source_id: '',
        etape_cible_id: '',
        type_action: '',
        conditionChamp: '',
        conditionOperateur: '=',
        conditionValeur: '',
      });
    } else if (edition) {
      const condition = edition.condition as { champ?: string; operateur?: string; valeur?: string } | null;
      reset({
        libelle_action: edition.libelle_action,
        code: edition.code,
        etape_source_id: edition.etape_source_id ?? '',
        etape_cible_id: edition.etape_cible_id,
        type_action: edition.type_action ?? '',
        conditionChamp: condition?.champ ?? '',
        conditionOperateur: condition?.operateur ?? '=',
        conditionValeur: condition?.valeur ?? '',
      });
    }
  }, [edition, reset]);

  const libelleAction = watch('libelle_action');
  useEffect(() => {
    if (edition === 'nouveau' && libelleAction) setValue('code', slugifier(libelleAction));
  }, [libelleAction, edition, setValue]);

  const onSubmit = (values: FormValues) => {
    const condition =
      values.conditionChamp && values.conditionValeur
        ? { champ: values.conditionChamp, operateur: values.conditionOperateur || '=', valeur: values.conditionValeur }
        : null;
    const patch = {
      libelle_action: values.libelle_action,
      code: values.code,
      etape_source_id: values.etape_source_id || null,
      etape_cible_id: values.etape_cible_id,
      type_action: (values.type_action || null) as WorkflowTransition['type_action'],
      condition,
    };
    if (edition === 'nouveau') {
      create.mutate({ workflow_definition_id: workflowDefinitionId, ...patch }, { onSuccess: () => setEdition(null) });
    } else if (edition) {
      update.mutate({ id: edition.id, patch }, { onSuccess: () => setEdition(null) });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Transitions
        </Typography.Title>
        {peutModifier && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setEdition('nouveau')}>
            Ajouter une transition
          </Button>
        )}
      </div>
      <Table<WorkflowTransition>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={transitions}
        pagination={false}
        columns={[
          { title: 'Action', dataIndex: 'libelle_action' },
          {
            title: 'De',
            render: (_, t) => (t.etape_source_id ? (etapeParId.get(t.etape_source_id) ?? '—') : "N'importe où"),
          },
          { title: 'Vers', render: (_, t) => etapeParId.get(t.etape_cible_id) ?? '—' },
          {
            title: 'Type d\'action',
            width: 120,
            render: (_, t) =>
              t.type_action ? (
                <Tag>{OPTIONS_TYPE_ACTION.find((o) => o.value === t.type_action)?.label ?? t.type_action}</Tag>
              ) : (
                '—'
              ),
          },
          {
            title: 'Condition',
            render: (_, t) => {
              const c = t.condition as { champ?: string; operateur?: string; valeur?: string } | null;
              return c?.champ ? (
                <Tooltip title={JSON.stringify(c)}>
                  {c.champ} {c.operateur} {c.valeur}
                </Tooltip>
              ) : (
                '—'
              );
            },
          },
          {
            title: 'Acteurs',
            width: 90,
            render: (_: unknown, t: WorkflowTransition) => (
              <Button type="link" size="small" icon={<TeamOutlined />} onClick={() => setActeursDe(t)}>
                Gérer
              </Button>
            ),
          },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 140,
                  render: (_: unknown, record: WorkflowTransition) => (
                    <span>
                      <Button type="link" size="small" onClick={() => setEdition(record)}>
                        Modifier
                      </Button>
                      <Popconfirm title="Supprimer cette transition ?" onConfirm={() => remove.mutate(record.id)}>
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
        title={edition === 'nouveau' ? 'Nouvelle transition' : 'Modifier la transition'}
        onCancel={() => setEdition(null)}
        onOk={handleSubmit(onSubmit)}
        confirmLoading={create.isPending || update.isPending}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Libellé de l'action">
            <Controller
              name="libelle_action"
              control={control}
              render={({ field }) => <Input {...field} autoFocus placeholder="Ex: Valider" />}
            />
          </Form.Item>
          <Form.Item label="Code">
            <Controller name="code" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
          <Form.Item label="Étape de départ (vide = n'importe quelle étape)">
            <Controller
              name="etape_source_id"
              control={control}
              render={({ field }) => <Select {...field} allowClear options={optionsEtapes} />}
            />
          </Form.Item>
          <Form.Item label="Étape d'arrivée">
            <Controller
              name="etape_cible_id"
              control={control}
              render={({ field }) => <Select {...field} options={optionsEtapes} />}
            />
          </Form.Item>
          <Tooltip title="Détermine si cette transition ouvre la fenêtre modale d'action (Imputer à / En copie / Actions demandées) au lieu d'une simple confirmation — courriers arrivés uniquement.">
            <Form.Item label="Type d'action (courriers arrivés)">
              <Controller
                name="type_action"
                control={control}
                render={({ field }) => <Select {...field} allowClear options={OPTIONS_TYPE_ACTION} placeholder="Aucun (confirmation simple)" />}
              />
            </Form.Item>
          </Tooltip>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Condition optionnelle (ex: priorite_valeur_id = &lt;id&gt;) — laisser le champ vide pour une
            transition sans condition.
          </Typography.Text>
          <Form.Item label="Champ">
            <Controller name="conditionChamp" control={control} render={({ field }) => <Input {...field} placeholder="Ex: priorite_valeur_id" />} />
          </Form.Item>
          <Form.Item label="Opérateur">
            <Controller
              name="conditionOperateur"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={['=', '<>', 'in', '>', '<', '>=', '<='].map((o) => ({ value: o, label: o }))}
                />
              )}
            />
          </Form.Item>
          <Form.Item label="Valeur">
            <Controller name="conditionValeur" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
        </Form>
      </Modal>

      <WorkflowActeursManager
        open={acteursDe !== null}
        transitionId={acteursDe?.id ?? null}
        libelleAction={acteursDe?.libelle_action ?? ''}
        organisationId={organisationId}
        peutModifier={peutModifier}
        onClose={() => setActeursDe(null)}
      />
    </div>
  );
}
