import { Archive, ChevronRight, Folder, FolderOpen, Inbox } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Skeleton } from '../../components/ui/skeleton';
import { CLE_NON_CLASSES, useCompteurDocumentsParDossier, useDossiers } from '../../hooks/ged/useDossiers';
import { cn } from '../../lib/utils';
import type { GedDossier } from '../../services/ged/dossiers';

interface Props {
  organisationId: string;
  dossierSelectionneId: string | null;
  onSelectionner: (id: string | null) => void;
}

function Ligne({
  niveau,
  actif,
  icone,
  libelle,
  nombre,
  ouvert,
  onBasculer,
  onClick,
}: {
  niveau: number;
  actif: boolean;
  icone: ReactNode;
  libelle: string;
  nombre?: number;
  ouvert?: boolean;
  onBasculer?: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex h-9 items-center rounded-lg pr-2 text-[13px] transition-colors',
        actif ? 'bg-accent font-semibold text-accent-foreground' : 'text-foreground hover:bg-muted',
      )}
      style={{ paddingLeft: 4 + niveau * 16 }}
    >
      {onBasculer ? (
        <button
          type="button"
          onClick={onBasculer}
          aria-label={ouvert ? `Replier ${libelle}` : `Déplier ${libelle}`}
          aria-expanded={ouvert}
          className="grid size-6 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn('size-3.5 transition-transform', ouvert && 'rotate-90')} />
        </button>
      ) : (
        <span className="size-6 shrink-0" />
      )}
      <button
        type="button"
        onClick={onClick}
        aria-current={actif ? 'true' : undefined}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
      >
        {icone}
        <span className="truncate" title={libelle}>
          {libelle}
        </span>
        {nombre ? <span className="ml-auto pl-2 text-[12px] font-normal tabular-nums text-muted-foreground">{nombre}</span> : null}
      </button>
    </div>
  );
}

// Panneau gauche de l'explorateur Archives : navigation en lecture seule dans
// le plan de classement (ged_dossiers). Aucune création/renommage ici — cette
// gestion reste réservée à Administration > Paramétrage et au panneau
// Classement (cf. project_ged_plan_classement).
export function ArchivesTreePanel({ organisationId, dossierSelectionneId, onSelectionner }: Props) {
  const { data: dossiers, isLoading } = useDossiers(organisationId);
  const { compteurs } = useCompteurDocumentsParDossier(organisationId);

  const { enfantsParParent, cheminVersSelection } = useMemo(() => {
    const enfants = new Map<string | null, GedDossier[]>();
    for (const d of dossiers ?? []) {
      const liste = enfants.get(d.parent_dossier_id) ?? [];
      liste.push(d);
      enfants.set(d.parent_dossier_id, liste);
    }
    for (const liste of enfants.values()) liste.sort((a, b) => a.libelle.localeCompare(b.libelle));

    const parentParId = new Map((dossiers ?? []).map((d) => [d.id, d.parent_dossier_id]));
    const chemin: string[] = [];
    let curseur = dossierSelectionneId;
    while (curseur && curseur !== CLE_NON_CLASSES) {
      chemin.unshift(curseur);
      curseur = parentParId.get(curseur) ?? null;
    }
    return { enfantsParParent: enfants, cheminVersSelection: chemin };
  }, [dossiers, dossierSelectionneId]);

  // Expansion librement pilotée par l'utilisateur ; on y fusionne simplement
  // le chemin vers la sélection courante quand elle change, sans écraser ce
  // que l'utilisateur a ouvert/fermé ailleurs dans l'arbre.
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (cheminVersSelection.length === 0) return;
    setOuverts((precedent) => new Set([...precedent, ...cheminVersSelection]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierSelectionneId]);

  const basculer = (id: string) =>
    setOuverts((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });

  const rendre = (parentId: string | null, niveau: number): ReactNode =>
    (enfantsParParent.get(parentId) ?? []).map((d) => {
      const aEnfants = (enfantsParParent.get(d.id) ?? []).length > 0;
      const ouvert = ouverts.has(d.id);
      const actif = dossierSelectionneId === d.id;
      const Icone = actif || ouvert ? FolderOpen : Folder;
      return (
        <li key={d.id}>
          <Ligne
            niveau={niveau}
            actif={actif}
            icone={<Icone className="size-4 shrink-0 fill-gold/25 text-gold" />}
            libelle={d.libelle}
            nombre={compteurs.get(d.id)}
            ouvert={ouvert}
            onBasculer={aEnfants ? () => basculer(d.id) : undefined}
            onClick={() => onSelectionner(d.id)}
          />
          {aEnfants && ouvert && <ul>{rendre(d.id, niveau + 1)}</ul>}
        </li>
      );
    });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    );
  }

  const nbNonClasses = compteurs.get(CLE_NON_CLASSES) ?? 0;

  return (
    <nav aria-label="Plan de classement">
      <Ligne
        niveau={0}
        actif={dossierSelectionneId === null}
        icone={<Archive className="size-4 shrink-0 text-muted-foreground" />}
        libelle="Toutes les archives"
        onClick={() => onSelectionner(null)}
      />
      {(enfantsParParent.get(null) ?? []).length === 0 ? (
        <p className="px-3 py-2 text-[13px] text-muted-foreground">Aucun dossier pour le moment.</p>
      ) : (
        <ul className="mt-1">{rendre(null, 0)}</ul>
      )}
      {nbNonClasses > 0 && (
        <div className="mt-2 border-t border-border pt-2">
          <Ligne
            niveau={0}
            actif={dossierSelectionneId === CLE_NON_CLASSES}
            icone={<Inbox className="size-4 shrink-0 text-muted-foreground" />}
            libelle="Non classés"
            nombre={nbNonClasses}
            onClick={() => onSelectionner(CLE_NON_CLASSES)}
          />
        </div>
      )}
    </nav>
  );
}
