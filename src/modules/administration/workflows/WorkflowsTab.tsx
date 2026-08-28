import { zodResolver } from '@hookform/resolvers/zod';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, Modal, Popconfirm, Select, Skeleton, Switch, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useModulesActions } from '../../../hooks/administration/useRolesAdmin';
import {
  useWorkflowDefinitionMutations,
  useWorkflowDefinitions,
} from '../../../hooks/administration/useWorkflowsAdmin';
import { useProfile } from '../../../hooks/useProfile';
import type { WorkflowDefinition } from '../../../services/administration/workflows';
import { slugifier } from '../../../utils/slug';
import { WorkflowAssociationsManager } from './WorkflowAssociationsManager';
import { WorkflowDiagram } from './WorkflowDiagram';
import { WorkflowEtapesManager } from './WorkflowEtapesManager';
import { WorkflowTransitionsManager } from './WorkflowTransitionsManager';

const schema = z.object({
  libelle: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function WorkflowsTab() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;
  const peutModifier = can('administration', 'modifier');
  const { modules } = useModulesActions();

  const [moduleId, setModuleId] = useState<string | undefined>();
  useEffect(() => {
    if (!moduleId && modules.data && modules.data.length > 0) {
      const courrier = modules.data.find((m) => m.code === 'courrier');
      setModuleId((courrier ?? modules.data[0]).id);
    }
  }, [modules.data, moduleId]);

  const { data: definitions, isLoading } = useWorkflowDefinitions(organisationId, moduleId);
  const { create, update, remove, setDefault } = useWorkflowDefinitionMutations(organisationId, moduleId);
  const [edition, setEdition] = useState<WorkflowDefinition | 'nouveau' | null>(null);
  const [selection, setSelection] = useState<WorkflowDefinition | null>(null);

  const { control, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { libelle: '', code: '', description: '' },
  });

  useEffect(() => {
    if (edition === 'nouveau') reset({ libelle: '', code: '', description: '' });
    else if (edition) reset({ libelle: edition.libelle, code: edition.code, description: edition.description ?? '' });
  }, [edition, reset]);

  const libelle = watch('libelle');
  useEffect(() => {
    if (edition === 'nouveau' && libelle) setValue('code', slugifier(libelle));
  }, [libelle, edition, setValue]);

  const onSubmit = (values: FormValues) => {
    if (edition === 'nouveau') {
      if (!organisationId || !moduleId) return;
      create.mutate(
        { organisation_id: organisationId, module_id: moduleId, code: values.code, libelle: values.libelle, description: values.description || null },
        { onSuccess: () => setEdition(null) },
      );
    } else if (edition) {
      update.mutate(
        { id: edition.id, patch: { libelle: values.libelle, description: values.description || null } },
        { onSuccess: () => setEdition(null) },
      );
    }
  };

  if (!organisationId) return <Skeleton active />;

  return (
    <div>
      <Typography.Paragraph type="secondary">
        Un workflow définit le circuit (étapes, transitions, acteurs autorisés) suivi par les
        courriers, documents ou missions. Aucun circuit n'est codé en dur : tout se configure ici.
      </Typography.Paragraph>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Select
          value={moduleId}
          onChange={(v) => { setModuleId(v); setSelection(null); }}
          style={{ width: 220 }}
          options={(modules.data ?? []).map((m) => ({ value: m.id, label: m.libelle }))}
        />
        {peutModifier && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEdition('nouveau')}>
            Nouveau workflow
          </Button>
        )}
      </div>

      <Table<WorkflowDefinition>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={definitions}
        pagination={false}
        onRow={(record) => ({ onClick: () => setSelection(record), style: { cursor: 'pointer' } })}
        rowClassName={(record) => (selection?.id === record.id ? 'ant-table-row-selected' : '')}
        columns={[
          { title: 'Libellé', dataIndex: 'libelle' },
          { title: 'Code', dataIndex: 'code' },
          {
            title: 'Actif',
            dataIndex: 'actif',
            width: 90,
            render: (v: boolean, r: WorkflowDefinition) => (
              <Switch size="small" checked={v} disabled={!peutModifier} onChange={(c) => update.mutate({ id: r.id, patch: { actif: c } })} />
            ),
          },
          {
            title: 'Par défaut',
            dataIndex: 'est_defaut',
            width: 100,
            render: (v: boolean, r: WorkflowDefinition) =>
              v ? (
                <Tag color="green">défaut</Tag>
              ) : (
                peutModifier && (
                  <Button size="small" loading={setDefault.isPending} onClick={() => setDefault.mutate(r.id)}>
                    Définir par défaut
                  </Button>
                )
              ),
          },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 140,
                  render: (_: unknown, record: WorkflowDefinition) => (
                    <span onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Button type="link" size="small" onClick={() => setEdition(record)}>
                        Modifier
                      </Button>
                      <Popconfirm title="Supprimer ce workflow ?" onConfirm={() => remove.mutate(record.id)}>
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

      {selection && moduleId && (
        <>
          <Divider />
          <Typography.Title level={4}>{selection.libelle}</Typography.Title>
          <WorkflowDiagram workflowDefinitionId={selection.id} peutModifier={peutModifier} />
          <Divider />
          <WorkflowEtapesManager workflowDefinitionId={selection.id} peutModifier={peutModifier} />
          <Divider />
          <WorkflowTransitionsManager
            workflowDefinitionId={selection.id}
            organisationId={organisationId}
            peutModifier={peutModifier}
          />
          <Divider />
          <WorkflowAssociationsManager
            workflowDefinitionId={selection.id}
            organisationId={organisationId}
            moduleId={moduleId}
            peutModifier={peutModifier}
          />
        </>
      )}

      <Modal
        open={edition !== null}
        title={edition === 'nouveau' ? 'Nouveau workflow' : 'Modifier le workflow'}
        onCancel={() => setEdition(null)}
        onOk={handleSubmit(onSubmit)}
        confirmLoading={create.isPending || update.isPending}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Libellé">
            <Controller name="libelle" control={control} render={({ field }) => <Input {...field} autoFocus />} />
          </Form.Item>
          <Form.Item label="Code">
            <Controller name="code" control={control} render={({ field }) => <Input {...field} disabled={edition !== 'nouveau'} />} />
          </Form.Item>
          <Form.Item label="Description">
            <Controller name="description" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} />} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
