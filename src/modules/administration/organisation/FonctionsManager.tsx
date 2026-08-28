import { zodResolver } from '@hookform/resolvers/zod';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Popconfirm, Switch, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useFonctionMutations, useFonctions } from '../../../hooks/administration/useFonctions';
import type { Fonction } from '../../../services/administration/fonctions';
import { slugifier } from '../../../utils/slug';

const schema = z.object({
  code: z.string().min(1, 'Requis'),
  libelle: z.string().min(1, 'Requis'),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

export function FonctionsManager({ organisationId, peutModifier }: Props) {
  const { data: fonctions, isLoading } = useFonctions(organisationId);
  const { create, update, remove } = useFonctionMutations(organisationId);
  const [edition, setEdition] = useState<Fonction | 'nouveau' | null>(null);

  const { control, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', libelle: '' },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({ code: '', libelle: '' });
    } else if (edition) {
      reset({ code: edition.code, libelle: edition.libelle });
    }
  }, [edition, reset]);

  const libelle = watch('libelle');
  useEffect(() => {
    if (edition === 'nouveau' && libelle) {
      setValue('code', slugifier(libelle));
    }
  }, [libelle, edition, setValue]);

  const onSubmit = (values: FormValues) => {
    if (edition === 'nouveau') {
      create.mutate(
        { organisation_id: organisationId, code: values.code, libelle: values.libelle },
        { onSuccess: () => setEdition(null) },
      );
    } else if (edition) {
      update.mutate(
        { id: edition.id, patch: { code: values.code, libelle: values.libelle } },
        { onSuccess: () => setEdition(null) },
      );
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Fonctions
        </Typography.Title>
        {peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setEdition('nouveau')}>
            Ajouter une fonction
          </Button>
        )}
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={fonctions}
        pagination={false}
        columns={[
          { title: 'Code', dataIndex: 'code' },
          { title: 'Libellé', dataIndex: 'libelle' },
          {
            title: 'Actif',
            dataIndex: 'actif',
            width: 90,
            render: (actif: boolean, record: Fonction) => (
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
                  render: (_: unknown, record: Fonction) => (
                    <span>
                      <Button type="link" size="small" onClick={() => setEdition(record)}>
                        Modifier
                      </Button>
                      <Popconfirm title="Supprimer cette fonction ?" onConfirm={() => remove.mutate(record.id)}>
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
        title={edition === 'nouveau' ? 'Nouvelle fonction' : 'Modifier la fonction'}
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
        </Form>
      </Modal>
    </div>
  );
}
