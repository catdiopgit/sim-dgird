import dayjs, { type Dayjs } from 'dayjs';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';
import { BarresRepartition, ChartCard, PeriodeFiltre, StatTile, StatTiles, type PresetPeriode } from '../../components/stats/stats';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { NativeSelect } from '../../components/ui/native-select';
import { PageHeader } from '../../components/ui/page-header';
import { useEnteteDocument } from '../../hooks/administration/useEnteteDocument';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useOrganisation } from '../../hooks/administration/useOrganisation';
import { useStatistiquesMarches } from '../../hooks/marches/useStatistiquesMarches';
import { useTypesMarche } from '../../hooks/marches/useTypesMarche';
import { useProfile } from '../../hooks/useProfile';
import type { StatutCalculeMarche } from '../../services/marches/statistiques';
import { formatMontant, montantCourt } from '../../utils/format';
import { EnteteDocumentImprime } from '../courrier/EnteteDocumentImprime';

const LIBELLES_STATUT_MARCHE: Record<StatutCalculeMarche, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  en_retard: 'En retard',
  termine: 'Terminé',
};

const PRESETS: PresetPeriode[] = [
  { libelle: 'Cette année', periode: () => [dayjs().startOf('year'), dayjs().endOf('year').startOf('day')] },
  { libelle: 'Année dernière', periode: () => [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year').startOf('day')] },
];

// Montants par entreprise/consultant : même présentation que BarresRepartition
// (une seule teinte, valeurs toujours visibles) avec une colonne de valeur
// assez large pour des montants FCFA.
function BarresMontant({ donnees, max = 10 }: { donnees: { libelle: string; montant: number }[]; max?: number }) {
  const top = donnees.slice(0, max);
  const plusGrand = Math.max(1, ...top.map((d) => d.montant));
  return (
    <ul className="space-y-2.5">
      {top.map((d, i) => (
        <li
          key={`${d.libelle}-${i}`}
          className="grid items-center gap-3 text-[13px]"
          style={{ gridTemplateColumns: '150px 1fr 72px' }}
          title={`${d.libelle} : ${formatMontant(d.montant)}`}
        >
          <span className="truncate text-muted-foreground">{d.libelle}</span>
          <span className="h-5">
            <span
              className="block h-full rounded-r-[4px] print:[print-color-adjust:exact]"
              style={{ width: `${Math.max(3, (d.montant / plusGrand) * 100)}%`, background: 'var(--chart-1)' }}
            />
          </span>
          <span className="text-right font-semibold tabular-nums">{montantCourt(d.montant)}</span>
        </li>
      ))}
      {donnees.length > max && <li className="pt-1 text-[12px] text-muted-foreground">+ {donnees.length - max} autre(s)</li>}
    </ul>
  );
}

function CourbeEvolution({ points }: { points: { periode: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points} margin={{ left: 0, right: 16, top: 8 }}>
        <defs>
          <linearGradient id="remplissageEvolutionMarches" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="0" />
        <XAxis dataKey="periode" tick={{ fill: 'var(--axis)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--grid)' }} minTickGap={24} />
        <YAxis tick={{ fill: 'var(--axis)', fontSize: 12 }} allowDecimals={false} width={32} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ stroke: 'var(--grid)' }}
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [String(v), 'Marchés lancés']}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#remplissageEvolutionMarches)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// §18-20 Page Statistiques du module Marchés — agrégats calculés côté serveur
// (server/marches/marches-statistiques.service.ts), bornés à ce que
// l'utilisateur courant peut voir (même périmètre que la liste des marchés).
export function MarcheStatistiquesPage() {
  const { profile } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: organisation } = useOrganisation(organisationId);
  const entete = useEnteteDocument(organisationId);
  const { data: types } = useTypesMarche();
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);

  const [periode, setPeriode] = useState<[Dayjs, Dayjs] | null>(null);
  const [typeMarcheId, setTypeMarcheId] = useState('');
  const [statut, setStatut] = useState<StatutCalculeMarche | ''>('');
  const [responsableId, setResponsableId] = useState('');

  const filtres = {
    periodeDebut: periode ? periode[0].format('YYYY-MM-DD') : undefined,
    periodeFin: periode ? periode[1].format('YYYY-MM-DD') : undefined,
    typeMarcheId: typeMarcheId || undefined,
    statut: statut || undefined,
    responsableId: responsableId || undefined,
  };
  const { data: statistiques, isLoading } = useStatistiquesMarches(filtres);

  const donneesParType = useMemo(() => statistiques?.repartitionParType ?? [], [statistiques]);
  const donneesParStatut = useMemo(
    () => (statistiques?.repartitionParStatut ?? []).map((r) => ({ libelle: LIBELLES_STATUT_MARCHE[r.statut], total: r.total })),
    [statistiques],
  );
  const donneesParCandidat = useMemo(() => statistiques?.attribution.repartitionParCandidat ?? [], [statistiques]);

  const exporterExcel = () => {
    const resume = statistiques
      ? [
          { Indicateur: 'Total marchés', Valeur: statistiques.totaux.total },
          { Indicateur: 'Marchés en cours', Valeur: statistiques.totaux.enCours },
          { Indicateur: 'Marchés terminés', Valeur: statistiques.totaux.termines },
          { Indicateur: 'Marchés en retard', Valeur: statistiques.totaux.enRetard },
          { Indicateur: 'Marchés à venir', Valeur: statistiques.totaux.aVenir },
          { Indicateur: 'Phases — total', Valeur: statistiques.phases.total },
          { Indicateur: 'Phases — réalisées', Valeur: statistiques.phases.realisees },
          { Indicateur: 'Phases — en cours', Valeur: statistiques.phases.enCours },
          { Indicateur: 'Phases — en retard', Valeur: statistiques.phases.enRetard },
          { Indicateur: 'Taux global de réalisation (%)', Valeur: statistiques.phases.tauxRealisation },
          { Indicateur: 'Marchés attribués', Valeur: statistiques.attribution.nbMarchesAttribues },
          { Indicateur: 'Montant total attribué', Valeur: statistiques.attribution.montantTotalAttribue },
        ]
      : [];
    const feuilleResume = xlsxUtils.json_to_sheet(resume);
    const feuilleType = xlsxUtils.json_to_sheet(donneesParType);
    const feuilleCandidats = xlsxUtils.json_to_sheet(donneesParCandidat);

    const classeur = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(classeur, feuilleResume, 'Résumé');
    xlsxUtils.book_append_sheet(classeur, feuilleType, 'Par type');
    xlsxUtils.book_append_sheet(classeur, feuilleCandidats, 'Par entreprise-consultant');
    xlsxWriteFile(classeur, `statistiques-marches-${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  const s = statistiques;
  const selectFiltre = '[&_select]:h-9 [&_select]:text-[13px]';

  return (
    <div className="space-y-5">
      <PageHeader
        retour={{ vers: '/marches', libelle: 'Marchés' }}
        titre="Statistiques marchés"
        description="Avancement des procédures, réalisation des phases et attributions"
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
          <NativeSelect aria-label="Type de marché" className={`w-52 ${selectFiltre}`} value={typeMarcheId} onChange={(e) => setTypeMarcheId(e.target.value)}>
            <option value="">Tous les types</option>
            {(types ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.libelle}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Statut"
            className={`w-44 ${selectFiltre}`}
            value={statut}
            onChange={(e) => setStatut(e.target.value as StatutCalculeMarche | '')}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(LIBELLES_STATUT_MARCHE).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>
                {libelle}
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
        </div>
      </div>

      <div className="zone-imprimable space-y-5">
        <div className="titre-impression" style={{ display: 'none' }}>
          <EnteteDocumentImprime organisation={organisation} entete={entete} titre="STATISTIQUES MARCHÉS" />
          {periode && (
            <p className="-mt-2 text-center">
              Période du {periode[0].format('DD/MM/YYYY')} au {periode[1].format('DD/MM/YYYY')}
            </p>
          )}
        </div>

        <StatTiles>
          <StatTile titre="Total marchés" valeur={s?.totaux.total ?? 0} chargement={isLoading} />
          <StatTile titre="En cours" valeur={s?.totaux.enCours ?? 0} chargement={isLoading} />
          <StatTile titre="En retard" valeur={s?.totaux.enRetard ?? 0} ton={(s?.totaux.enRetard ?? 0) > 0 ? 'critique' : undefined} chargement={isLoading} />
          <StatTile titre="À venir" valeur={s?.totaux.aVenir ?? 0} chargement={isLoading} />
          <StatTile titre="Terminés" valeur={s?.totaux.termines ?? 0} ton="succes" chargement={isLoading} />
          <StatTile titre="Réalisation des phases" valeur={s?.phases.tauxRealisation ?? 0} suffixe=" %" chargement={isLoading} />
        </StatTiles>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <ChartCard titre="Évolution" description="Marchés lancés" chargement={isLoading} vide={(s?.evolution.length ?? 0) === 0}>
            <CourbeEvolution points={s?.evolution ?? []} />
          </ChartCard>
          <ChartCard titre="Répartition par type" chargement={isLoading} vide={donneesParType.length === 0}>
            <BarresRepartition donnees={donneesParType} />
          </ChartCard>
          <ChartCard titre="Répartition par statut" chargement={isLoading} vide={donneesParStatut.length === 0}>
            <BarresRepartition donnees={donneesParStatut} />
          </ChartCard>
          <ChartCard titre="Montant attribué par entreprise / consultant" chargement={isLoading} vide={donneesParCandidat.length === 0}>
            <BarresMontant donnees={donneesParCandidat} />
          </ChartCard>

          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>Phases</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-[13px]">
                {(
                  [
                    ['Total', s?.phases.total, undefined],
                    ['Réalisées', s?.phases.realisees, 'text-good-text'],
                    ['En cours', s?.phases.enCours, undefined],
                    ['En retard', s?.phases.enRetard, (s?.phases.enRetard ?? 0) > 0 ? 'text-crit-text' : undefined],
                  ] as const
                ).map(([libelle, valeur, classe]) => (
                  <div key={libelle} className="rounded-lg bg-muted/60 p-3">
                    <dt className="text-muted-foreground">{libelle}</dt>
                    <dd className={`mt-1 text-[20px] font-semibold tabular-nums ${classe ?? ''}`}>{valeur ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[28px] font-semibold leading-none tabular-nums">
                {s ? montantCourt(s.attribution.montantTotalAttribue) : '—'}{' '}
                <span className="text-[15px] font-medium text-muted-foreground">FCFA attribués</span>
              </div>
              <dl className="mt-5 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
                <div className="rounded-lg bg-muted/60 p-3">
                  <dt className="text-muted-foreground">Marchés attribués</dt>
                  <dd className="mt-1 text-[16px] font-semibold tabular-nums">{s?.attribution.nbMarchesAttribues ?? 0}</dd>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <dt className="text-muted-foreground">Montant total attribué</dt>
                  <dd className="mt-1 text-[16px] font-semibold tabular-nums">{formatMontant(s?.attribution.montantTotalAttribue ?? 0)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
