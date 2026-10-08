import { LoaderCircle, Plus, Trash2, UserCog } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../../../components/form/confirm-dialog';
import { Button } from '../../../components/ui/button';
import { NativeSelect } from '../../../components/ui/native-select';
import { Sheet } from '../../../components/ui/sheet';
import { Skeleton } from '../../../components/ui/skeleton';
import { useEntites } from '../../../hooks/administration/useEntites';
import { useFonctions } from '../../../hooks/administration/useFonctions';
import { useRoles, useUtilisateurs } from '../../../hooks/administration/useUtilisateurs';
import {
  useWorkflowActeurMutations,
  useWorkflowActeurs,
} from '../../../hooks/administration/useWorkflowsAdmin';
import type { Database } from '../../../types/database';
import type { WorkflowActeur } from '../../../services/administration/workflows';

type TypeActeur = Database['public']['Enums']['type_acteur_workflow'];

const LABEL_TYPE: Record<TypeActeur, string> = {
  role: 'Rôle',
  fonction: 'Fonction',
  entite: 'Entité',
  entite_et_descendants: 'Entité + descendants',
  utilisateur: 'Utilisateur',
  responsable_entite_courante: "Responsable de l'entité du dossier",
  superieur_hierarchique_courant: 'Supérieur hiérarchique du dossier',
  destinataire_courant: 'Destinataire courant (agent affecté, ou personne réceptrice de son entité)',
};

const TYPES_SANS_CIBLE: TypeActeur[] = [
  'responsable_entite_courante',
  'superieur_hierarchique_courant',
  'destinataire_courant',
];

interface Props {
  open: boolean;
  transitionId: string | null;
  libelleAction: string;
  organisationId: string;
  peutModifier: boolean;
  onClose: () => void;
}

export function WorkflowActeursManager({
  open,
  transitionId,
  libelleAction,
  organisationId,
  peutModifier,
  onClose,
}: Props) {
  const { data: acteurs, isLoading } = useWorkflowActeurs(transitionId ?? undefined);
  const { create, remove } = useWorkflowActeurMutations(transitionId ?? undefined);
  const { data: roles } = useRoles(organisationId);
  const { data: fonctions } = useFonctions(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateurs(organisationId);

  const [typeActeur, setTypeActeur] = useState<TypeActeur>('role');
  const [cibleId, setCibleId] = useState('');
  const [aRetirer, setARetirer] = useState<WorkflowActeur | null>(null);

  const roleParId = useMemo(() => new Map((roles ?? []).map((r) => [r.id, r.libelle])), [roles]);
  const fonctionParId = useMemo(() => new Map((fonctions ?? []).map((f) => [f.id, f.libelle])), [fonctions]);
  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  const optionsCible = () => {
    switch (typeActeur) {
      case 'role':
        return (roles ?? []).map((r) => ({ value: r.id, label: r.libelle }));
      case 'fonction':
        return (fonctions ?? []).map((f) => ({ value: f.id, label: f.libelle }));
      case 'entite':
      case 'entite_et_descendants':
        return (entites ?? []).map((e) => ({ value: e.id, label: e.libelle }));
      case 'utilisateur':
        return (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }));
      default:
        return [];
    }
  };

  const libelleActeur = (acteur: WorkflowActeur) => {
    switch (acteur.type_acteur) {
      case 'role':
        return acteur.role_id ? (roleParId.get(acteur.role_id) ?? '—') : '—';
      case 'fonction':
        return acteur.fonction_id ? (fonctionParId.get(acteur.fonction_id) ?? '—') : '—';
      case 'entite':
      case 'entite_et_descendants':
        return acteur.entite_id ? (entiteParId.get(acteur.entite_id) ?? '—') : '—';
      case 'utilisateur':
        return acteur.utilisateur_id ? (utilisateurParId.get(acteur.utilisateur_id) ?? '—') : '—';
      default:
        return null;
    }
  };

  const sansCible = TYPES_SANS_CIBLE.includes(typeActeur);

  const onAjouter = () => {
    if (!transitionId) return;
    if (!sansCible && !cibleId) return;
    const cible = cibleId || null;
    create.mutate(
      {
        workflow_transition_id: transitionId,
        type_acteur: typeActeur,
        role_id: typeActeur === 'role' ? cible : null,
        fonction_id: typeActeur === 'fonction' ? cible : null,
        entite_id: typeActeur === 'entite' || typeActeur === 'entite_et_descendants' ? cible : null,
        utilisateur_id: typeActeur === 'utilisateur' ? cible : null,
      },
      { onSuccess: () => setCibleId('') },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      titre={`Acteurs — ${libelleAction}`}
      description="Aucun acteur défini = transition ouverte à quiconque a accès au dossier. Chaque ligne ajoutée restreint la transition à ceux qui correspondent à au moins une d'entre elles."
    >
      {peutModifier && (
        <section className="rounded-lg border border-border bg-muted/40 p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Ajouter un acteur</h3>
          <div className="space-y-2">
            <NativeSelect
              aria-label="Type d'acteur"
              className="bg-card"
              value={typeActeur}
              onChange={(e) => {
                setTypeActeur(e.target.value as TypeActeur);
                setCibleId('');
              }}
            >
              {Object.entries(LABEL_TYPE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            {!sansCible && (
              <NativeSelect aria-label="Cible" className="bg-card" value={cibleId} onChange={(e) => setCibleId(e.target.value)}>
                <option value="">Choisir…</option>
                {optionsCible().map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            )}
            <Button className="w-full" onClick={onAjouter} disabled={(!sansCible && !cibleId) || create.isPending}>
              {create.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
              Ajouter
            </Button>
          </div>
        </section>
      )}

      <h3 className="mb-2 mt-6 text-[13px] font-semibold first:mt-0">
        Acteurs autorisés <span className="font-normal tabular-nums text-muted-foreground">({acteurs?.length ?? 0})</span>
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (acteurs ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
          Aucun acteur : transition ouverte à tous.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {(acteurs ?? []).map((a) => {
            const cible = libelleActeur(a);
            return (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
                  <UserCog className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{cible ?? LABEL_TYPE[a.type_acteur]}</div>
                  {cible !== null && <div className="truncate text-[12px] text-muted-foreground">{LABEL_TYPE[a.type_acteur]}</div>}
                </div>
                {peutModifier && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-crit-text"
                    onClick={() => setARetirer(a)}
                    aria-label="Retirer cet acteur"
                    title="Retirer"
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={aRetirer !== null}
        onClose={() => setARetirer(null)}
        titre="Retirer cet acteur ?"
        libelleConfirmer="Retirer"
        destructif
        enCours={remove.isPending}
        onConfirmer={() => aRetirer && remove.mutate(aRetirer.id, { onSuccess: () => setARetirer(null) })}
      >
        {aRetirer && <>« {libelleActeur(aRetirer) ?? LABEL_TYPE[aRetirer.type_acteur]} » ne sera plus autorisé à déclencher cette transition.</>}
      </ConfirmDialog>
    </Sheet>
  );
}
