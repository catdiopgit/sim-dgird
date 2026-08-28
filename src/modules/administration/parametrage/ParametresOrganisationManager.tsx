import { zodResolver } from '@hookform/resolvers/zod';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Popconfirm, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useParametreOrganisationMutations,
  useParametresOrganisation,
} from '../../../hooks/administration/useParametrage';
import type { ParametreOrganisation } from '../../../services/administration/parametrage';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

const schema = z.object({
  cle: z.string().min(1, 'Requis'),
  valeurJson: z.string().min(1, 'Requis').refine((v) => {
    try {
      JSON.parse(v);
      return true;
    } catch {
      return false;
    }
  }, 'JSON invalide (ex. "texte", 42, true, {"a":1})'),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ParametresOrganisationManager({ organisationId, peutModifier }: Props) {
  const { data: parametres, isLoading } = useParametresOrganisation(organisationId);
  const { upsert, remove } = useParametreOrganisationMutations(organisationId);
  const [edition, setEdition] = useState<ParametreOrganisation | 'nouveau' | null>(null);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cle: '', valeurJson: '', description: '' },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({ cle: '', valeurJson: '', description: '' });
    } else if (edition) {
      reset({ cle: edition.cle, valeurJson: JSON.stringify(edition.valeur), description: edition.description ?? '' });
    }
  }, [edition, reset]);

  const onSubmit = (values: FormValues) => {
    upsert.mutate(
      { cle: values.cle, valeur: JSON.parse(values.valeurJson), description: values.description || null },
      { onSuccess: () => setEdition(null) },
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Paramètres de l'organisation
        </Typography.Title>
        {peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setEdition('nouveau')}>
            Ajouter un paramètre
          </Button>
        )}
      </div>
      <Table<ParametreOrganisation>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={parametres}
        pagination={false}
        columns={[
          { title: 'Clé', dataIndex: 'cle' },
          { title: 'Valeur', render: (_, r) => JSON.stringify(r.valeur) },
          { title: 'Description', dataIndex: 'description' },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 140,
                  render: (_: unknown, record: ParametreOrganisation) => (
                    <span>
                      <Button type="link" size="small" onClick={() => setEdition(record)}>
                        Modifier
                      </Button>
                      <Popconfirm title="Supprimer ce paramètre ?" onConfirm={() => remove.mutate(record.id)}>
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
        title={edition === 'nouveau' ? 'Nouveau paramètre' : 'Modifier le paramètre'}
        onCancel={() => setEdition(null)}
        onOk={handleSubmit(onSubmit)}
        confirmLoading={upsert.isPending}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Clé">
            <Controller
              name="cle"
              control={control}
              render={({ field }) => <Input {...field} disabled={edition !== 'nouveau'} autoFocus />}
            />
          </Form.Item>
          <Form.Item label="Valeur (JSON)">
            <Controller
              name="valeurJson"
              control={control}
              render={({ field }) => <Input.TextArea {...field} rows={3} placeholder='"texte", 42, true, {"a":1}' />}
            />
          </Form.Item>
          <Form.Item label="Description">
            <Controller name="description" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
