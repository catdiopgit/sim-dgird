import { LoaderCircle, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../../../components/form/confirm-dialog';
import { Button } from '../../../components/ui/button';
import { NativeSelect } from '../../../components/ui/native-select';
import { Sheet } from '../../../components/ui/sheet';
import { Skeleton } from '../../../components/ui/skeleton';
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
  const [roleId, setRoleId] = useState('');
  const [entiteId, setEntiteId] = useState('');
  const [aRevoquer, setARevoquer] = useState<UtilisateurRole | null>(null);

  const roleParId = useMemo(() => new Map(roles.map((r) => [r.id, r.libelle])), [roles]);
  const entiteParId = useMemo(() => new Map(entites.map((e) => [e.id, e.libelle])), [entites]);

  const attributionsActives = (attributions ?? []).filter(
    (a) => !a.date_fin || a.date_fin >= new Date().toISOString().slice(0, 10),
  );

  const onAssigner = () => {
    if (!utilisateur || !roleId) return;
    assigner.mutate(
      { utilisateur_id: utilisateur.id, role_id: roleId, entite_id: entiteId || null },
      {
        onSuccess: () => {
          setRoleId('');
          setEntiteId('');
        },
      },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      titre={utilisateur ? `Rôles de ${utilisateur.prenom} ${utilisateur.nom}` : 'Rôles'}
      description="Un rôle peut porter sur toute l'organisation ou sur une seule entité."
    >
      <section className="rounded-lg border border-border bg-muted/40 p-4">
        <h3 className="mb-3 text-[13px] font-semibold">Attribuer un rôle</h3>
        <div className="space-y-2">
          <NativeSelect aria-label="Rôle à attribuer" value={roleId} onChange={(e) => setRoleId(e.target.value)} className="bg-card">
            <option value="">Choisir un rôle</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.libelle}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Portée du rôle" value={entiteId} onChange={(e) => setEntiteId(e.target.value)} className="bg-card">
            <option value="">Organisation entière</option>
            {entites.map((e) => (
              <option key={e.id} value={e.id}>
                {e.libelle}
              </option>
            ))}
          </NativeSelect>
          <Button className="w-full" onClick={onAssigner} disabled={!roleId || assigner.isPending}>
            {assigner.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
            Attribuer
          </Button>
        </div>
      </section>

      <h3 className="mb-2 mt-6 text-[13px] font-semibold">
        Rôles actifs <span className="font-normal tabular-nums text-muted-foreground">({attributionsActives.length})</span>
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : attributionsActives.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
          Aucun rôle attribué.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {attributionsActives.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
                <ShieldCheck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium">{roleParId.get(r.role_id) ?? '—'}</div>
                <div className="truncate text-[12px] text-muted-foreground">
                  {r.entite_id ? (entiteParId.get(r.entite_id) ?? '—') : 'Organisation entière'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-crit-text"
                onClick={() => setARevoquer(r)}
                aria-label={`Révoquer ${roleParId.get(r.role_id) ?? 'ce rôle'}`}
                title="Révoquer"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={aRevoquer !== null}
        onClose={() => setARevoquer(null)}
        titre="Révoquer ce rôle ?"
        libelleConfirmer="Révoquer"
        destructif
        enCours={revoquer.isPending}
        onConfirmer={() => aRevoquer && revoquer.mutate(aRevoquer.id, { onSuccess: () => setARevoquer(null) })}
      >
        {aRevoquer && (
          <>
            Le rôle « {roleParId.get(aRevoquer.role_id) ?? '—'} » sera retiré à {utilisateur?.prenom} {utilisateur?.nom}.
          </>
        )}
      </ConfirmDialog>
    </Sheet>
  );
}
