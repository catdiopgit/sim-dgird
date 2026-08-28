import { zodResolver } from '@hookform/resolvers/zod';
import { PlusOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Skeleton, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEntites } from '../../../hooks/administration/useEntites';
import { useModulesActions } from '../../../hooks/administration/useRolesAdmin';
import { useUtilisateurs } from '../../../hooks/administration/useUtilisateurs';
import { useDelegationMutations, useDelegations } from '../../../hooks/administration/useDelegations';
import { useProfile } from '../../../hooks/useProfile';
import type { Delegation } from '../../../services/administration/delegations';

const schema = z.object({
  delegantId: z.string().min(1, 'Requis'),
  delegataireId: z.string().min(1, 'Requis'),
  moduleId: z.string().optional(),
  entiteId: z.string().optional(),
  dateDebut: z.custom<dayjs.Dayjs>(),
  dateFin: z.custom<dayjs.Dayjs | null>().optional(),
  motif: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function DelegationsTab() {
  const { profile } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: delegations, isLoading } = useDelegations();
  const { create, revoquer } = useDelegationMutations();
  const { data: utilisateurs } = useUtilisateurs(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { modules } = useModulesActions();
  const [ouvert, setOuvert] = useState(false);

  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const moduleParId = useMemo(() => new Map((modules.data ?? []).map((m) => [m.id, m.libelle])), [modules.data]);
  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      delegantId: profile?.id ?? '',
      delegataireId: '',
      moduleId: '',
      entiteId: '',
      dateDebut: dayjs(),
      dateFin: null,
      motif: '',
    },
  });

  const ouvrir = () => {
    reset({
      delegantId: profile?.id ?? '',
      delegataireId: '',
      moduleId: '',
      entiteId: '',
      dateDebut: dayjs(),
      dateFin: null,
      motif: '',
    });
    setOuvert(true);
  };

  const onSubmit = (values: FormValues) => {
    create.mutate(
      {
        delegant_id: values.delegantId,
        delegataire_id: values.delegataireId,
        module_id: values.moduleId || null,
        entite_id: values.entiteId || null,
        date_debut: values.dateDebut.format('YYYY-MM-DD'),
        date_fin: values.dateFin ? values.dateFin.format('YYYY-MM-DD') : null,
        motif: values.motif || null,
      },
      { onSuccess: () => setOuvert(false) },
    );
  };

  if (!organisationId) return <Skeleton active />;

  return (
    <div>
      <Typography.Paragraph type="secondary">
        Une délégation permet à un utilisateur d'agir temporairement avec les permissions d'un autre
        (ex. un(e) secrétaire agissant pour un directeur absent), dans les workflows et les
        permissions générales. Limitée dans le temps, révocable, tracée dans le journal d'audit.
      </Typography.Paragraph>

      <Button type="primary" icon={<PlusOutlined />} onClick={ouvrir} style={{ marginBottom: 12 }}>
        Nouvelle délégation
      </Button>

      <Table<Delegation>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={delegations}
        columns={[
          { title: 'Délégant', render: (_, d) => utilisateurParId.get(d.delegant_id) ?? '—' },
          { title: 'Délégataire', render: (_, d) => utilisateurParId.get(d.delegataire_id) ?? '—' },
          { title: 'Module', render: (_, d) => (d.module_id ? (moduleParId.get(d.module_id) ?? '—') : 'Tous') },
          { title: 'Entité', render: (_, d) => (d.entite_id ? (entiteParId.get(d.entite_id) ?? '—') : 'Toutes') },
          {
            title: 'Période',
            render: (_, d) =>
              `${dayjs(d.date_debut).format('DD/MM/YYYY')} → ${d.date_fin ? dayjs(d.date_fin).format('DD/MM/YYYY') : 'indéterminée'}`,
          },
          {
            title: 'Statut',
            render: (_, d) => <Tag color={d.actif ? 'green' : 'default'}>{d.actif ? 'Active' : 'Révoquée'}</Tag>,
          },
          {
            title: 'Actions',
            width: 100,
            render: (_, d) =>
              d.actif && (
                <Popconfirm title="Révoquer cette délégation ?" onConfirm={() => revoquer.mutate(d.id)}>
                  <Button type="link" size="small" danger>
                    Révoquer
                  </Button>
                </Popconfirm>
              ),
          },
        ]}
      />

      <Modal
        open={ouvert}
        title="Nouvelle délégation"
        onCancel={() => setOuvert(false)}
        onOk={handleSubmit(onSubmit)}
        confirmLoading={create.isPending}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Délégant (celui qui délègue)">
            <Controller
              name="delegantId"
              control={control}
              render={({ field }) => (
                <Select {...field} options={(utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))} />
              )}
            />
          </Form.Item>
          <Form.Item label="Délégataire (celui qui reçoit les droits)">
            <Controller
              name="delegataireId"
              control={control}
              render={({ field }) => (
                <Select {...field} options={(utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))} />
              )}
            />
          </Form.Item>
          <Form.Item label="Module (vide = tous)">
            <Controller
              name="moduleId"
              control={control}
              render={({ field }) => (
                <Select {...field} allowClear options={(modules.data ?? []).map((m) => ({ value: m.id, label: m.libelle }))} />
              )}
            />
          </Form.Item>
          <Form.Item label="Entité (vide = toutes)">
            <Controller
              name="entiteId"
              control={control}
              render={({ field }) => (
                <Select {...field} allowClear options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))} />
              )}
            />
          </Form.Item>
          <Form.Item label="Date de début">
            <Controller name="dateDebut" control={control} render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />} />
          </Form.Item>
          <Form.Item label="Date de fin (vide = indéterminée)">
            <Controller name="dateFin" control={control} render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />} />
          </Form.Item>
          <Form.Item label="Motif">
            <Controller name="motif" control={control} render={({ field }) => <Input {...field} placeholder="Ex: congé, absence" />} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
