import { useMemo } from 'react';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { usePermissionMutations, usePermissionsForRole } from '../../../hooks/administration/useRolesAdmin';
import { cn } from '../../../lib/utils';
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

  return (
    <div>
      <EnTeteSection
        titre={`Permissions — ${role.libelle}`}
        description="Cochez une action pour l'accorder, puis choisissez sa portée : toute l'organisation, l'entité de l'utilisateur (avec ou sans ses sous-entités) ou ses seuls dossiers."
      />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-separate border-spacing-0 text-[13px]" aria-label={`Permissions du rôle ${role.libelle}`}>
            <thead>
              <tr className="text-left text-[12px] text-muted-foreground">
                <th scope="col" className="sticky left-0 z-10 border-b border-border bg-card py-2.5 pl-4 pr-3 font-medium">
                  Module
                </th>
                {actions.map((action) => (
                  <th key={action.id} scope="col" className="min-w-[170px] border-b border-border px-3 py-2.5 font-medium">
                    {action.libelle}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((moduleRef) => (
                <tr key={moduleRef.id} className="group">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-border bg-card py-2 pl-4 pr-3 text-left font-medium group-last:border-0 group-hover:bg-muted"
                  >
                    {moduleRef.libelle}
                  </th>
                  {actions.map((action) => {
                    const cle = `${moduleRef.id}:${action.id}`;
                    const permission = permissionParCle.get(cle);
                    return (
                      <td key={action.id} className="border-b border-border px-3 py-2 group-last:border-0 group-hover:bg-muted/60">
                        <div className="flex h-8 items-center gap-2">
                          <input
                            type="checkbox"
                            aria-label={`${moduleRef.libelle} — ${action.libelle}`}
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
                            className="size-4 shrink-0 cursor-pointer rounded accent-[var(--primary)] disabled:cursor-not-allowed"
                          />
                          {permission && (
                            <select
                              aria-label={`Portée — ${moduleRef.libelle}, ${action.libelle}`}
                              value={permission.portee}
                              disabled={!peutModifier}
                              onChange={(e) => changerPortee.mutate({ id: permission.id, portee: e.target.value as Portee })}
                              className={cn(
                                'h-7 min-w-0 flex-1 cursor-pointer rounded-md border border-border bg-card px-1.5 text-[12px] text-foreground',
                                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60',
                              )}
                            >
                              {OPTIONS_PORTEE.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
