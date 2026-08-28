import { PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Popconfirm, Skeleton, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useModulesActions, useRoleMutations } from '../../../hooks/administration/useRolesAdmin';
import { useRoles } from '../../../hooks/administration/useUtilisateurs';
import { useProfile } from '../../../hooks/useProfile';
import type { Role } from '../../../services/administration/roles';
import { PermissionsMatrix } from './PermissionsMatrix';
import { RoleFormModal, type RoleFormValues } from './RoleFormModal';

export function RolesTab() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: roles, isLoading } = useRoles(organisationId);
  const { modules, actions } = useModulesActions();
  const { create, update, remove } = useRoleMutations(organisationId);
  const peutModifier = can('administration', 'modifier');

  const [edition, setEdition] = useState<Role | 'nouveau' | null>(null);
  const [roleSelectionne, setRoleSelectionne] = useState<Role | null>(null);

  if (!organisationId) return <Skeleton active />;

  const onSubmitRole = (values: RoleFormValues) => {
    if (edition === 'nouveau') {
      create.mutate(
        { organisation_id: organisationId, code: values.code, libelle: values.libelle, description: values.description || null },
        { onSuccess: () => setEdition(null) },
      );
    } else if (edition) {
      update.mutate(
        { id: edition.id, patch: { libelle: values.libelle, description: values.description || null } },
        { onSuccess: () => setEdition(null) },
      );
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Rôles
        </Typography.Title>
        {peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setEdition('nouveau')}>
            Nouveau rôle
          </Button>
        )}
      </div>

      <Table<Role>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={roles}
        pagination={false}
        onRow={(record) => ({ onClick: () => setRoleSelectionne(record), style: { cursor: 'pointer' } })}
        rowClassName={(record) => (roleSelectionne?.id === record.id ? 'ant-table-row-selected' : '')}
        columns={[
          { title: 'Libellé', dataIndex: 'libelle' },
          { title: 'Code', dataIndex: 'code' },
          { title: 'Description', dataIndex: 'description' },
          {
            title: 'Type',
            dataIndex: 'systeme',
            width: 100,
            render: (systeme: boolean) => (systeme ? <Tag>système</Tag> : null),
          },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 160,
                  render: (_: unknown, record: Role) =>
                    record.systeme ? null : (
                      <span onClick={(e) => e.stopPropagation()}>
                        <Button type="link" size="small" onClick={() => setEdition(record)}>
                          Modifier
                        </Button>
                        <Popconfirm title="Supprimer ce rôle ?" onConfirm={() => remove.mutate(record.id)}>
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

      {roleSelectionne && modules.data && actions.data && (
        <>
          <Divider />
          <PermissionsMatrix
            role={roleSelectionne}
            modules={modules.data}
            actions={actions.data}
            peutModifier={peutModifier}
          />
        </>
      )}

      <RoleFormModal
        open={edition !== null}
        role={edition === 'nouveau' ? null : edition}
        confirmLoading={create.isPending || update.isPending}
        onCancel={() => setEdition(null)}
        onSubmit={onSubmitRole}
      />
    </div>
  );
}
