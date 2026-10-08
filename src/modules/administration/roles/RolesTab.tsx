import { Lock, Plus, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ActionsLigne, BoutonModifier, BoutonSuppression } from '../../../components/form/actions-ligne';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { Tableau } from '../../../components/ui/tableau';
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

  if (!organisationId) return <Skeleton className="h-64 w-full" />;

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
    <div className="space-y-8">
      <div>
        <EnTeteSection
          titre="Rôles"
          description="Sélectionnez un rôle pour afficher et régler ses permissions."
          actions={
            peutModifier && (
              <Button onClick={() => setEdition('nouveau')}>
                <Plus />
                Nouveau rôle
              </Button>
            )
          }
        />
        <Tableau<Role>
          libelle="Rôles"
          lignes={roles}
          cleLigne={(r) => r.id}
          chargement={isLoading}
          minLargeur={560}
          onLigneClic={setRoleSelectionne}
          estActive={(r) => r.id === roleSelectionne?.id}
          vide={{ icone: ShieldCheck, titre: 'Aucun rôle' }}
          colonnes={[
            {
              cle: 'libelle',
              titre: 'Libellé',
              rendu: (r) => (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.libelle}</span>
                  {r.systeme && (
                    <Badge variant="muted" shape="pill" title="Rôle système : non modifiable">
                      <Lock className="mr-1 size-3" />
                      système
                    </Badge>
                  )}
                </span>
              ),
            },
            { cle: 'code', titre: 'Code', rendu: (r) => <span className="font-mono text-[12px] text-muted-foreground">{r.code}</span> },
            {
              cle: 'description',
              titre: 'Description',
              rendu: (r) => <span className="line-clamp-2 text-muted-foreground">{r.description ?? '—'}</span>,
            },
            ...(peutModifier
              ? [
                  {
                    cle: 'actions',
                    titre: <span className="sr-only">Actions</span>,
                    className: 'w-20',
                    rendu: (r: Role) =>
                      r.systeme ? null : (
                        <ActionsLigne>
                          <BoutonModifier libelle={`Modifier le rôle ${r.libelle}`} onClick={() => setEdition(r)} />
                          <BoutonSuppression
                            libelle={`Supprimer le rôle ${r.libelle}`}
                            titre="Supprimer ce rôle ?"
                            enCours={remove.isPending}
                            onConfirmer={(fermer) =>
                              remove.mutate(r.id, {
                                onSuccess: () => {
                                  if (roleSelectionne?.id === r.id) setRoleSelectionne(null);
                                  fermer();
                                },
                              })
                            }
                          >
                            <p>
                              Le rôle <strong>{r.libelle}</strong> et ses permissions seront supprimés ; les utilisateurs
                              qui le détiennent le perdront.
                            </p>
                          </BoutonSuppression>
                        </ActionsLigne>
                      ),
                  },
                ]
              : []),
          ]}
        />
      </div>

      {roleSelectionne && modules.data && actions.data && (
        <PermissionsMatrix
          role={roleSelectionne}
          modules={modules.data}
          actions={actions.data}
          peutModifier={peutModifier}
        />
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
