import dayjs, { type Dayjs } from 'dayjs';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';
import { EvolutionBarres } from '../../components/stats/EvolutionBarres';
import { BarresRepartition, ChartCard, PeriodeFiltre, StatTile, StatTiles, type PresetPeriode } from '../../components/stats/stats';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { NativeSelect } from '../../components/ui/native-select';
import { PageHeader } from '../../components/ui/page-header';
import { useEnteteDocument } from '../../hooks/administration/useEnteteDocument';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useOrganisation } from '../../hooks/administration/useOrganisation';
import { useProjets, useProjetsReferentiel } from '../../hooks/projets/useProjets';
import { useStatistiquesProjets } from '../../hooks/projets/useStatistiquesProjets';
import { useProfile } from '../../hooks/useProfile';
import type { Database } from '../../types/database';
import { couleurReferentiel } from '../../utils/couleurReferentiel';
import { formatMontant, montantCourt } from '../../utils/format';
import { serieEvolution } from '../../utils/serieEvolution';
import { EnteteDocumentImprime } from '../courrier/EnteteDocumentImprime';
import { BadgeValeur, BarreAvancement } from './projetAffichage';

type Organisme = Database['public']['Enums']['organisme_execution_type'];

const LIBELLES_ORGANISME: Record<Organisme, string> = {
  organisation: "L'organisation elle-même",
  consultant: 'Consultant',
  entreprise: 'Entreprise',
  externe: 'Autre organisme externe',
};

const PRESETS: PresetPeriode[] = [
  { libelle: 'Cette année', periode: () => [dayjs().startOf('year'), dayjs().endOf('year').startOf('day')] },
  { libelle: 'Année dernière', periode: () => [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year').startOf('day')] },
];
const TAILLE_PAGE = 10;

// Page Statistiques du module Projets : indicateurs agrégés côté serveur
// (fn_statistiques_projets, 0076) et liste filtrée côté client pour l'export.
export function ProjetStatistiquesPage() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const organisationId = profile?.organisation_id;
  const { data: organisation } = useOrganisation(organisationId);
  const entete = useEnteteDocument(organisationId);
  const { data: referentiel } = useProjetsReferentiel(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: projets } = useProjets(organisationId);

  const [periode, setPeriode] = useState<[Dayjs, Dayjs] | null>(null);
  const [statutValeurId, setStatutValeurId] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [organismeExecutionType, setOrganismeExecutionType] = useState<Organisme | ''>('');
  const [page, setPage] = useState(1);

  const dateDebut = periode ? periode[0].format('YYYY-MM-DD') : undefined;
  const dateFin = periode ? periode[1].format('YYYY-MM-DD') : undefined;

  const { data: statistiques, isLoading } = useStatistiquesProjets({
    dateDebut,
    dateFin,
    statutValeurId: statutValeurId || undefined,
    responsableId: responsableId || undefined,
    organismeExecutionType: organismeExecutionType || undefined,
  });

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const statutParId = useMemo(() => new Map((referentiel?.statuts ?? []).map((v) => [v.id, v])), [referentiel]);

  // Même règle de filtrage que fn_statistiques_projets (date de début du
  // projet dans la période) pour la liste et l'export.
  const projetsFiltres = useMemo(() => {
    return (projets ?? []).filter((p) => {
      if (dateDebut && (!p.date_debut || p.date_debut < dateDebut)) return false;
      if (dateFin && (!p.date_debut || p.date_debut > dateFin)) return false;
      if (statutValeurId && p.statut_valeur_id !== statutValeurId) return false;
      if (responsableId && p.responsable_id !== responsableId) return false;
      if (organismeExecutionType && p.organisme_execution_type !== organismeExecutionType) return false;
      return true;
    });
  }, [projets, dateDebut, dateFin, statutValeurId, responsableId, organismeExecutionType]);

  const { granularite, serie } = useMemo(() => {
    const points = statistiques?.evolution ?? [];
    const dates = points.map((p) => dayjs(p.date));
    const debut = periode?.[0] ?? (dates.length ? dates.reduce((a, b) => (b.isBefore(a) ? b : a)) : dayjs());
    const fin = periode?.[1] ?? (dates.length ? dates.reduce((a, b) => (b.isAfter(a) ? b : a)) : dayjs());
    return serieEvolution(points, debut.startOf('day'), fin.endOf('day'), false);
  }, [statistiques, periode]);

  const exporterExcel = () => {
    const lignes = projetsFiltres.map((p) => ({
      Code: p.code,
      Nom: p.nom,
      Entité: entiteParId.get(p.entite_id) ?? '',
      Statut: p.statut_valeur_id ? (statutParId.get(p.statut_valeur_id)?.libelle ?? '') : '',
      Responsable: p.responsable_id ? (utilisateurParId.get(p.responsable_id) ?? '') : '',
      "Organisme d'exécution": LIBELLES_ORGANISME[p.organisme_execution_type],
      'Avancement (%)': p.avancement_pct,
      'Budget prévu': p.budget_prevu ?? '',
      Échéance: p.date_fin_prevue ?? '',
      Clôturé: p.cloture_statut === 'confirmee' ? 'Oui' : 'Non',
    }));
    const feuilleProjets = xlsxUtils.json_to_sheet(lignes);

    const resume = statistiques
      ? [
          { Indicateur: 'Total projets', Valeur: statistiques.totaux.total },
          { Indicateur: 'Projets en cours', Valeur: statistiques.totaux.enCours },
          { Indicateur: 'Projets à venir', Valeur: statistiques.totaux.aVenir },
          { Indicateur: 'Projets en retard', Valeur: statistiques.totaux.enRetard },
          { Indicateur: 'Projets clôturés', Valeur: statistiques.totaux.clotures },
          { Indicateur: 'Avancement moyen (%)', Valeur: statistiques.avancementMoyen ?? 0 },
          { Indicateur: 'Montant total des projets', Valeur: statistiques.financier.montantProjets },
          { Indicateur: 'Montant total des avenants', Valeur: statistiques.financier.montantAvenants },
          { Indicateur: 'Montant contractuel consolidé', Valeur: statistiques.financier.montantContractuel },
          { Indicateur: 'Montant décaissé', Valeur: statistiques.financier.montantDecaisse },
          { Indicateur: '% financier décaissé', Valeur: statistiques.financier.pourcentageDecaisse },
          { Indicateur: 'Reste à décaisser', Valeur: statistiques.financier.resteADecaisser },
          { Indicateur: 'Livrables — total', Valeur: statistiques.livrables.total },
          { Indicateur: 'Livrables — réalisés', Valeur: statistiques.livrables.realises },
          { Indicateur: 'Livrables — en cours / non réalisés', Valeur: statistiques.livrables.enCoursOuNonRealises },
          { Indicateur: 'Taux de réalisation des livrables (%)', Valeur: statistiques.livrables.tauxRealisation },
        ]
      : [];
    const feuilleResume = xlsxUtils.json_to_sheet(resume);

    const classeur = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(classeur, feuilleResume, 'Résumé');
    xlsxUtils.book_append_sheet(classeur, feuilleProjets, 'Projets');
    xlsxWriteFile(classeur, `statistiques-projets-${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  const s = statistiques;
  const f = s?.financier;
  const nbPages = Math.max(1, Math.ceil(projetsFiltres.length / TAILLE_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const lignesPage = projetsFiltres.slice((pageCourante - 1) * TAILLE_PAGE, pageCourante * TAILLE_PAGE);
  const selectFiltre = '[&_select]:h-9 [&_select]:text-[13px]';

  return (
    <div className="space-y-5">
      <PageHeader
        retour={{ vers: '/projets', libelle: 'Projets' }}
        titre="Statistiques projets"
        description="Portefeuille, exécution financière et réalisation des livrables"
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="text-muted-foreground" />
              Imprimer
            </Button>
            <Button variant="outline" onClick={exporterExcel}>
              <FileSpreadsheet className="text-muted-foreground" />
              Exporter Excel
            </Button>
          </>
        }
      />

      <div className="space-y-3">
        <PeriodeFiltre periode={periode} onChange={setPeriode} presets={PRESETS} effacable />
        <div className="flex flex-wrap gap-2">
          <NativeSelect aria-label="État du projet" className={`w-48 ${selectFiltre}`} value={statutValeurId} onChange={(e) => setStatutValeurId(e.target.value)}>
            <option value="">Tous les états</option>
            {(referentiel?.statuts ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.libelle}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Responsable" className={`w-52 ${selectFiltre}`} value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
            <option value="">Tous les responsables</option>
            {(utilisateurs ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.prenom} {u.nom}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Organisme d'exécution"
            className={`w-56 ${selectFiltre}`}
            value={organismeExecutionType}
            onChange={(e) => setOrganismeExecutionType(e.target.value as Organisme | '')}
          >
            <option value="">Tous les organismes</option>
            {Object.entries(LIBELLES_ORGANISME).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="zone-imprimable space-y-5">
        <div className="titre-impression" style={{ display: 'none' }}>
          <EnteteDocumentImprime organisation={organisation} entete={entete} titre="STATISTIQUES PROJETS" />
          {periode && (
            <p className="-mt-2 text-center">
              Période du {periode[0].format('DD/MM/YYYY')} au {periode[1].format('DD/MM/YYYY')}
            </p>
          )}
        </div>

        <StatTiles>
          <StatTile titre="Total projets" valeur={s?.totaux.total ?? 0} chargement={isLoading} />
          <StatTile titre="En cours" valeur={s?.totaux.enCours ?? 0} detail={`${s?.totaux.aVenir ?? 0} à venir`} chargement={isLoading} />
          <StatTile titre="En retard" valeur={s?.totaux.enRetard ?? 0} ton={(s?.totaux.enRetard ?? 0) > 0 ? 'critique' : undefined} chargement={isLoading} />
          <StatTile titre="Clôturés" valeur={s?.totaux.clotures ?? 0} ton="succes" chargement={isLoading} />
          <StatTile titre="Avancement moyen" valeur={Math.round(s?.avancementMoyen ?? 0)} suffixe=" %" chargement={isLoading} />
          <StatTile
            titre="Financier décaissé"
            valeur={(f?.pourcentageDecaisse ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
            suffixe=" %"
            chargement={isLoading}
          />
        </StatTiles>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <ChartCard titre="Évolution" description="Nouveaux projets (date de début)" chargement={isLoading} vide={(s?.evolution.length ?? 0) === 0}>
            <EvolutionBarres serie={serie} granularite={granularite} unite={['projet', 'projets']} />
          </ChartCard>
          <ChartCard titre="Répartition par état" chargement={isLoading} vide={!s?.parEtat.length}>
            <BarresRepartition donnees={(s?.parEtat ?? []).map((r) => ({ libelle: r.libelle, total: r.total, couleur: couleurReferentiel(r.couleur) }))} />
          </ChartCard>
          <ChartCard titre="Répartition par organisme d'exécution" chargement={isLoading} vide={!s?.parOrganisme.length}>
            <BarresRepartition largeurLibelle={170} donnees={(s?.parOrganisme ?? []).map((r) => ({ libelle: LIBELLES_ORGANISME[r.cle], total: r.total }))} />
          </ChartCard>
          <ChartCard titre="Répartition par responsable" chargement={isLoading} vide={!s?.parResponsable.length}>
            <BarresRepartition donnees={s?.parResponsable ?? []} />
          </ChartCard>

          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>Situation financière</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[28px] font-semibold leading-none tabular-nums">
                {f ? montantCourt(f.montantDecaisse) : '—'} <span className="text-[15px] font-medium text-muted-foreground">FCFA décaissés</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted print:[print-color-adjust:exact]">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, f?.pourcentageDecaisse ?? 0)}%` }} />
              </div>
              <dl className="mt-5 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
                {[
                  ['Montant contractuel (contrat + avenants)', f?.montantContractuel],
                  ['Reste à décaisser', f?.resteADecaisser],
                  ['Montant initial des projets', f?.montantProjets],
                  ['Dont avenants', f?.montantAvenants],
                ].map(([libelle, valeur]) => (
                  <div key={libelle as string} className="rounded-lg bg-muted/70 p-3">
                    <dt className="text-[12px] text-muted-foreground">{libelle}</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">{formatMontant(valeur as number | undefined)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>Livrables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[28px] font-semibold leading-none tabular-nums">
                {Math.round(s?.livrables.tauxRealisation ?? 0)} % <span className="text-[15px] font-medium text-muted-foreground">réalisés</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted print:[print-color-adjust:exact]">
                <div className="h-full rounded-full bg-good" style={{ width: `${Math.min(100, s?.livrables.tauxRealisation ?? 0)}%` }} />
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-[13px]">
                {[
                  ['Total', s?.livrables.total],
                  ['Réalisés', s?.livrables.realises],
                  ['En cours / non réalisés', s?.livrables.enCoursOuNonRealises],
                ].map(([libelle, valeur]) => (
                  <div key={libelle as string} className="rounded-lg bg-muted/70 p-3">
                    <dt className="text-[12px] text-muted-foreground">{libelle}</dt>
                    <dd className="mt-0.5 text-[18px] font-semibold tabular-nums">{valeur ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Projets <span className="ml-1 font-normal text-muted-foreground">{projetsFiltres.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full min-w-[820px] text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                    <th className="py-3 pl-5 pr-4 font-medium">Projet</th>
                    <th className="py-3 pr-4 font-medium">Entité</th>
                    <th className="py-3 pr-4 font-medium">Statut</th>
                    <th className="py-3 pr-4 font-medium">Responsable</th>
                    <th className="py-3 pr-4 font-medium">Organisme</th>
                    <th className="w-40 py-3 pr-5 font-medium">Avancement</th>
                  </tr>
                </thead>
                <tbody>
                  {lignesPage.map((p) => (
                    <tr key={p.id} onClick={() => navigate(`/projets/${p.id}`)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/60">
                      <td className="max-w-[300px] py-2.5 pl-5 pr-4">
                        <div className="truncate font-medium">{p.nom}</div>
                        <div className="font-mono text-[12px] text-muted-foreground">{p.code}</div>
                      </td>
                      <td className="py-2.5 pr-4">{entiteParId.get(p.entite_id) ?? '—'}</td>
                      <td className="py-2.5 pr-4">
                        <BadgeValeur valeur={p.statut_valeur_id ? statutParId.get(p.statut_valeur_id) : null} />
                      </td>
                      <td className="py-2.5 pr-4">{p.responsable_id ? (utilisateurParId.get(p.responsable_id) ?? '—') : '—'}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{LIBELLES_ORGANISME[p.organisme_execution_type]}</td>
                      <td className="py-2.5 pr-5">
                        <BarreAvancement pct={p.avancement_pct} />
                      </td>
                    </tr>
                  ))}
                  {lignesPage.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        Aucun projet pour ces critères
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {nbPages > 1 && (
              <div className="flex items-center justify-end gap-1 border-t border-border px-5 py-3 text-[13px] text-muted-foreground print:hidden">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
