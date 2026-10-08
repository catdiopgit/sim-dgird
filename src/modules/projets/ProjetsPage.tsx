import { AlarmClock, BarChart3, CalendarDays, ChevronRight, KanbanSquare, LayoutGrid, List, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { FacetFilter } from '../../components/ui/facet-filter';
import { EtatVide, PageHeader } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { useEntites } from '../../hooks/administration/useEntites';
import { useProjets, useProjetsReferentiel } from '../../hooks/projets/useProjets';
import { useProfile } from '../../hooks/useProfile';
import { champBase } from '../../lib/styles';
import { cn } from '../../lib/utils';
import type { Projet } from '../../services/projets/projets';
import { couleurReferentiel } from '../../utils/couleurReferentiel';
import { fr } from '../../utils/dateFr';
import { BadgeCloture, BadgeValeur, BarreAvancement } from './projetAffichage';
import { ProjetFormModal } from './ProjetFormModal';

type Vue = 'grille' | 'liste';

const CLOTURES: { valeur: Projet['cloture_statut']; libelle: string }[] = [
  { valeur: 'aucune', libelle: 'Non clôturé' },
  { valeur: 'demandee', libelle: 'Clôture en attente' },
  { valeur: 'confirmee', libelle: 'Clôturé' },
  { valeur: 'rejetee', libelle: 'Clôture rejetée' },
];

// Échéance dépassée : date de fin prévue passée sur un projet non clôturé
// (indication visuelle uniquement, le statut « en retard » reste celui du
// référentiel).
function echeanceDepassee(p: Projet): boolean {
  return Boolean(p.date_fin_prevue && p.cloture_statut !== 'confirmee' && fr(p.date_fin_prevue).isBefore(fr(), 'day'));
}

export function ProjetsPage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const [formOuvert, setFormOuvert] = useState(false);
  const [vue, setVue] = useState<Vue>('grille');
  const [recherche, setRecherche] = useState('');
  const [statuts, setStatuts] = useState<string[]>([]);
  const [priorites, setPriorites] = useState<string[]>([]);
  const [clotures, setClotures] = useState<string[]>([]);

  const { data: projets, isLoading } = useProjets(organisationId);
  const { data: referentiel } = useProjetsReferentiel(organisationId);
  const { data: entites } = useEntites(organisationId);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e])), [entites]);
  const statutParId = useMemo(() => new Map((referentiel?.statuts ?? []).map((v) => [v.id, v])), [referentiel]);
  const prioriteParId = useMemo(() => new Map((referentiel?.priorites ?? []).map((v) => [v.id, v])), [referentiel]);

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (projets ?? []).filter(
      (p) =>
        (!q || p.nom.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) &&
        (statuts.length === 0 || statuts.includes(p.statut_valeur_id ?? '')) &&
        (priorites.length === 0 || priorites.includes(p.priorite_valeur_id ?? '')) &&
        (clotures.length === 0 || clotures.includes(p.cloture_statut)),
    );
  }, [projets, recherche, statuts, priorites, clotures]);

  const compter = (cle: (p: Projet) => string | null) => {
    const m = new Map<string, number>();
    for (const p of projets ?? []) m.set(cle(p) ?? '', (m.get(cle(p) ?? '') ?? 0) + 1);
    return m;
  };
  const nbStatut = compter((p) => p.statut_valeur_id);
  const nbPriorite = compter((p) => p.priorite_valeur_id);
  const nbCloture = compter((p) => p.cloture_statut);

  const filtresActifs = recherche !== '' || statuts.length + priorites.length + clotures.length > 0;
  const peutCreer = can('projets', 'creer');

  if (!organisationId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const entiteLibelle = (p: Projet) => {
    const e = entiteParId.get(p.entite_id);
    return e ? (e.sigle ?? e.libelle) : '—';
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titre="Projets"
        description="Portefeuille de projets, avancement des livrables et exécution financière"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/projets/statistiques')}>
              <BarChart3 className="text-muted-foreground" />
              Statistiques
            </Button>
            {peutCreer && (
              <Button onClick={() => setFormOuvert(true)}>
                <Plus />
                Nouveau projet
              </Button>
            )}
          </>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom ou code…"
            aria-label="Rechercher un projet"
            className={cn(champBase, 'h-9 pl-9 pr-3 text-[13px]')}
          />
        </label>
        <FacetFilter
          titre="Statut"
          selection={statuts}
          onChange={setStatuts}
          options={(referentiel?.statuts ?? []).map((v) => ({
            valeur: v.id,
            libelle: v.libelle,
            nombre: nbStatut.get(v.id) ?? 0,
            couleur: couleurReferentiel(v.couleur),
          }))}
        />
        <FacetFilter
          titre="Priorité"
          selection={priorites}
          onChange={setPriorites}
          options={(referentiel?.priorites ?? []).map((v) => ({
            valeur: v.id,
            libelle: v.libelle,
            nombre: nbPriorite.get(v.id) ?? 0,
            couleur: couleurReferentiel(v.couleur),
          }))}
        />
        <FacetFilter
          titre="Clôture"
          selection={clotures}
          onChange={setClotures}
          options={CLOTURES.map((c) => ({ valeur: c.valeur, libelle: c.libelle, nombre: nbCloture.get(c.valeur) ?? 0 }))}
        />
        {filtresActifs && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setRecherche('');
              setStatuts([]);
              setPriorites([]);
              setClotures([]);
            }}
          >
            Réinitialiser
            <X className="size-3.5" />
          </Button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {lignes.length} projet{lignes.length > 1 ? 's' : ''}
          </span>
          <div className="flex rounded-lg border border-border bg-muted p-0.5" role="radiogroup" aria-label="Affichage">
            {(
              [
                { valeur: 'grille', libelle: 'Cartes', Icone: LayoutGrid },
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
                onClick={() => setVue(valeur)}
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

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : lignes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card">
          <EtatVide
            icone={KanbanSquare}
            titre={filtresActifs ? 'Aucun projet ne correspond' : 'Aucun projet'}
            description={filtresActifs ? 'Modifiez la recherche ou les filtres.' : undefined}
          >
            {!filtresActifs && peutCreer && (
              <Button onClick={() => setFormOuvert(true)}>
                <Plus />
                Nouveau projet
              </Button>
            )}
          </EtatVide>
        </div>
      ) : vue === 'grille' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lignes.map((p) => {
            const depassee = echeanceDepassee(p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/projets/${p.id}`)}
                className="flex cursor-pointer flex-col rounded-xl border border-border bg-card p-5 text-left transition hover:border-input hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[12px] text-muted-foreground">{p.code}</span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <BadgeCloture statut={p.cloture_statut} />
                    <BadgeValeur valeur={p.statut_valeur_id ? statutParId.get(p.statut_valeur_id) : null} />
                  </div>
                </div>
                <h2 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug">{p.nom}</h2>
                <p className="mt-1 text-[12px] text-muted-foreground">{entiteLibelle(p)}</p>
                <BarreAvancement pct={p.avancement_pct} className="mt-4" />
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-[12px]">
                  <span className={cn('inline-flex items-center gap-1.5', depassee ? 'font-medium text-crit-text' : 'text-muted-foreground')}>
                    {depassee ? <AlarmClock className="size-3.5" /> : <CalendarDays className="size-3.5" />}
                    {p.date_fin_prevue ? fr(p.date_fin_prevue).format('D MMM YYYY') : 'Sans échéance'}
                  </span>
                  {p.priorite_valeur_id && <BadgeValeur valeur={prioriteParId.get(p.priorite_valeur_id)} />}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                <th className="py-3 pl-4 pr-4 font-medium">Projet</th>
                <th className="py-3 pr-4 font-medium">Entité</th>
                <th className="py-3 pr-4 font-medium">Statut</th>
                <th className="py-3 pr-4 font-medium">Priorité</th>
                <th className="w-44 py-3 pr-4 font-medium">Avancement</th>
                <th className="py-3 pr-4 text-right font-medium">Échéance</th>
                <th className="w-8" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {lignes.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/projets/${p.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/60"
                >
                  <td className="max-w-[380px] py-3 pl-4 pr-4">
                    <div className="truncate font-medium" title={p.nom}>
                      {p.nom}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <span className="font-mono">{p.code}</span>
                      <BadgeCloture statut={p.cloture_statut} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4">{entiteLibelle(p)}</td>
                  <td className="whitespace-nowrap py-3 pr-4">
                    <BadgeValeur valeur={p.statut_valeur_id ? statutParId.get(p.statut_valeur_id) : null} />
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4">
                    <BadgeValeur valeur={p.priorite_valeur_id ? prioriteParId.get(p.priorite_valeur_id) : null} />
                  </td>
                  <td className="py-3 pr-4">
                    <BarreAvancement pct={p.avancement_pct} />
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap py-3 pr-4 text-right tabular-nums',
                      echeanceDepassee(p) && 'font-medium text-crit-text',
                    )}
                  >
                    {p.date_fin_prevue ? fr(p.date_fin_prevue).format('DD/MM/YYYY') : '—'}
                  </td>
                  <td className="pr-3 text-muted-foreground">
                    <ChevronRight className="size-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProjetFormModal
        open={formOuvert}
        organisationId={organisationId}
        onClose={() => setFormOuvert(false)}
        onCree={(projet) => {
          setFormOuvert(false);
          navigate(`/projets/${projet.id}`);
        }}
      />
    </div>
  );
}
