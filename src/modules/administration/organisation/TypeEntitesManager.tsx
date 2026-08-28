import { zodResolver } from '@hookform/resolvers/zod';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Switch, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useTypeEntiteMutations,
  useTypeEntites,
} from '../../../hooks/administration/useTypeEntites';
import type { TypeEntite } from '../../../services/administration/typeEntites';
import { slugifier } from '../../../utils/slug';

const schema = z.object({
  code: z.string().min(1, 'Requis'),
  libelle: z.string().min(1, 'Requis'),
  ordre: z.number().int(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

export function TypeEntitesManager({ organisationId, peutModifier }: Props) {
  const { data: typeEntites, isLoading } = useTypeEntites(organisationId);
  const { create, update, remove } = useTypeEntiteMutations(organisationId);
  const [edition, setEdition] = useState<TypeEntite | 'nouveau' | null>(null);

  const { control, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', libelle: '', ordre: 0 },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({ code: '', libelle: '', ordre: (typeEntites?.length ?? 0) + 1 });
    } else if (edition) {
      reset({ code: edition.code, libelle: edition.libelle, ordre: edition.ordre });
    }
  }, [edition, reset, typeEntites]);

  const libelle = watch('libelle');
  useEffect(() => {
    if (edition === 'nouveau' && libelle) {
      setValue('code', slugifier(libelle));
    }
  }, [libelle, edition, setValue]);

  const onSubmit = (values: FormValues) => {
    if (edition === 'nouveau') {
      create.mutate(
        { organisation_id: organisationId, code: values.code, libelle: values.libelle, ordre: values.ordre },
        { onSuccess: () => setEdition(null) },
      );
    } else if (edition) {
      update.mutate(
        { id: edition.id, patch: { code: values.code, libelle: values.libelle, ordre: values.ordre } },
        { onSuccess: () => setEdition(null) },
      );
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Types d'entités
        </Typography.Title>
        {peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setEdition('nouveau')}>
            Ajouter un type
          </Button>
        )}
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={typeEntites}
        pagination={false}
        columns={[
          { title: 'Code', dataIndex: 'code' },
          { title: 'Libellé', dataIndex: 'libelle' },
          { title: 'Ordre', dataIndex: 'ordre', width: 80 },
          {
            title: 'Actif',
            dataIndex: 'actif',
            width: 90,
            render: (actif: boolean, record: TypeEntite) => (
              <Switch
                size="small"
                checked={actif}
                disabled={!peutModifier}
                onChange={(checked) => update.mutate({ id: record.id, patch: { actif: checked } })}
              />
            ),
          },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 140,
                  render: (_: unknown, record: TypeEntite) => (
                    <span>
                      <Button type="link" size="small" onClick={() => setEdition(record)}>
                        Modifier
                      </Button>
                      <Popconfirm
                        title="Supprimer ce type d'entité ?"
                        onConfirm={() => remove.mutate(record.id)}
                      >
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
        title={edition === 'nouveau' ? "Nouveau type d'entité" : "Modifier le type d'entité"}
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
        </Form>
      </Modal>
    </div>
  );
}
