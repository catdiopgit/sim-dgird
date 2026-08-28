import { Checkbox, Select, Skeleton, Space, Table, Typography } from 'antd';
import { useMemo } from 'react';
import { usePermissionMutations, usePermissionsForRole } from '../../../hooks/administration/useRolesAdmin';
import type { ActionRef, ModuleRef, Permission, Portee } from '../../../services/administration/permissions';
import type { Role } from '../../../services/administration/roles';

const OPTIONS_PORTEE: { value: Portee; label: string }[] = [
  { value: 'organisation', label: 'Organisation' },
  { value: 'entite', label: 'Entité' },
  { value: 'entite_et_descendants', label: 'Entité + descendants' },
  { value: 'personnel', label: 'Personnel' },
];

interface Props {
  role: Role;
  modules: ModuleRef[];
  actions: ActionRef[];
  peutModifier: boolean;
}

export function PermissionsMatrix({ role, modules, actions, peutModifier }: Props) {
  const { data: permissions, isLoading } = usePermissionsForRole(role.id);
  const { accorder, changerPortee, retirer } = usePermissionMutations(role.id);

  const permissionParCle = useMemo(() => {
    const carte = new Map<string, Permission>();
    for (const p of permissions ?? []) carte.set(`${p.module_id}:${p.action_id}`, p);
    return carte;
  }, [permissions]);

  if (isLoading) return <Skeleton active />;

  return (
    <div>
      <Typography.Title level={5}>Permissions — {role.libelle}</Typography.Title>
      <div style={{ overflowX: 'auto' }}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={modules}
          columns={[
            { title: 'Module', dataIndex: 'libelle', fixed: 'left', width: 140 },
            ...actions.map((action) => ({
              title: action.libelle,
              key: action.id,
              width: 190,
              render: (_: unknown, moduleRef: ModuleRef) => {
                const cle = `${moduleRef.id}:${action.id}`;
                const permission = permissionParCle.get(cle);
                return (
                  <Space size="small">
                    <Checkbox
                      checked={Boolean(permission)}
                      disabled={!peutModifier}
                      onChange={(e) => {
                        if (e.target.checked) {
                          accorder.mutate({
                            role_id: role.id,
                            module_id: moduleRef.id,
                            action_id: action.id,
                            portee: 'entite',
                          });
                        } else if (permission) {
                          retirer.mutate(permission.id);
                        }
                      }}
                    />
                    {permission && (
                      <Select
                        size="small"
                        value={permission.portee}
                        disabled={!peutModifier}
                        style={{ width: 130 }}
                        options={OPTIONS_PORTEE}
                        onChange={(portee) => changerPortee.mutate({ id: permission.id, portee })}
                      />
                    )}
                  </Space>
                );
              },
            })),
          ]}
        />
      </div>
    </div>
  );
}
