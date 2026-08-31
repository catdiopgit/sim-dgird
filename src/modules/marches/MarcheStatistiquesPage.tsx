import { ArrowLeftOutlined, FileExcelOutlined, PrinterOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Empty, Row, Select, Space, Statistic, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';
import { useEnteteDocument } from '../../hooks/administration/useEnteteDocument';
import { useOrganisation } from '../../hooks/administration/useOrganisation';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useTypesMarche } from '../../hooks/marches/useTypesMarche';
import { useStatistiquesMarches } from '../../hooks/marches/useStatistiquesMarches';
import { useProfile } from '../../hooks/useProfile';
import type { StatutCalculeMarche } from '../../services/marches/statistiques';
import { EnteteDocumentImprime } from '../courrier/EnteteDocumentImprime';

const { RangePicker } = DatePicker;

const ENCRE_SECONDAIRE = '#52514e';
const ENCRE_MUETTE = '#898781';
const GRILLE = '#e1e0d9';
const SEQUENTIEL = '#2a78d6';

const LIBELLES_STATUT_MARCHE: Record<StatutCalculeMarche, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  en_retard: 'En retard',
  termine: 'Terminé',
};

function CardGraphique({ titre, children, vide }: { titre: string; children: ReactNode; vide: boolean }) {
  return (
    <Card size="small" title={titre} style={{ height: '100%' }}>
      {vide ? <Empty description="Aucune donnée" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : children}
    </Card>
  );
}

function BarreRepartition({ donnees, cle = 'total' }: { donnees: { libelle: string; total?: number; montant?: number }[]; cle?: 'total' | 'montant' }) {
  const top = donnees.slice(0, 10);
  const hauteur = Math.max(120, top.length * 36);
  // Marge droite + formatage explicite : un montant FCFA à 10 chiffres dont la
  // barre approche déjà le maximum de l'axe fait sinon dépasser le conteneur
  // SVG et se fait tronquer visuellement (ex. "1250000000" affiché "12500000") —
  // constaté lors du test manuel du graphique "Montant attribué par entreprise".
  const formatterEtiquette = (value: unknown) => Number(value).toLocaleString('fr-FR');
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={top} layout="vertical" margin={{ left: 8, right: 90 }}>
        <CartesianGrid horizontal={false} stroke={GRILLE} strokeDasharray="0" />
        <XAxis
          type="number"
          tick={{ fill: ENCRE_MUETTE, fontSize: 12 }}
          allowDecimals={false}
          tickFormatter={formatterEtiquette}
        />
        <YAxis type="category" dataKey="libelle" width={160} tick={{ fill: ENCRE_SECONDAIRE, fontSize: 12 }} tickLine={false} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} formatter={formatterEtiquette} />
        <Bar dataKey={cle} fill={SEQUENTIEL} barSize={20} radius={[0, 4, 4, 0]}>
          <LabelList dataKey={cle} position="right" fill={ENCRE_SECONDAIRE} fontSize={12} formatter={formatterEtiquette} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CourbeEvolution({ points }: { points: { periode: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points} margin={{ left: 0, right: 16 }}>
        <defs>
          <linearGradient id="remplissageEvolutionMarches" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SEQUENTIEL} stopOpacity={0.1} />
            <stop offset="100%" stopColor={SEQUENTIEL} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRILLE} strokeDasharray="0" />
        <XAxis dataKey="periode" tick={{ fill: ENCRE_MUETTE, fontSize: 11 }} tickLine={false} minTickGap={24} />
        <YAxis tick={{ fill: ENCRE_MUETTE, fontSize: 12 }} allowDecimals={false} width={32} />
        <Tooltip />
        <Area type="monotone" dataKey="total" stroke={SEQUENTIEL} strokeWidth={2} fill="url(#remplissageEvolutionMarches)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// §18-20 Page Statistiques du module Marchés — agrégats calculés côté serveur
// (server/marches/marches-statistiques.service.ts), bornés à ce que
// l'utilisateur courant peut voir (même périmètre que la liste des marchés).
export function MarcheStatistiquesPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: organisation } = useOrganisation(organisationId);
  const entete = useEnteteDocument(organisationId);
  const { data: types } = useTypesMarche();
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);

  const [periode, setPeriode] = useState<[Dayjs, Dayjs] | null>(null);
  const [typeMarcheId, setTypeMarcheId] = useState<string | undefined>();
  const [statut, setStatut] = useState<StatutCalculeMarche | undefined>();
  const [responsableId, setResponsableId] = useState<string | undefined>();

  const filtres = {
    periodeDebut: periode ? periode[0].format('YYYY-MM-DD') : undefined,
    periodeFin: periode ? periode[1].format('YYYY-MM-DD') : undefined,
    typeMarcheId,
    statut,
    responsableId,
  };
  const { data: statistiques, isLoading } = useStatistiquesMarches(filtres);

  const donneesParType = useMemo(() => statistiques?.repartitionParType ?? [], [statistiques]);
  const donneesParStatut = useMemo(
    () => (statistiques?.repartitionParStatut ?? []).map((r) => ({ libelle: LIBELLES_STATUT_MARCHE[r.statut], total: r.total })),
    [statistiques],
  );
  const donneesParCandidat = useMemo(
    () => statistiques?.attribution.repartitionParCandidat ?? [],
    [statistiques],
  );

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

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/marches')}>
          Retour
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Statistiques marchés
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
          placeholder="Type de marché"
          style={{ width: 200 }}
          value={typeMarcheId}
          onChange={setTypeMarcheId}
          options={(types ?? []).map((t) => ({ value: t.id, label: t.libelle }))}
        />
        <Select
          allowClear
          placeholder="Statut"
          style={{ width: 160 }}
          value={statut}
          onChange={setStatut}
          options={Object.entries(LIBELLES_STATUT_MARCHE).map(([value, label]) => ({ value, label }))}
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
      </Space>

      <div className="zone-imprimable">
        <div className="titre-impression" style={{ display: 'none' }}>
          <EnteteDocumentImprime organisation={organisation} entete={entete} titre="STATISTIQUES MARCHÉS" />
          {periode && (
            <Typography.Paragraph style={{ textAlign: 'center', marginTop: -8 }}>
              Période du {periode[0].format('DD/MM/YYYY')} au {periode[1].format('DD/MM/YYYY')}
            </Typography.Paragraph>
          )}
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} lg={4}>
            <Card size="small">
              <Statistic title="Total marchés" value={statistiques?.totaux.total ?? 0} loading={isLoading} />
            </Card>
          </Col>
          <Col xs={12} lg={4}>
            <Card size="small">
              <Statistic title="En cours" value={statistiques?.totaux.enCours ?? 0} loading={isLoading} valueStyle={{ color: '#1677ff' }} />
            </Card>
          </Col>
          <Col xs={12} lg={4}>
            <Card size="small">
              <Statistic title="En retard" value={statistiques?.totaux.enRetard ?? 0} loading={isLoading} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col xs={12} lg={4}>
            <Card size="small">
              <Statistic title="À venir" value={statistiques?.totaux.aVenir ?? 0} loading={isLoading} />
            </Card>
          </Col>
          <Col xs={12} lg={4}>
            <Card size="small">
              <Statistic title="Terminés" value={statistiques?.totaux.termines ?? 0} loading={isLoading} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col xs={12} lg={4}>
            <Card size="small">
              <Statistic title="Taux de réalisation des phases" value={statistiques?.phases.tauxRealisation ?? 0} suffix="%" loading={isLoading} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Évolution (marchés lancés)" vide={!isLoading && (statistiques?.evolution.length ?? 0) === 0}>
              <CourbeEvolution points={statistiques?.evolution ?? []} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Répartition par type" vide={!isLoading && donneesParType.length === 0}>
              <BarreRepartition donnees={donneesParType} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Répartition par statut" vide={!isLoading && donneesParStatut.length === 0}>
              <BarreRepartition donnees={donneesParStatut} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Montant attribué par entreprise/consultant" vide={!isLoading && donneesParCandidat.length === 0}>
              <BarreRepartition donnees={donneesParCandidat} cle="montant" />
            </CardGraphique>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="Phases">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="Total" value={statistiques?.phases.total ?? 0} />
                </Col>
                <Col span={12}>
                  <Statistic title="Réalisées" value={statistiques?.phases.realisees ?? 0} valueStyle={{ color: '#0ca30c' }} />
                </Col>
                <Col span={12}>
                  <Statistic title="En cours" value={statistiques?.phases.enCours ?? 0} />
                </Col>
                <Col span={12}>
                  <Statistic title="En retard" value={statistiques?.phases.enRetard ?? 0} valueStyle={{ color: '#cf1322' }} />
                </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="Attribution">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="Marchés attribués" value={statistiques?.attribution.nbMarchesAttribues ?? 0} />
                </Col>
                <Col span={12}>
                  <Statistic title="Montant total attribué" value={statistiques?.attribution.montantTotalAttribue ?? 0} suffix="FCFA" />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
