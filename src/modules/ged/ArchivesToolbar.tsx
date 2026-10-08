import { ChevronRight, LayoutGrid, List, Search } from 'lucide-react';
import { Fragment, useMemo } from 'react';
import { NativeSelect } from '../../components/ui/native-select';
import { CLE_NON_CLASSES } from '../../hooks/ged/useDossiers';
import { champBase } from '../../lib/styles';
import { cn } from '../../lib/utils';
import type { GedDossier } from '../../services/ged/dossiers';

export type VueArchives = 'grille' | 'liste';
export type TriArchives = 'nom' | 'date' | 'taille' | 'type';

interface Props {
  dossiers: GedDossier[];
  dossierSelectionneId: string | null;
  onNaviguer: (id: string | null) => void;
  texteRecherche: string;
  onChangeRecherche: (texte: string) => void;
  vue: VueArchives;
  onChangeVue: (vue: VueArchives) => void;
  tri: TriArchives;
  onChangeTri: (tri: TriArchives) => void;
}

export function ArchivesToolbar({
  dossiers,
  dossierSelectionneId,
  onNaviguer,
  texteRecherche,
  onChangeRecherche,
  vue,
  onChangeVue,
  tri,
  onChangeTri,
}: Props) {
  const dossierParId = useMemo(() => new Map(dossiers.map((d) => [d.id, d])), [dossiers]);

  const fil = useMemo(() => {
    const items: { id: string | null; libelle: string }[] = [{ id: null, libelle: 'Archives' }];
    if (dossierSelectionneId === CLE_NON_CLASSES) {
      items.push({ id: CLE_NON_CLASSES, libelle: 'Non classés' });
      return items;
    }
    const chemin: GedDossier[] = [];
    let curseur = dossierSelectionneId ? dossierParId.get(dossierSelectionneId) : undefined;
    while (curseur) {
      chemin.unshift(curseur);
      curseur = curseur.parent_dossier_id ? dossierParId.get(curseur.parent_dossier_id) : undefined;
    }
    for (const d of chemin) items.push({ id: d.id, libelle: d.libelle });
    return items;
  }, [dossierSelectionneId, dossierParId]);

  const enRecherche = texteRecherche.trim().length > 0;

  return (
    <div className="space-y-3">
      <nav aria-label="Emplacement" className="flex min-w-0 flex-wrap items-center gap-1 text-[13px]">
        {enRecherche ? (
          <span className="font-medium">Résultats de recherche</span>
        ) : (
          fil.map((item, idx) => (
            <Fragment key={item.id ?? 'racine'}>
              {idx > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
              {idx === fil.length - 1 ? (
                <span className="font-medium">{item.libelle}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNaviguer(item.id)}
                  className="cursor-pointer text-muted-foreground hover:text-foreground hover:underline"
                >
                  {item.libelle}
                </button>
              )}
            </Fragment>
          ))
        )}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={texteRecherche}
            onChange={(e) => onChangeRecherche(e.target.value)}
            placeholder="Rechercher dans les archives…"
            aria-label="Rechercher dans les archives"
            className={cn(champBase, 'h-9 pl-9 pr-3 text-[13px]')}
          />
        </label>
        <div className="flex items-center gap-2">
          <NativeSelect
            value={tri}
            onChange={(e) => onChangeTri(e.target.value as TriArchives)}
            aria-label="Trier"
            className="w-48 [&_select]:h-9 [&_select]:text-[13px]"
          >
            <option value="nom">Trier par nom</option>
            <option value="date">Trier par date d'archivage</option>
            <option value="taille">Trier par taille</option>
            <option value="type">Trier par type</option>
          </NativeSelect>
          <div className="flex rounded-lg border border-border bg-muted p-0.5" role="radiogroup" aria-label="Affichage">
            {(
              [
                { valeur: 'grille', libelle: 'Grille', Icone: LayoutGrid },
                { valeur: 'liste', libelle: 'Liste', Icone: List },
              ] as const
            ).map(({ valeur, libelle, Icone }) => (
              <button
                key={valeur}
                type="button"
                role="radio"
                aria-checked={vue === valeur}
                aria-label={libelle}
                title={libelle}
                onClick={() => onChangeVue(valeur)}
                className={cn(
                  'grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground',
                  vue === valeur && 'bg-card text-foreground shadow-sm',
                )}
              >
                <Icone className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
