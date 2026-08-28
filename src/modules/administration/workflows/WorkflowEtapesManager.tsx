import { zodResolver } from '@hookform/resolvers/zod';
import { PlusOutlined } from '@ant-design/icons';
import {
  Button,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useWorkflowEtapeMutations,
  useWorkflowEtapes,
} from '../../../hooks/administration/useWorkflowsAdmin';
import type { WorkflowEtape } from '../../../services/administration/workflows';
import { slugifier } from '../../../utils/slug';

const OPTIONS_TYPE_ETAPE = [
  { value: 'initiale', label: 'Initiale' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'finale', label: 'Finale' },
  { value: 'rejet', label: 'Rejet' },
];

const schema = z.object({
  libelle: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  ordre: z.number().int(),
  type_etape: z.enum(['initiale', 'intermediaire', 'finale', 'rejet']),
  delai_jours: z.number().int().nullable().optional(),
  couleur: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  workflowDefinitionId: string;
  peutModifier: boolean;
}

export function WorkflowEtapesManager({ workflowDefinitionId, peutModifier }: Props) {
  const { data: etapes, isLoading } = useWorkflowEtapes(workflowDefinitionId);
  const { create, update, remove } = useWorkflowEtapeMutations(workflowDefinitionId);
  const [edition, setEdition] = useState<WorkflowEtape | 'nouveau' | null>(null);

  const { control, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { libelle: '', code: '', ordre: 0, type_etape: 'intermediaire', delai_jours: null, couleur: '' },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({
        libelle: '',
        code: '',
        ordre: (etapes?.length ?? 0) + 1,
        type_etape: 'intermediaire',
        delai_jours: null,
        couleur: '',
      });
    } else if (edition) {
      reset({
        libelle: edition.libelle,
        code: edition.code,
        ordre: edition.ordre,
        type_etape: edition.type_etape,
        delai_jours: edition.delai_jours,
        couleur: edition.couleur ?? '',
      });
    }
  }, [edition, reset, etapes]);

  const libelle = watch('libelle');
  useEffect(() => {
    if (edition === 'nouveau' && libelle) setValue('code', slugifier(libelle));
  }, [libelle, edition, setValue]);

  const onSubmit = (values: FormValues) => {
    const patch = {
      libelle: values.libelle,
      code: values.code,
      ordre: values.ordre,
      type_etape: values.type_etape,
      delai_jours: values.delai_jours ?? null,
      couleur: values.couleur || null,
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
          Étapes
        </Typography.Title>
        {peutModifier && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setEdition('nouveau')}>
            Ajouter une étape
          </Button>
        )}
      </div>
      <Table<WorkflowEtape>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={etapes}
        pagination={false}
        columns={[
          { title: 'Ordre', dataIndex: 'ordre', width: 70 },
          { title: 'Libellé', dataIndex: 'libelle' },
          { title: 'Code', dataIndex: 'code' },
          {
            title: 'Type',
            dataIndex: 'type_etape',
            render: (v: string) => <Tag>{OPTIONS_TYPE_ETAPE.find((o) => o.value === v)?.label ?? v}</Tag>,
          },
          { title: 'Délai (j)', dataIndex: 'delai_jours', width: 90, render: (v: number | null) => v ?? '—' },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 140,
                  render: (_: unknown, record: WorkflowEtape) => (
                    <span>
                      <Button type="link" size="small" onClick={() => setEdition(record)}>
                        Modifier
                      </Button>
                      <Popconfirm title="Supprimer cette étape ?" onConfirm={() => remove.mutate(record.id)}>
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
        title={edition === 'nouveau' ? 'Nouvelle étape' : "Modifier l'étape"}
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
            <Controller name="code" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
          <Form.Item label="Ordre">
            <Controller
              name="ordre"
              control={control}
              render={({ field }) => (
                <InputNumber {...field} onChange={(v) => field.onChange(v ?? 0)} style={{ width: '100%' }} />
              )}
            />
          </Form.Item>
          <Form.Item label="Type">
            <Controller
              name="type_etape"
              control={control}
              render={({ field }) => <Select {...field} options={OPTIONS_TYPE_ETAPE} />}
            />
          </Form.Item>
          <Form.Item label="Délai (jours, optionnel)">
            <Controller
              name="delai_jours"
              control={control}
              render={({ field }) => (
                <InputNumber {...field} onChange={(v) => field.onChange(v ?? null)} style={{ width: '100%' }} />
              )}
            />
          </Form.Item>
          <Form.Item label="Couleur">
            <Controller
              name="couleur"
              control={control}
              render={({ field }) => (
                <ColorPicker value={field.value || undefined} onChange={(c) => field.onChange(c.toHexString())} />
              )}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
