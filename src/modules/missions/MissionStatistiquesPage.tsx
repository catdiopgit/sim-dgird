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
import { useMissions } from '../../hooks/missions/useMissions';
import { useStatistiquesMissions } from '../../hooks/missions/useStatistiquesMissions';
import { useProfile } from '../../hooks/useProfile';
import type { Mission } from '../../services/missions/missions';
import type { StatistiquesMissionsRepartition } from '../../services/missions/statistiques';
import { EnteteDocumentImprime } from '../courrier/EnteteDocumentImprime';
import { MissionStatistiquesTuiles } from './MissionStatistiquesTuiles';

const { RangePicker } = DatePicker;

// Jetons de la palette validée par le skill dataviz — mêmes valeurs que
// ProjetStatistiquesPage (mode clair uniquement).
const ENCRE_SECONDAIRE = '#52514e';
const ENCRE_MUETTE = '#898781';
const GRILLE = '#e1e0d9';
const SEQUENTIEL = '#2a78d6';

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
          <linearGradient id="remplissageEvolutionMissions" x1="0" y1="0" x2="0" y2="1">
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
        <Area type="monotone" dataKey="total" stroke={SEQUENTIEL} strokeWidth={2} fill="url(#remplissageEvolutionMissions)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Page Statistiques du module Missions : indicateurs agrégés côté serveur
// (public.fn_statistiques_missions, 0079), bornés à ce que l'utilisateur
// courant peut voir (app.can_view_mission — même périmètre que la liste des
// missions). Le tableau synthétique et l'export Excel réutilisent la liste
// de missions déjà chargée par ailleurs (useMissions) filtrée côté client
// avec les mêmes critères envoyés au serveur pour les agrégats, pour rester
// cohérents sans un second aller-retour réseau dédié.
export function MissionStatistiquesPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: organisation } = useOrganisation(organisationId);
  const entete = useEnteteDocument(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: missions, isLoading: chargementMissions } = useMissions(organisationId);

  const [periode, setPeriode] = useState<[Dayjs, Dayjs] | null>(null);
  const [entiteId, setEntiteId] = useState<string | undefined>();
  const [responsableId, setResponsableId] = useState<string | undefined>();
  const [etapeCode, setEtapeCode] = useState<string | undefined>();

  const dateDebut = periode ? periode[0].format('YYYY-MM-DD') : undefined;
  const dateFin = periode ? periode[1].format('YYYY-MM-DD') : undefined;

  const { data: statistiques, isLoading } = useStatistiquesMissions({
    dateDebut,
    dateFin,
    entiteId,
    responsableId,
    etapeCode,
  });

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  // Options d'étape dérivées des missions déjà chargées (pas de requête
  // dédiée : le référentiel d'étapes vit sur le workflow, pas sur missions).
  const optionsEtape = useMemo(() => {
    const parCode = new Map<string, string>();
    for (const m of missions ?? []) {
      if (m.etape_code) parCode.set(m.etape_code, m.etape_libelle ?? m.etape_code);
    }
    return [...parCode.entries()].map(([value, label]) => ({ value, label }));
  }, [missions]);

  // Mêmes critères que ceux envoyés au serveur pour les agrégats (voir
  // useStatistiquesMissions ci-dessus) — garantit que le tableau et l'export
  // correspondent exactement à ce que montrent les tuiles/graphiques.
  const missionsFiltrees = useMemo(() => {
    return (missions ?? []).filter((m) => {
      if (dateDebut && m.date_depart < dateDebut) return false;
      if (dateFin && m.date_depart > dateFin) return false;
      if (entiteId && m.entite_id !== entiteId) return false;
      if (responsableId && m.responsable_id !== responsableId) return false;
      if (etapeCode && m.etape_code !== etapeCode) return false;
      return true;
    });
  }, [missions, dateDebut, dateFin, entiteId, responsableId, etapeCode]);

  const donneesParEtape = useMemo(
    () => (statistiques?.parEtape ?? []).map((r: StatistiquesMissionsRepartition) => ({ libelle: r.libelle, total: r.total })),
    [statistiques],
  );
  const donneesParEntite = useMemo(
    () => (statistiques?.parEntite ?? []).map((r: StatistiquesMissionsRepartition) => ({ libelle: r.libelle, total: r.total })),
    [statistiques],
  );
  const donneesParResponsable = useMemo(
    () => (statistiques?.parResponsable ?? []).map((r: StatistiquesMissionsRepartition) => ({ libelle: r.libelle, total: r.total })),
    [statistiques],
  );

  const exporterExcel = () => {
    const lignes = missionsFiltrees.map((m) => ({
      Référence: m.reference,
      Objet: m.objet,
      Entité: entiteParId.get(m.entite_id) ?? '',
      Responsable: m.responsable_id ? (utilisateurParId.get(m.responsable_id) ?? '') : '',
      Étape: m.etape_libelle ?? '',
      'Date de départ': m.date_depart,
      'Date de retour': m.date_retour,
      'Budget prévu': m.budget_prevu ?? '',
      'Budget réel': m.budget_reel ?? '',
    }));
    const feuilleMissions = xlsxUtils.json_to_sheet(lignes);

    const resume = statistiques
      ? [
          { Indicateur: 'Total missions', Valeur: statistiques.totaux.total },
          { Indicateur: 'Missions en cours', Valeur: statistiques.totaux.enCours },
          { Indicateur: 'Missions à venir', Valeur: statistiques.totaux.aVenir },
          { Indicateur: 'Missions en retard', Valeur: statistiques.totaux.enRetard },
          { Indicateur: 'Missions clôturées', Valeur: statistiques.totaux.clotures },
          { Indicateur: 'Durée moyenne (jours)', Valeur: statistiques.dureeMoyenneJours ?? 0 },
          { Indicateur: 'Budget prévu total', Valeur: statistiques.financier.budgetPrevu },
          { Indicateur: 'Budget réel total', Valeur: statistiques.financier.budgetReel },
          { Indicateur: 'Écart budgétaire', Valeur: statistiques.financier.ecart },
          { Indicateur: '% budget réalisé', Valeur: statistiques.financier.pourcentageRealise },
          { Indicateur: 'Participants — total', Valeur: statistiques.participants.total },
          { Indicateur: 'Participants — moyenne par mission', Valeur: statistiques.participants.moyenneParMission },
        ]
      : [];
    const feuilleResume = xlsxUtils.json_to_sheet(resume);

    const classeur = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(classeur, feuilleResume, 'Résumé');
    xlsxUtils.book_append_sheet(classeur, feuilleMissions, 'Missions');
    xlsxWriteFile(classeur, `statistiques-missions-${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/missions')}>
          Retour
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Statistiques missions
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
          placeholder="Entité"
          style={{ width: 200 }}
          value={entiteId}
          onChange={setEntiteId}
          options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))}
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
          placeholder="Étape"
          style={{ width: 200 }}
          value={etapeCode}
          onChange={setEtapeCode}
          options={optionsEtape}
        />
      </Space>

      <div className="zone-imprimable">
        <div className="titre-impression" style={{ display: 'none' }}>
          <EnteteDocumentImprime organisation={organisation} entete={entete} titre="STATISTIQUES MISSIONS" />
          {periode && (
            <Typography.Paragraph style={{ textAlign: 'center', marginTop: -8 }}>
              Période du {periode[0].format('DD/MM/YYYY')} au {periode[1].format('DD/MM/YYYY')}
            </Typography.Paragraph>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <MissionStatistiquesTuiles statistiques={statistiques} chargement={isLoading} />
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Évolution (nouvelles missions)" vide={!isLoading && (statistiques?.evolution.length ?? 0) === 0}>
              <CourbeEvolution points={statistiques?.evolution ?? []} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Répartition par étape" vide={!isLoading && donneesParEtape.length === 0}>
              <BarreRepartition donnees={donneesParEtape} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Répartition par entité" vide={!isLoading && donneesParEntite.length === 0}>
              <BarreRepartition donnees={donneesParEntite} />
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
                  <Statistic title="Budget prévu" value={statistiques?.financier.budgetPrevu ?? 0} suffix="FCFA" />
                </Col>
                <Col span={12}>
                  <Statistic title="Budget réel" value={statistiques?.financier.budgetReel ?? 0} suffix="FCFA" />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Écart"
                    value={statistiques?.financier.ecart ?? 0}
                    suffix="FCFA"
                    valueStyle={(statistiques?.financier.ecart ?? 0) > 0 ? { color: '#d03b3b' } : undefined}
                  />
                </Col>
                <Col span={12}>
                  <Statistic title="% budget réalisé" value={statistiques?.financier.pourcentageRealise ?? 0} suffix="%" />
                </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="Participants">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="Total participations" value={statistiques?.participants.total ?? 0} />
                </Col>
                <Col span={12}>
                  <Statistic title="Moyenne par mission" value={statistiques?.participants.moyenneParMission ?? 0} />
                </Col>
                <Col span={12}>
                  <Statistic title="Durée moyenne" value={statistiques?.dureeMoyenneJours ?? 0} suffix="jours" />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Card size="small" title="Missions" style={{ marginTop: 16 }}>
          <Table<Mission>
            rowKey="id"
            size="small"
            loading={chargementMissions}
            dataSource={missionsFiltrees}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: 'Référence', dataIndex: 'reference', width: 140 },
              { title: 'Objet', dataIndex: 'objet' },
              { title: 'Entité', render: (_, m) => entiteParId.get(m.entite_id) ?? '—' },
              { title: 'Responsable', render: (_, m) => (m.responsable_id ? (utilisateurParId.get(m.responsable_id) ?? '—') : '—') },
              { title: 'Étape', render: (_, m) => (m.etape_libelle ? <Tag color="blue">{m.etape_libelle}</Tag> : '—') },
              {
                title: 'Départ',
                width: 110,
                render: (_, m) => new Date(m.date_depart).toLocaleDateString('fr-FR'),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
