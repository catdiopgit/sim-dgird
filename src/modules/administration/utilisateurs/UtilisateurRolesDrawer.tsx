import { PlusOutlined } from '@ant-design/icons';
import { Button, Drawer, Popconfirm, Select, Space, Table, Typography } from 'antd';
import { useMemo, useState } from 'react';
import {
  useUtilisateurRoleMutations,
  useUtilisateurRoles,
} from '../../../hooks/administration/useUtilisateurs';
import type { Entite } from '../../../services/administration/entites';
import type { Role } from '../../../services/administration/roles';
import type { Utilisateur, UtilisateurRole } from '../../../services/administration/utilisateurs';

interface Props {
  open: boolean;
  utilisateur: Utilisateur | null;
  roles: Role[];
  entites: Entite[];
  onClose: () => void;
}

export function UtilisateurRolesDrawer({ open, utilisateur, roles, entites, onClose }: Props) {
  const { data: attributions, isLoading } = useUtilisateurRoles(utilisateur?.id);
  const { assigner, revoquer } = useUtilisateurRoleMutations(utilisateur?.id);
  const [roleId, setRoleId] = useState<string | undefined>();
  const [entiteId, setEntiteId] = useState<string | undefined>();

  const roleParId = useMemo(() => new Map(roles.map((r) => [r.id, r.libelle])), [roles]);
  const entiteParId = useMemo(() => new Map(entites.map((e) => [e.id, e.libelle])), [entites]);

  const attributionsActives = (attributions ?? []).filter(
    (a) => !a.date_fin || a.date_fin >= new Date().toISOString().slice(0, 10),
  );

  const onAssigner = () => {
    if (!utilisateur || !roleId) return;
    assigner.mutate(
      { utilisateur_id: utilisateur.id, role_id: roleId, entite_id: entiteId ?? null },
      { onSuccess: () => { setRoleId(undefined); setEntiteId(undefined); } },
    );
  };

  return (
    <Drawer open={open} onClose={onClose} title={utilisateur ? `Rôles — ${utilisateur.prenom} ${utilisateur.nom}` : 'Rôles'} size={480}>
      <Typography.Title level={5}>Attribuer un rôle</Typography.Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Rôle"
          style={{ width: 200 }}
          value={roleId}
          onChange={setRoleId}
          options={roles.map((r) => ({ value: r.id, label: r.libelle }))}
        />
        <Select
          placeholder="Entité (vide = organisation entière)"
          style={{ width: 220 }}
          allowClear
          value={entiteId}
          onChange={setEntiteId}
          options={entites.map((e) => ({ value: e.id, label: e.libelle }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={onAssigner} loading={assigner.isPending} disabled={!roleId}>
          Attribuer
        </Button>
      </Space>

      <Typography.Title level={5}>Rôles actifs</Typography.Title>
      <Table<UtilisateurRole>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={attributionsActives}
        pagination={false}
        columns={[
          { title: 'Rôle', render: (_, r) => roleParId.get(r.role_id) ?? '—' },
          {
            title: 'Portée',
            render: (_, r) => (r.entite_id ? (entiteParId.get(r.entite_id) ?? '—') : 'Organisation entière'),
          },
          {
            title: 'Actions',
            width: 100,
            render: (_, r) => (
              <Popconfirm title="Révoquer ce rôle ?" onConfirm={() => revoquer.mutate(r.id)}>
                <Button type="link" size="small" danger>
                  Révoquer
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />
    </Drawer>
  );
}
