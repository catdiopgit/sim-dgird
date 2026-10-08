import { Archive, ChevronLeft, ChevronRight, FolderOpen, Inbox, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { EtatVide, PageHeader } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { TabBar } from '../../components/ui/tab-bar';
import { useBannetteGed } from '../../hooks/ged/useBannetteGed';
import { useMesBrouillons, useVersements } from '../../hooks/ged/useVersements';
import { useProfile } from '../../hooks/useProfile';
import { champBase } from '../../lib/styles';
import { cn } from '../../lib/utils';
import { fr } from '../../utils/dateFr';
import { StatutVersement } from './gedAffichage';
import { VersementFormModal } from './VersementFormModal';

type Vue = 'tous' | 'brouillons' | 'a_traiter';
const VUES: { cle: Vue; libelle: string }[] = [
  { cle: 'tous', libelle: 'Tous les versements' },
  { cle: 'a_traiter', libelle: 'À traiter' },
  { cle: 'brouillons', libelle: 'Mes brouillons' },
];
const TAILLE_PAGE = 20;

// Le plan de classement (arbre des dossiers) n'est plus affiché ici : il se
// gère dans Administration > Paramétrage > Plan de classement, et se choisit
// document par document pendant le Classement (ClassementPanel) — pas besoin
// de le dupliquer sur la liste des versements.
export function GedPage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const [searchParams, setSearchParams] = useSearchParams();
  const vueUrl = searchParams.get('vue');
  const vue: Vue = vueUrl === 'brouillons' || vueUrl === 'a_traiter' ? vueUrl : 'tous';
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const [versementFormOuvert, setVersementFormOuvert] = useState(false);

  const { data: versementsTous, isLoading: chargementTous } = useVersements(organisationId);
  const { data: brouillons, isLoading: chargementBrouillons } = useMesBrouillons(organisationId);
  const { data: aTraiter, isLoading: chargementATraiter } = useBannetteGed();

  const source = vue === 'tous' ? versementsTous : vue === 'brouillons' ? brouillons : aTraiter;
  const chargement = vue === 'tous' ? chargementTous : vue === 'brouillons' ? chargementBrouillons : chargementATraiter;
  const compteurs: Record<Vue, number | undefined> = {
    tous: versementsTous?.length,
    a_traiter: aTraiter?.length,
    brouillons: brouillons?.length,
  };

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (source ?? []).filter(
      (v) => !q || v.objet.toLowerCase().includes(q) || (v.description ?? '').toLowerCase().includes(q),
    );
  }, [source, recherche]);
  const nbPages = Math.max(1, Math.ceil(lignes.length / TAILLE_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const lignesPage = lignes.slice((pageCourante - 1) * TAILLE_PAGE, pageCourante * TAILLE_PAGE);

  const peutCreer = can('ged', 'creer');

  if (!organisationId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const changerVue = (cle: Vue) => {
    setPage(1);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (cle === 'tous') p.delete('vue');
      else p.set('vue', cle);
      return p;
    }, { replace: true });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titre="Gestion documentaire"
        description="Versements de documents, circuit de validation et archives de l'organisation"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/ged/archives')}>
              <FolderOpen className="text-muted-foreground" />
              Archives
            </Button>
            {can('ged', 'consulter') && (
              <Button variant="outline" onClick={() => navigate('/ged/archivage')}>
                <Archive className="text-muted-foreground" />
                Archivage
              </Button>
            )}
            {peutCreer && (
              <Button onClick={() => setVersementFormOuvert(true)}>
                <Plus />
                Nouveau versement
              </Button>
            )}
          </>
        }
      />

      <TabBar label="Vues" actif={vue} onChange={changerVue} onglets={VUES.map((v) => ({ ...v, compteur: compteurs[v.cle] }))} />

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-3 sm:p-4">
          <label className="relative block w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher un versement…"
              aria-label="Rechercher un versement"
              className={cn(champBase, 'h-9 pl-9 pr-3 text-[13px]')}
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                <th className="py-3 pl-4 pr-4 font-medium">Versement</th>
                <th className="py-3 pr-4 font-medium">Statut</th>
                <th className="py-3 pr-4 text-right font-medium">Mis à jour le</th>
                <th className="w-8" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {chargement ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td colSpan={4} className="px-4 py-3">
                      <Skeleton className="h-9 w-full" />
                    </td>
                  </tr>
                ))
              ) : lignesPage.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EtatVide
                      icone={Inbox}
                      titre={recherche ? 'Aucun versement ne correspond' : 'Aucun versement'}
                      description={
                        vue === 'a_traiter'
                          ? "Aucun versement n'attend d'action de votre part."
                          : vue === 'brouillons'
                            ? 'Vos versements non soumis apparaîtront ici.'
                            : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                lignesPage.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/ged/versements/${v.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/60"
                  >
                    <td className="max-w-[520px] py-3 pl-4 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                          <Inbox className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium" title={v.objet}>
                            {v.objet}
                          </div>
                          {v.description && <div className="truncate text-[12px] text-muted-foreground">{v.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4">
                      <StatutVersement versement={v} />
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-right tabular-nums">{fr(v.updated_at).format('DD/MM/YYYY')}</td>
                    <td className="pr-3 text-muted-foreground">
                      <ChevronRight className="size-4" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
          <span className="tabular-nums">
            {lignes.length} versement{lignes.length > 1 ? 's' : ''}
          </span>
          {nbPages > 1 && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="size-8" disabled={pageCourante === 1} onClick={() => setPage(pageCourante - 1)} aria-label="Page précédente">
                <ChevronLeft />
              </Button>
              <span className="px-2 tabular-nums">
                Page {pageCourante} / {nbPages}
              </span>
              <Button variant="outline" size="icon" className="size-8" disabled={pageCourante === nbPages} onClick={() => setPage(pageCourante + 1)} aria-label="Page suivante">
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      </div>

      <VersementFormModal
        open={versementFormOuvert}
        organisationId={organisationId}
        onClose={() => setVersementFormOuvert(false)}
        onCree={(versement) => {
          setVersementFormOuvert(false);
          navigate(`/ged/versements/${versement.id}`);
        }}
      />
    </div>
  );
}
