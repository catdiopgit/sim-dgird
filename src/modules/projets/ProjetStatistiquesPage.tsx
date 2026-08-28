import { ArrowLeftOutlined, FileExcelOutlined, PrinterOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Empty, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';
import { useEnteteDocument } from '../../hooks/administration/useEnteteDocument';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useOrganisation } from '../../hooks/administration/useOrganisation';
import { useProjets, useProjetsReferentiel } from '../../hooks/projets/useProjets';
import { useStatistiquesProjets } from '../../hooks/projets/useStatistiquesProjets';
import { useProfile } from '../../hooks/useProfile';
import type { Projet } from '../../services/projets/projets';
import type { StatistiquesProjetsRepartition, StatistiquesProjetsRepartitionOrganisme } from '../../services/projets/statistiques';
import type { Database } from '../../types/database';
import { EnteteDocumentImprime } from '../courrier/EnteteDocumentImprime';
import { ProjetStatistiquesTuiles } from './ProjetStatistiquesTuiles';

const { RangePicker } = DatePicker;

// Jetons de la palette validée par le skill dataviz — mêmes valeurs que
// CourrierStatistiquesPage (mode clair uniquement).
const ENCRE_SECONDAIRE = '#52514e';
const ENCRE_MUETTE = '#898781';
const GRILLE = '#e1e0d9';
const SEQUENTIEL = '#2a78d6';

const LIBELLES_ORGANISME: Record<Database['public']['Enums']['organisme_execution_type'], string> = {
  organisation: "L'organisation elle-même",
  consultant: 'Consultant',
  entreprise: 'Entreprise',
  externe: 'Autre organisme externe',
};

function CardGraphique({ titre, children, vide }: { titre: string; children: ReactNode; vide: boolean }) {
  return (
    <Card size="small" title={titre} style={{ height: '100%' }}>
      {vide ? <Empty description="Aucune donnée" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : children}
    </Card>
  );
}

// Comparaison de magnitudes (pas d'identité à distinguer) -> une seule
// teinte séquentielle, jamais une couleur par barre (skill dataviz).
function BarreRepartition({ donnees }: { donnees: { libelle: string; total: number }[] }) {
  const top = donnees.slice(0, 10);
  const hauteur = Math.max(120, top.length * 36);
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke={GRILLE} strokeDasharray="0" />
        <XAxis type="number" tick={{ fill: ENCRE_MUETTE, fontSize: 12 }} allowDecimals={false} />
        <YAxis type="category" dataKey="libelle" width={160} tick={{ fill: ENCRE_SECONDAIRE, fontSize: 12 }} tickLine={false} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey="total" fill={SEQUENTIEL} barSize={20} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="total" position="right" fill={ENCRE_SECONDAIRE} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CourbeEvolution({ points }: { points: { date: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points} margin={{ left: 0, right: 16 }}>
        <defs>
          <linearGradient id="remplissageEvolutionProjets" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SEQUENTIEL} stopOpacity={0.1} />
            <stop offset="100%" stopColor={SEQUENTIEL} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRILLE} strokeDasharray="0" />
        <XAxis
          dataKey="date"
          tick={{ fill: ENCRE_MUETTE, fontSize: 11 }}
          tickFormatter={(v: string) => dayjs(v).format('DD/MM')}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis tick={{ fill: ENCRE_MUETTE, fontSize: 12 }} allowDecimals={false} width={32} />
        <Tooltip labelFormatter={(v) => dayjs(String(v)).format('DD/MM/YYYY')} />
        <Area type="monotone" dataKey="total" stroke={SEQUENTIEL} strokeWidth={2} fill="url(#remplissageEvolutionProjets)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Page Statistiques du module Projets : indicateurs agrégés côté serveur
// (public.fn_statistiques_projets, 0076), bornés à ce que l'utilisateur
// courant peut voir (app.can_view_projet — même périmètre que la liste des
// projets). Le tableau synthétique et l'export Excel réutilisent la liste
// de projets déjà chargée par ailleurs (useProjets) filtrée côté client
// avec les mêmes critères envoyés au serveur pour les agrégats, pour rester
// cohérents sans un second aller-retour réseau dédié.
export function ProjetStatistiquesPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: organisation } = useOrganisation(organisationId);
  const entete = useEnteteDocument(organisationId);
  const { data: referentiel } = useProjetsReferentiel(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: projets, isLoading: chargementProjets } = useProjets(organisationId);

  const [periode, setPeriode] = useState<[Dayjs, Dayjs] | null>(null);
  const [statutValeurId, setStatutValeurId] = useState<string | undefined>();
  const [responsableId, setResponsableId] = useState<string | undefined>();
  const [organismeExecutionType, setOrganismeExecutionType] =
    useState<Database['public']['Enums']['organisme_execution_type'] | undefined>();

  const dateDebut = periode ? periode[0].format('YYYY-MM-DD') : undefined;
  const dateFin = periode ? periode[1].format('YYYY-MM-DD') : undefined;

  const { data: statistiques, isLoading } = useStatistiquesProjets({
    dateDebut,
    dateFin,
    statutValeurId,
    responsableId,
    organismeExecutionType,
  });

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const statutParId = useMemo(() => new Map((referentiel?.statuts ?? []).map((v) => [v.id, v])), [referentiel]);

  // Mêmes critères que ceux envoyés au serveur pour les agrégats (voir
  // useStatistiquesProjets ci-dessus) — garantit que le tableau et l'export
  // correspondent exactement à ce que montrent les tuiles/graphiques.
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

  const donneesParEtat = useMemo(
    () => (statistiques?.parEtat ?? []).map((r: StatistiquesProjetsRepartition) => ({ libelle: r.libelle, total: r.total })),
    [statistiques],
  );
  const donneesParOrganisme = useMemo(
    () =>
      (statistiques?.parOrganisme ?? []).map((r: StatistiquesProjetsRepartitionOrganisme) => ({
        libelle: LIBELLES_ORGANISME[r.cle],
        total: r.total,
      })),
    [statistiques],
  );
  const donneesParResponsable = useMemo(
    () => (statistiques?.parResponsable ?? []).map((r) => ({ libelle: r.libelle, total: r.total })),
    [statistiques],
  );

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

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projets')}>
          Retour
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Statistiques projets
        </Typography.Title>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
          Imprimer
        </Button>
        <Button icon={<FileExcelOutlined />} onClick={exporterExcel}>
          Exporter Excel
        </Button>
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker value={periode} onChange={(v) => setPeriode(v && v[0] && v[1] ? [v[0], v[1]] : null)} format="DD/MM/YYYY" allowClear />
        <Select
          allowClear
          placeholder="État du projet"
          style={{ width: 180 }}
          value={statutValeurId}
          onChange={setStatutValeurId}
          options={(referentiel?.statuts ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
        />
        <Select
          allowClear
          showSearch
          placeholder="Responsable"
          style={{ width: 200 }}
          value={responsableId}
          onChange={setResponsableId}
          filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}
          options={(utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))}
        />
        <Select
          allowClear
          placeholder="Organisme d'exécution"
          style={{ width: 220 }}
          value={organismeExecutionType}
          onChange={setOrganismeExecutionType}
          options={Object.entries(LIBELLES_ORGANISME).map(([value, label]) => ({ value, label }))}
        />
      </Space>

      <div className="zone-imprimable">
        <div className="titre-impression" style={{ display: 'none' }}>
          <EnteteDocumentImprime organisation={organisation} entete={entete} titre="STATISTIQUES PROJETS" />
          {periode && (
            <Typography.Paragraph style={{ textAlign: 'center', marginTop: -8 }}>
              Période du {periode[0].format('DD/MM/YYYY')} au {periode[1].format('DD/MM/YYYY')}
            </Typography.Paragraph>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <ProjetStatistiquesTuiles statistiques={statistiques} chargement={isLoading} />
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Évolution (nouveaux projets)" vide={!isLoading && (statistiques?.evolution.length ?? 0) === 0}>
              <CourbeEvolution points={statistiques?.evolution ?? []} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Répartition par état" vide={!isLoading && donneesParEtat.length === 0}>
              <BarreRepartition donnees={donneesParEtat} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Répartition par organisme d'exécution" vide={!isLoading && donneesParOrganisme.length === 0}>
              <BarreRepartition donnees={donneesParOrganisme} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Répartition par responsable" vide={!isLoading && donneesParResponsable.length === 0}>
              <BarreRepartition donnees={donneesParResponsable} />
            </CardGraphique>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="Situation financière">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="Montant contractuel (contrat + avenants)" value={statistiques?.financier.montantContractuel ?? 0} suffix="FCFA" />
                </Col>
                <Col span={12}>
                  <Statistic title="Montant décaissé" value={statistiques?.financier.montantDecaisse ?? 0} suffix="FCFA" />
                </Col>
                <Col span={12}>
                  <Statistic title="Reste à décaisser" value={statistiques?.financier.resteADecaisser ?? 0} suffix="FCFA" />
                </Col>
                <Col span={12}>
                  <Statistic title="Dont avenants" value={statistiques?.financier.montantAvenants ?? 0} suffix="FCFA" />
                </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="Livrables">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="Total" value={statistiques?.livrables.total ?? 0} />
                </Col>
                <Col span={12}>
                  <Statistic title="Réalisés" value={statistiques?.livrables.realises ?? 0} valueStyle={{ color: '#0ca30c' }} />
                </Col>
                <Col span={12}>
                  <Statistic title="En cours / non réalisés" value={statistiques?.livrables.enCoursOuNonRealises ?? 0} />
                </Col>
                <Col span={12}>
                  <Statistic title="Taux de réalisation" value={statistiques?.livrables.tauxRealisation ?? 0} suffix="%" />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Card size="small" title="Projets" style={{ marginTop: 16 }}>
          <Table<Projet>
            rowKey="id"
            size="small"
            loading={chargementProjets}
            dataSource={projetsFiltres}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: 'Code', dataIndex: 'code', width: 120 },
              { title: 'Nom', dataIndex: 'nom' },
              { title: 'Entité', render: (_, p) => entiteParId.get(p.entite_id) ?? '—' },
              {
                title: 'Statut',
                render: (_, p) => {
                  const s = p.statut_valeur_id ? statutParId.get(p.statut_valeur_id) : null;
                  return s ? <Tag color={s.couleur ?? undefined}>{s.libelle}</Tag> : '—';
                },
              },
              { title: 'Responsable', render: (_, p) => (p.responsable_id ? (utilisateurParId.get(p.responsable_id) ?? '—') : '—') },
              { title: "Organisme d'exécution", render: (_, p) => LIBELLES_ORGANISME[p.organisme_execution_type] },
              { title: 'Avancement', width: 100, render: (_, p) => `${Math.round(p.avancement_pct)}%` },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
