import { BarChart3, ChevronRight, Gavel, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { FacetFilter } from '../../components/ui/facet-filter';
import { EtatVide, PageHeader } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { useEntites } from '../../hooks/administration/useEntites';
import { useMarches } from '../../hooks/marches/useMarches';
import { useTypesMarche } from '../../hooks/marches/useTypesMarche';
import { useProfile } from '../../hooks/useProfile';
import { champBase } from '../../lib/styles';
import { cn } from '../../lib/utils';
import type { Marche } from '../../services/marches/marches';
import { BadgeStatutMarche, dateCourte } from './marcheAffichage';
import { MarcheFormModal } from './MarcheFormModal';

const STATUTS: { valeur: Marche['statut_cloture']; libelle: string }[] = [
  { valeur: 'en_cours', libelle: 'En cours' },
  { valeur: 'cloture', libelle: 'Clôturé' },
];

export function MarchesPage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const [formOuvert, setFormOuvert] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [typesFiltre, setTypesFiltre] = useState<string[]>([]);
  const [statuts, setStatuts] = useState<string[]>([]);

  const { data: marches, isLoading } = useMarches();
  const { data: types } = useTypesMarche();
  const { data: entites } = useEntites(organisationId);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const typeParId = useMemo(() => new Map((types ?? []).map((t) => [t.id, t.libelle])), [types]);

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (marches ?? []).filter(
      (m) =>
        (!q || m.objet.toLowerCase().includes(q) || m.reference.toLowerCase().includes(q)) &&
        (typesFiltre.length === 0 || typesFiltre.includes(m.type_marche_id)) &&
        (statuts.length === 0 || statuts.includes(m.statut_cloture)),
    );
  }, [marches, recherche, typesFiltre, statuts]);

  const compter = (cle: (m: Marche) => string) => {
    const nb = new Map<string, number>();
    for (const m of marches ?? []) nb.set(cle(m), (nb.get(cle(m)) ?? 0) + 1);
    return nb;
  };
  const nbType = compter((m) => m.type_marche_id);
  const nbStatut = compter((m) => m.statut_cloture);

  const filtresActifs = recherche !== '' || typesFiltre.length + statuts.length > 0;
  const peutCreer = can('marches', 'creer');

  if (!organisationId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        titre="Marchés"
        description="Passation des marchés : planification des phases, candidats et attribution"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/marches/statistiques')}>
              <BarChart3 className="text-muted-foreground" />
              Statistiques
            </Button>
            {peutCreer && (
              <Button onClick={() => setFormOuvert(true)}>
                <Plus />
                Nouveau marché
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par référence ou objet…"
            aria-label="Rechercher un marché"
            className={cn(champBase, 'h-9 pl-9 pr-3 text-[13px]')}
          />
        </label>
        <FacetFilter
          titre="Type"
          selection={typesFiltre}
          onChange={setTypesFiltre}
          options={(types ?? []).map((t) => ({ valeur: t.id, libelle: t.libelle, nombre: nbType.get(t.id) ?? 0 }))}
        />
        <FacetFilter
          titre="Statut"
          selection={statuts}
          onChange={setStatuts}
          options={STATUTS.map((s) => ({ valeur: s.valeur, libelle: s.libelle, nombre: nbStatut.get(s.valeur) ?? 0 }))}
        />
        {filtresActifs && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setRecherche('');
              setTypesFiltre([]);
              setStatuts([]);
            }}
          >
            Réinitialiser
            <X className="size-3.5" />
          </Button>
        )}
        <span className="ml-auto text-[13px] tabular-nums text-muted-foreground">
          {lignes.length} marché{lignes.length > 1 ? 's' : ''}
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : lignes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card">
          <EtatVide
            icone={Gavel}
            titre={filtresActifs ? 'Aucun marché ne correspond' : 'Aucun marché'}
            description={filtresActifs ? 'Modifiez la recherche ou les filtres.' : undefined}
          >
            {!filtresActifs && peutCreer && (
              <Button onClick={() => setFormOuvert(true)}>
                <Plus />
                Nouveau marché
              </Button>
            )}
          </EtatVide>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                <th className="py-3 pl-4 pr-4 font-medium">Marché</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Entité</th>
                <th className="py-3 pr-4 text-right font-medium">Début prévisionnel</th>
                <th className="py-3 pr-4 text-right font-medium">Fin prévisionnelle</th>
                <th className="py-3 pr-4 font-medium">Statut</th>
                <th className="w-8" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {lignes.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => navigate(`/marches/${m.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/60"
                >
                  <td className="max-w-[420px] py-3 pl-4 pr-4">
                    <div className="truncate font-medium" title={m.objet}>
                      {m.objet}
                    </div>
                    <div className="font-mono text-[12px] text-muted-foreground">{m.reference}</div>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4">{typeParId.get(m.type_marche_id) ?? '—'}</td>
                  <td className="py-3 pr-4">{entiteParId.get(m.entite_id) ?? '—'}</td>
                  <td className="whitespace-nowrap py-3 pr-4 text-right tabular-nums">{dateCourte(m.date_debut_prevue)}</td>
                  <td className="whitespace-nowrap py-3 pr-4 text-right tabular-nums">{dateCourte(m.date_fin_prevue)}</td>
                  <td className="whitespace-nowrap py-3 pr-4">
                    <BadgeStatutMarche statut={m.statut_cloture} />
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

      <MarcheFormModal
        open={formOuvert}
        organisationId={organisationId}
        onClose={() => setFormOuvert(false)}
        onCree={(marche) => {
          setFormOuvert(false);
          navigate(`/marches/${marche.id}`);
        }}
      />
    </div>
  );
}
