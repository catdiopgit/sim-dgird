import {
  AlarmClock,
  ArrowLeftRight,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Inbox,
  Lock,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { FacetFilter } from '../../components/ui/facet-filter';
import { TabBar } from '../../components/ui/tab-bar';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Skeleton } from '../../components/ui/skeleton';
import { useEntites } from '../../hooks/administration/useEntites';
import { useBannetteCourriers, useCourrierReferentiel, useCourriers } from '../../hooks/courrier/useCourriers';
import { useProfile } from '../../hooks/useProfile';
import { champBase } from '../../lib/styles';
import { cn } from '../../lib/utils';
import type { Bannette, Courrier, SensCourrier } from '../../services/courrier/courriers';
import { couleurReferentiel } from '../../utils/couleurReferentiel';
import { estConfidentiel, ICONE_SENS, LABEL_SENS } from './courrierAffichage';
import { CourrierArriveWizard } from './wizard/CourrierArriveWizard';
import { CourrierDepartWizard } from './wizard/CourrierDepartWizard';

type Vue = 'tous' | Bannette;

const BANNETTES: { cle: Vue; libelle: string }[] = [
  { cle: 'tous', libelle: 'Tous les courriers' },
  { cle: 'a_traiter', libelle: 'À traiter' },
  { cle: 'en_retard', libelle: 'En retard' },
  { cle: 'sortants', libelle: 'Courriers de départ' },
  { cle: 'en_copie', libelle: 'En copie' },
  { cle: 'clotures', libelle: 'Clôturés' },
  { cle: 'archives', libelle: 'Archivés' },
];
const BANNETTES_VALIDES = BANNETTES.map((b) => b.cle).filter((c) => c !== 'tous') as Bannette[];
const TAILLE_PAGE = 20;

export function CourrierListePage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;
  const peutCreer = can('courrier', 'creer');

  // La bannette vit dans l'URL (?vue=en_retard) : liens directs depuis le
  // tableau de bord et les tuiles Statistiques, et bouton « retour » cohérent.
  const [searchParams, setSearchParams] = useSearchParams();
  const vueUrl = searchParams.get('vue');
  const vue: Vue = vueUrl && (BANNETTES_VALIDES as string[]).includes(vueUrl) ? (vueUrl as Bannette) : 'tous';

  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState('');
  const [sensFiltre, setSensFiltre] = useState<'tous' | SensCourrier>('tous');
  const [priorites, setPriorites] = useState<string[]>([]);
  const [entitesFiltre, setEntitesFiltre] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [wizardArriveOuvert, setWizardArriveOuvert] = useState(false);
  const [wizardDepartOuvert, setWizardDepartOuvert] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRecherche(saisie.trim()), 250);
    return () => clearTimeout(t);
  }, [saisie]);

  // Ouverture d'un assistant depuis la page « Nouveau courrier » (?assistant=arrive|depart).
  useEffect(() => {
    const assistant = searchParams.get('assistant');
    if (!assistant) return;
    if (assistant === 'arrive') setWizardArriveOuvert(true);
    if (assistant === 'depart') setWizardDepartOuvert(true);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('assistant');
        return p;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const { data: courriersTous, isLoading: chargementTous } = useCourriers(organisationId, {
    sens: sensFiltre === 'tous' ? undefined : sensFiltre,
    recherche: recherche || undefined,
  });
  const { data: courriersBannette, isLoading: chargementBannette } = useBannetteCourriers(vue === 'tous' ? undefined : vue);
  const { data: aTraiter } = useBannetteCourriers('a_traiter');
  const { data: enRetard } = useBannetteCourriers('en_retard');
  const { data: entites } = useEntites(organisationId);
  const { data: referentiel } = useCourrierReferentiel(organisationId);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e])), [entites]);
  const prioriteParId = useMemo(() => new Map((referentiel?.priorites ?? []).map((v) => [v.id, v])), [referentiel]);
  const typeParId = useMemo(() => new Map((referentiel?.types ?? []).map((v) => [v.id, v])), [referentiel]);
  const confidentialiteParId = useMemo(
    () => new Map((referentiel?.confidentialites ?? []).map((v) => [v.id, v])),
    [referentiel],
  );

  const source = vue === 'tous' ? courriersTous : courriersBannette;
  const chargement = vue === 'tous' ? chargementTous : chargementBannette;

  // « Tous » : sens et recherche filtrés côté serveur (listCourriers), comme
  // avant. Bannettes (fn_bannettes_courrier) : filtrés ici. Priorité, entité et
  // type sont des filtres d'affichage sur les lignes déjà chargées.
  const baseFiltree = useMemo(() => {
    const q = recherche.toLowerCase();
    return (source ?? []).filter(
      (c) =>
        (sensFiltre === 'tous' || c.sens === sensFiltre) &&
        (!q || vue === 'tous' || c.objet.toLowerCase().includes(q) || c.numero.toLowerCase().includes(q)),
    );
  }, [source, sensFiltre, recherche, vue]);

  const lignes = useMemo(
    () =>
      baseFiltree.filter(
        (c) =>
          (priorites.length === 0 || priorites.includes(c.priorite_valeur_id ?? '')) &&
          (entitesFiltre.length === 0 || entitesFiltre.includes(c.entite_id ?? '')) &&
          (types.length === 0 || types.includes(c.type_valeur_id ?? '')),
      ),
    [baseFiltree, priorites, entitesFiltre, types],
  );

  const compter = (cle: (c: Courrier) => string | null) => {
    const m = new Map<string, number>();
    for (const c of baseFiltree) {
      const k = cle(c) ?? '';
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const nbPriorite = compter((c) => c.priorite_valeur_id);
  const nbEntite = compter((c) => c.entite_id);
  const nbType = compter((c) => c.type_valeur_id);

  const filtresActifs = saisie !== '' || sensFiltre !== 'tous' || priorites.length + entitesFiltre.length + types.length > 0;
  const reinitialiser = () => {
    setSaisie('');
    setSensFiltre('tous');
    setPriorites([]);
    setEntitesFiltre([]);
    setTypes([]);
    setPage(1);
  };

  const nbPages = Math.max(1, Math.ceil(lignes.length / TAILLE_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const lignesPage = lignes.slice((pageCourante - 1) * TAILLE_PAGE, pageCourante * TAILLE_PAGE);

  const changerVue = (cle: Vue) => {
    setPage(1);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (cle === 'tous') p.delete('vue');
        else p.set('vue', cle);
        return p;
      },
      { replace: true },
    );
  };

  const compteurs: Partial<Record<Vue, number | undefined>> = { a_traiter: aTraiter?.length, en_retard: enRetard?.length };

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
      {/* En-tête */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-serif-title text-[28px] font-semibold leading-tight">Courriers</h1>
          <p className="mt-1 text-muted-foreground">Arrivées, départs et notes internes de l'organisation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/courriers/statistiques')}>
            <BarChart3 className="text-muted-foreground" />
            Statistiques
          </Button>
          {peutCreer && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus />
                  Nouveau courrier
                  <ChevronDown className="opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem className="h-auto items-start py-2.5" onSelect={() => setWizardArriveOuvert(true)}>
                  <Inbox className="mt-0.5 text-info" />
                  <span>
                    <span className="block font-medium">Courrier arrivé</span>
                    <span className="block text-[12px] text-muted-foreground">Assistant d'enregistrement</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="h-auto items-start py-2.5" onSelect={() => setWizardDepartOuvert(true)}>
                  <Send className="mt-0.5 text-primary" />
                  <span>
                    <span className="block font-medium">Courrier départ</span>
                    <span className="block text-[12px] text-muted-foreground">Assistant de rédaction et d'envoi</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="h-auto items-start py-2.5" onSelect={() => navigate('/courriers/nouveau?sens=interne')}>
                  <ArrowLeftRight className="mt-0.5 text-gold" />
                  <span>
                    <span className="block font-medium">Courrier interne</span>
                    <span className="block text-[12px] text-muted-foreground">Formulaire simple</span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <TabBar
        label="Bannettes"
        actif={vue}
        onChange={changerVue}
        onglets={BANNETTES.map((b) => ({ ...b, compteur: compteurs[b.cle], ton: b.cle === 'en_retard' ? 'critique' : undefined }))}
      />

      <div className="rounded-xl border border-border bg-card">
        {/* Barre de filtres */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 sm:p-4">
          <label className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={saisie}
              onChange={(e) => {
                setSaisie(e.target.value);
                setPage(1);
              }}
              placeholder={vue === 'tous' ? 'Rechercher par objet…' : 'Rechercher par objet ou numéro…'}
              aria-label="Rechercher un courrier"
              className={cn(champBase, 'h-9 pl-9 pr-3 text-[13px]')}
            />
          </label>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-dashed">
                <CirclePlus className="size-3.5 text-muted-foreground" />
                Sens
                {sensFiltre !== 'tous' && (
                  <>
                    <span className="mx-0.5 h-4 w-px bg-border" />
                    <span className="rounded bg-muted px-1.5 text-[11px]">{LABEL_SENS[sensFiltre]}</span>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Sens du courrier</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sensFiltre}
                onValueChange={(v) => {
                  setSensFiltre(v as 'tous' | SensCourrier);
                  setPage(1);
                }}
              >
                <DropdownMenuRadioItem value="tous">Tous</DropdownMenuRadioItem>
                {(Object.keys(LABEL_SENS) as SensCourrier[]).map((s) => (
                  <DropdownMenuRadioItem key={s} value={s}>
                    {LABEL_SENS[s]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <FacetFilter
            titre="Priorité"
            selection={priorites}
            onChange={(v) => {
              setPriorites(v);
              setPage(1);
            }}
            options={(referentiel?.priorites ?? []).map((p) => ({
              valeur: p.id,
              libelle: p.libelle,
              nombre: nbPriorite.get(p.id) ?? 0,
              couleur: couleurReferentiel(p.couleur),
            }))}
          />
          <FacetFilter
            titre="Entité"
            selection={entitesFiltre}
            onChange={(v) => {
              setEntitesFiltre(v);
              setPage(1);
            }}
            options={[
              ...(entites ?? [])
                .filter((e) => nbEntite.has(e.id))
                .map((e) => ({ valeur: e.id, libelle: e.sigle ? `${e.sigle} — ${e.libelle}` : e.libelle, nombre: nbEntite.get(e.id) ?? 0 })),
              ...(nbEntite.has('') ? [{ valeur: '', libelle: 'Non imputé', nombre: nbEntite.get('') ?? 0 }] : []),
            ]}
          />
          <FacetFilter
            titre="Type"
            selection={types}
            onChange={(v) => {
              setTypes(v);
              setPage(1);
            }}
            options={(referentiel?.types ?? []).map((t) => ({ valeur: t.id, libelle: t.libelle, nombre: nbType.get(t.id) ?? 0 }))}
          />

          {filtresActifs && (
            <Button variant="ghost" size="sm" onClick={reinitialiser} className="text-muted-foreground">
              Réinitialiser
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                <th className="py-3 pl-4 pr-4 font-medium">Numéro</th>
                <th className="py-3 pr-4 font-medium">Objet</th>
                <th className="py-3 pr-4 font-medium">Entité</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Priorité</th>
                <th className="py-3 pr-4 font-medium">Étape</th>
                <th className="py-3 pr-4 text-right font-medium">Date</th>
                <th className="w-8" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {chargement ? (
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td colSpan={8} className="px-4 py-3">
                      <Skeleton className="h-9 w-full" />
                    </td>
                  </tr>
                ))
              ) : lignesPage.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-muted">
                      <Inbox className="size-5 text-muted-foreground" />
                    </div>
                    <div className="font-medium">{filtresActifs ? 'Aucun courrier ne correspond' : 'Aucun courrier dans cette bannette'}</div>
                    {filtresActifs && (
                      <div className="text-[13px] text-muted-foreground">Modifiez la recherche ou les filtres.</div>
                    )}
                  </td>
                </tr>
              ) : (
                lignesPage.map((c) => {
                  const sens = ICONE_SENS[c.sens];
                  const IconeSens = sens.icone;
                  const entite = c.entite_id ? entiteParId.get(c.entite_id) : undefined;
                  const type = c.type_valeur_id ? typeParId.get(c.type_valeur_id) : undefined;
                  const priorite = c.priorite_valeur_id ? prioriteParId.get(c.priorite_valeur_id) : undefined;
                  const confidentiel = estConfidentiel(
                    c.confidentialite_valeur_id ? confidentialiteParId.get(c.confidentialite_valeur_id)?.code : undefined,
                  );
                  const correspondant =
                    c.sens === 'entrant'
                      ? c.expediteur_nom
                      : c.sens === 'sortant'
                        ? c.destinataire_texte
                        : c.entite_destinataire_id
                          ? `→ ${entiteParId.get(c.entite_destinataire_id)?.libelle ?? ''}`
                          : null;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/courriers/${c.id}`)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/60"
                    >
                      <td className="whitespace-nowrap py-3 pl-4 pr-4">
                        <div className="flex items-center gap-2">
                          <IconeSens className={cn('size-4 shrink-0', sens.classe)} aria-label={LABEL_SENS[c.sens]} />
                          <Link
                            to={`/courriers/${c.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-[12px] hover:underline"
                          >
                            {c.numero}
                          </Link>
                        </div>
                      </td>
                      <td className="max-w-[420px] py-3 pr-4">
                        <div className="truncate font-medium" title={c.objet}>
                          {c.objet}
                        </div>
                        {(correspondant || confidentiel) && (
                          <div className="flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
                            {confidentiel && <Lock className="size-3 shrink-0" aria-label="Confidentiel" />}
                            <span className="truncate">{correspondant}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {entite ? (
                          <Badge title={entite.libelle}>{entite.sigle ?? entite.libelle}</Badge>
                        ) : (
                          <Badge variant="warning">Non imputé</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">{type?.libelle ?? '—'}</td>
                      <td className="whitespace-nowrap py-3 pr-4">
                        {priorite ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full"
                              style={{ background: couleurReferentiel(priorite.couleur) ?? 'var(--st-neutral)' }}
                            />
                            {priorite.libelle}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4">
                        {c.etape_libelle ? <Badge variant="muted" shape="pill">{c.etape_libelle}</Badge> : '—'}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-right">
                        <div className="tabular-nums">{new Date(c.date_courrier).toLocaleDateString('fr-FR')}</div>
                        {vue === 'en_retard' && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-crit-text">
                            <AlarmClock className="size-3" />
                            En retard
                          </div>
                        )}
                      </td>
                      <td className="pr-3 text-muted-foreground">
                        <ChevronRight className="size-4" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pied : total et pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
          <span className="tabular-nums">
            {lignes.length === 0
              ? '0 courrier'
              : `${(pageCourante - 1) * TAILLE_PAGE + 1}–${Math.min(pageCourante * TAILLE_PAGE, lignes.length)} sur ${lignes.length} courrier${lignes.length > 1 ? 's' : ''}`}
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

      <CourrierArriveWizard
        open={wizardArriveOuvert}
        organisationId={organisationId}
        onClose={() => setWizardArriveOuvert(false)}
        onTermine={(courrier) => {
          setWizardArriveOuvert(false);
          navigate(`/courriers/${courrier.id}`);
        }}
      />

      <CourrierDepartWizard
        open={wizardDepartOuvert}
        organisationId={organisationId}
        onClose={() => setWizardDepartOuvert(false)}
        onTermine={(courrier) => {
          setWizardDepartOuvert(false);
          navigate(`/courriers/${courrier.id}`);
        }}
      />
    </div>
  );
}
