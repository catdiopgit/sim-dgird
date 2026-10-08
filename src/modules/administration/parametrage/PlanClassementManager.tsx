import { Ellipsis, Folder, FolderPlus, FolderTree, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Arborescence, type NoeudArbre } from '../../../components/ui/arborescence';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Encart } from '../../../components/ui/encart';
import { EnTeteSection, EtatVide } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { useDossiers } from '../../../hooks/ged/useDossiers';
import { DossierFormModal } from '../../ged/DossierFormModal';
import type { GedDossier } from '../../../services/ged/dossiers';

interface Props {
  organisationId: string;
  // Réservé à l'administrateur et à l'archiviste (ged/modifier) — pas
  // "administration/modifier" comme le reste du Paramétrage : cf. demande
  // explicite, la gestion du plan de classement suit les droits GED.
  peutModifier: boolean;
}

type ModalState = { mode: 'creer'; parentId: string | null } | { mode: 'modifier'; dossier: GedDossier } | null;

// Plan de classement = arbre des dossiers (ged_dossiers.parent_dossier_id,
// déjà hiérarchique dans le schéma) : c'est cette arborescence, et elle
// seule, qui alimente le classement document par document (ClassementPanel)
// et la recherche dans les Archives — pas une notion de "catégorie" séparée.
export function PlanClassementManager({ organisationId, peutModifier }: Props) {
  const { data: dossiers, isLoading } = useDossiers(organisationId);
  const [modalState, setModalState] = useState<ModalState>(null);

  const arbre = useMemo<NoeudArbre[]>(() => {
    const enfantsParParent = new Map<string | null, GedDossier[]>();
    for (const d of dossiers ?? []) {
      const liste = enfantsParParent.get(d.parent_dossier_id) ?? [];
      liste.push(d);
      enfantsParParent.set(d.parent_dossier_id, liste);
    }
    for (const liste of enfantsParParent.values()) liste.sort((a, b) => a.libelle.localeCompare(b.libelle));

    const construireNoeuds = (parentId: string | null): NoeudArbre[] =>
      (enfantsParParent.get(parentId) ?? []).map((d) => ({
        id: d.id,
        libelle: d.libelle,
        contenu: (
          <span className="flex items-center gap-2">
            <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="font-medium">{d.libelle}</span>
            <span className="font-mono text-[12px] text-muted-foreground">{d.code}</span>
          </span>
        ),
        actions: peutModifier ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Actions pour ${d.libelle}`}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setModalState({ mode: 'creer', parentId: d.id })}>
                <FolderPlus />
                Ajouter un sous-dossier
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setModalState({ mode: 'modifier', dossier: d })}>
                <Pencil />
                Renommer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined,
        enfants: construireNoeuds(d.id),
      }));

    return construireNoeuds(null);
  }, [dossiers, peutModifier]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div>
      <EnTeteSection
        titre="Plan de classement"
        actions={
          peutModifier && (
            <Button variant="outline" onClick={() => setModalState({ mode: 'creer', parentId: null })}>
              <FolderPlus />
              Ajouter un dossier racine
            </Button>
          )
        }
      />
      <Encart className="mb-4 max-w-3xl">
        Cet arbre de dossiers alimente le classement des documents GED (document par document) et la recherche dans les
        Archives. L'archiviste peut aussi créer un dossier directement au moment du classement s'il n'existe pas encore.
      </Encart>

      {arbre.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border">
          <EtatVide icone={FolderTree} titre="Aucun dossier pour le moment" />
        </div>
      ) : (
        <Arborescence noeuds={arbre} libelle="Plan de classement" />
      )}

      <DossierFormModal
        open={modalState !== null}
        organisationId={organisationId}
        dossier={modalState?.mode === 'modifier' ? modalState.dossier : null}
        parentDossierId={modalState?.mode === 'creer' ? modalState.parentId : null}
        onClose={() => setModalState(null)}
      />
    </div>
  );
}
