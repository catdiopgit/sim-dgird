import { Ellipsis, FolderPlus, Network, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../../../components/form/confirm-dialog';
import { Arborescence, type NoeudArbre } from '../../../components/ui/arborescence';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { EnTeteSection, EtatVide } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { useEntiteMutations, useEntites, useUtilisateursOptions } from '../../../hooks/administration/useEntites';
import { useTypeEntites } from '../../../hooks/administration/useTypeEntites';
import type { Entite } from '../../../services/administration/entites';
import { EntiteFormModal, type EntiteFormValues } from './EntiteFormModal';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

type ModalState =
  | { mode: 'creer-racine' }
  | { mode: 'creer-enfant'; parentId: string }
  | { mode: 'modifier'; entite: Entite }
  | null;

export function EntitesTree({ organisationId, peutModifier }: Props) {
  const { data: entites, isLoading: chargementEntites } = useEntites(organisationId);
  const { data: typeEntites, isLoading: chargementTypes } = useTypeEntites(organisationId);
  const { data: utilisateursOptions } = useUtilisateursOptions(organisationId);
  const { create, update, remove } = useEntiteMutations(organisationId);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [aSupprimer, setASupprimer] = useState<Entite | null>(null);

  const typeParId = useMemo(
    () => new Map((typeEntites ?? []).map((t) => [t.id, t.libelle])),
    [typeEntites],
  );

  const menuActions = (e: Entite) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Actions pour ${e.libelle}`}>
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setModalState({ mode: 'creer-enfant', parentId: e.id })}>
          <FolderPlus />
          Ajouter une sous-entité
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setModalState({ mode: 'modifier', entite: e })}>
          <Pencil />
          Modifier
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => update.mutate({ id: e.id, patch: { actif: !e.actif } })}>
          <Power />
          {e.actif ? 'Désactiver' : 'Activer'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => setASupprimer(e)}>
          <Trash2 />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const arbre = useMemo(() => {
    const enfantsParParent = new Map<string | null, Entite[]>();
    for (const e of entites ?? []) {
      const liste = enfantsParParent.get(e.parent_entite_id) ?? [];
      liste.push(e);
      enfantsParParent.set(e.parent_entite_id, liste);
    }
    for (const liste of enfantsParParent.values()) liste.sort((a, b) => a.ordre - b.ordre);

    const construireNoeuds = (parentId: string | null): NoeudArbre[] =>
      (enfantsParParent.get(parentId) ?? []).map((e) => ({
        id: e.id,
        libelle: e.libelle,
        attenue: !e.actif,
        contenu: (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">{e.libelle}</span>
            {e.sigle && <span className="font-mono text-[12px] text-muted-foreground">{e.sigle}</span>}
            <Badge variant="muted" shape="pill">
              {typeParId.get(e.type_entite_id) ?? '—'}
            </Badge>
            {!e.actif && (
              <Badge variant="outline" shape="pill">
                inactive
              </Badge>
            )}
          </span>
        ),
        actions: peutModifier ? menuActions(e) : undefined,
        enfants: construireNoeuds(e.id),
      }));

    return construireNoeuds(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entites, typeParId, peutModifier]);

  const onSubmitModal = (values: EntiteFormValues) => {
    const patchCommun = {
      type_entite_id: values.type_entite_id,
      code: values.code,
      libelle: values.libelle,
      sigle: values.sigle || null,
      responsable_utilisateur_id: values.responsable_utilisateur_id || null,
      personne_receptrice_id: values.personne_receptrice_id || null,
    };
    if (modalState?.mode === 'creer-racine') {
      create.mutate(
        { organisation_id: organisationId, parent_entite_id: null, ...patchCommun },
        { onSuccess: () => setModalState(null) },
      );
    } else if (modalState?.mode === 'creer-enfant') {
      create.mutate(
        { organisation_id: organisationId, parent_entite_id: modalState.parentId, ...patchCommun },
        { onSuccess: () => setModalState(null) },
      );
    } else if (modalState?.mode === 'modifier') {
      update.mutate(
        { id: modalState.entite.id, patch: patchCommun },
        { onSuccess: () => setModalState(null) },
      );
    }
  };

  if (chargementEntites || chargementTypes) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div>
      <EnTeteSection
        titre="Structure organisationnelle"
        description="Organigramme des entités : chaque entité peut contenir des sous-entités."
        actions={
          peutModifier && (
            <Button variant="outline" onClick={() => setModalState({ mode: 'creer-racine' })}>
              <Plus />
              Ajouter une entité racine
            </Button>
          )
        }
      />

      {arbre.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border">
          <EtatVide icone={Network} titre="Aucune entité pour le moment" />
        </div>
      ) : (
        <Arborescence noeuds={arbre} libelle="Organigramme des entités" />
      )}

      <ConfirmDialog
        open={aSupprimer !== null}
        onClose={() => setASupprimer(null)}
        titre="Supprimer cette entité ?"
        libelleConfirmer="Supprimer"
        destructif
        enCours={remove.isPending}
        onConfirmer={() => aSupprimer && remove.mutate(aSupprimer.id, { onSuccess: () => setASupprimer(null) })}
      >
        {aSupprimer && (
          <p>
            L'entité <strong>{aSupprimer.libelle}</strong> sera supprimée. Pour la conserver dans l'historique des dossiers,
            désactivez-la plutôt.
          </p>
        )}
      </ConfirmDialog>

      <EntiteFormModal
        open={modalState !== null}
        estNouveau={modalState?.mode !== 'modifier'}
        titre={
          modalState?.mode === 'modifier'
            ? "Modifier l'entité"
            : modalState?.mode === 'creer-enfant'
              ? 'Nouvelle sous-entité'
              : 'Nouvelle entité racine'
        }
        valeursInitiales={
          modalState?.mode === 'modifier'
            ? {
                type_entite_id: modalState.entite.type_entite_id,
                code: modalState.entite.code,
                libelle: modalState.entite.libelle,
                sigle: modalState.entite.sigle ?? '',
                responsable_utilisateur_id: modalState.entite.responsable_utilisateur_id ?? '',
                personne_receptrice_id: modalState.entite.personne_receptrice_id ?? '',
              }
            : undefined
        }
        typeEntites={typeEntites ?? []}
        utilisateursOptions={utilisateursOptions ?? []}
        confirmLoading={create.isPending || update.isPending}
        onCancel={() => setModalState(null)}
        onSubmit={onSubmitModal}
      />
    </div>
  );
}
