import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Empty, Row, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useEnteteDocument } from '../../hooks/administration/useEnteteDocument';
import { useOrganisation } from '../../hooks/administration/useOrganisation';
import { useStatistiquesCourrier } from '../../hooks/courrier/useStatistiquesCourrier';
import { useProfile } from '../../hooks/useProfile';
import type { StatistiquesCourrierRepartition } from '../../services/courrier/statistiques';
import { CourrierStatistiquesTuiles } from './CourrierStatistiquesTuiles';
import { EnteteDocumentImprime } from './EnteteDocumentImprime';

// Jetons de la palette validée par le skill dataviz (references/palette.md) —
// mode clair uniquement, cohérent avec le reste de l'application (pas de
// thème sombre dans SIM aujourd'hui).
const ENCRE_SECONDAIRE = '#52514e';
const ENCRE_MUETTE = '#898781';
const GRILLE = '#e1e0d9';
const SEQUENTIEL = '#2a78d6';
// Ordre catégoriel fixe (jamais recalculé/cyclé) pour entrant/sortant/interne.
const COULEURS_SENS: Record<'entrant' | 'sortant' | 'interne', string> = {
  entrant: '#2a78d6',
  sortant: '#eb6834',
  interne: '#1baf7a',
};

const { RangePicker } = DatePicker;

function CardGraphique({ titre, children, vide }: { titre: string; children: ReactNode; vide: boolean }) {
  return (
    <Card size="small" title={titre} style={{ height: '100%' }}>
      {vide ? <Empty description="Aucune donnée sur la période" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : children}
    </Card>
  );
}

// Répartition par entité / type / priorité : la comparaison porte sur une
// magnitude (un total), pas une identité à distinguer -> une seule teinte
// séquentielle, jamais une couleur par barre (cf. skill dataviz, choosing-a-form).
function BarreRepartition({ donnees }: { donnees: StatistiquesCourrierRepartition[] }) {
  const top = donnees.slice(0, 10);
  const hauteur = Math.max(120, top.length * 36);
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke={GRILLE} strokeDasharray="0" />
        <XAxis type="number" tick={{ fill: ENCRE_MUETTE, fontSize: 12 }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="libelle"
          width={140}
          tick={{ fill: ENCRE_SECONDAIRE, fontSize: 12 }}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey="total" fill={SEQUENTIEL} barSize={20} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="total" position="right" fill={ENCRE_SECONDAIRE} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function BarreSens({ totaux }: { totaux: { entrant: number; sortant: number; interne: number } }) {
  const data = [
    { cle: 'entrant', libelle: 'Entrant', total: totaux.entrant },
    { cle: 'sortant', libelle: 'Sortant', total: totaux.sortant },
    { cle: 'interne', libelle: 'Interne', total: totaux.interne },
  ];
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8 }}>
        <CartesianGrid vertical={false} stroke={GRILLE} strokeDasharray="0" />
        <XAxis dataKey="libelle" tick={{ fill: ENCRE_SECONDAIRE, fontSize: 12 }} tickLine={false} />
        <YAxis tick={{ fill: ENCRE_MUETTE, fontSize: 12 }} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey="total" barSize={40} radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.cle} fill={COULEURS_SENS[d.cle as keyof typeof COULEURS_SENS]} />
          ))}
          <LabelList dataKey="total" position="top" fill={ENCRE_SECONDAIRE} fontSize={12} />
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
          <linearGradient id="remplissageEvolution" x1="0" y1="0" x2="0" y2="1">
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
        <Area
          type="monotone"
          dataKey="total"
          stroke={SEQUENTIEL}
          strokeWidth={2}
          fill="url(#remplissageEvolution)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Page Statistiques du module Courrier (plan V6) : indicateurs agrégés
// côté serveur (public.fn_statistiques_courrier), bornés à ce que
// l'utilisateur courant peut voir (app.can_view_courrier — même périmètre
// que les bannettes). Une seule fonction serveur, un seul appel réseau.
export function CourrierStatistiquesPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: organisation } = useOrganisation(organisationId);
  const entete = useEnteteDocument(organisationId);
  const [periode, setPeriode] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, 'day'), dayjs()]);

  const dateDebut = periode ? periode[0].format('YYYY-MM-DD') : undefined;
  const dateFin = periode ? periode[1].format('YYYY-MM-DD') : undefined;
  const { data: statistiques, isLoading } = useStatistiquesCourrier(dateDebut, dateFin);

  const evolutionComplete = useMemo(() => {
    if (!statistiques) return [];
    const parDate = new Map(statistiques.evolution.map((p) => [p.date, p.total]));
    const jours: { date: string; total: number }[] = [];
    let curseur = periode[0].startOf('day');
    const fin = periode[1].startOf('day');
    while (curseur.isBefore(fin) || curseur.isSame(fin, 'day')) {
      const cle = curseur.format('YYYY-MM-DD');
      jours.push({ date: cle, total: parDate.get(cle) ?? 0 });
      curseur = curseur.add(1, 'day');
    }
    return jours;
  }, [statistiques, periode]);

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/courriers')}>
          Retour
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Statistiques courrier
        </Typography.Title>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
          Imprimer
        </Button>
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker
          value={periode}
          onChange={(v) => v && v[0] && v[1] && setPeriode([v[0], v[1]])}
          format="DD/MM/YYYY"
          allowClear={false}
        />
        <Button onClick={() => setPeriode([dayjs().subtract(6, 'day'), dayjs()])}>7 derniers jours</Button>
        <Button onClick={() => setPeriode([dayjs().subtract(29, 'day'), dayjs()])}>30 derniers jours</Button>
        <Button onClick={() => setPeriode([dayjs().subtract(1, 'year'), dayjs()])}>12 derniers mois</Button>
      </Space>

      <div className="zone-imprimable">
        {/* En-tête + repère de période uniquement visibles à l'impression :
            l'en-tête interactif ci-dessus (boutons, sélecteur de période)
            est hors de .zone-imprimable. */}
        <div className="titre-impression" style={{ display: 'none' }}>
          <EnteteDocumentImprime organisation={organisation} entete={entete} titre="STATISTIQUES COURRIER" />
          <Typography.Paragraph style={{ textAlign: 'center', marginTop: -8 }}>
            Période du {periode[0].format('DD/MM/YYYY')} au {periode[1].format('DD/MM/YYYY')}
          </Typography.Paragraph>
        </div>

        <div style={{ marginBottom: 16 }}>
          <CourrierStatistiquesTuiles statistiques={statistiques} chargement={isLoading} />
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Évolution (courriers enregistrés)" vide={!isLoading && evolutionComplete.every((p) => p.total === 0)}>
              <CourbeEvolution points={evolutionComplete} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Répartition par sens" vide={!isLoading && !statistiques?.totaux.total}>
              <BarreSens totaux={statistiques?.totaux ?? { entrant: 0, sortant: 0, interne: 0 }} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Charge par entité" vide={!isLoading && !statistiques?.parEntite.length}>
              <BarreRepartition donnees={statistiques?.parEntite ?? []} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Répartition par type" vide={!isLoading && !statistiques?.parType.length}>
              <BarreRepartition donnees={statistiques?.parType ?? []} />
            </CardGraphique>
          </Col>
          <Col xs={24} lg={12}>
            <CardGraphique titre="Répartition par priorité" vide={!isLoading && !statistiques?.parPriorite.length}>
              <BarreRepartition donnees={statistiques?.parPriorite ?? []} />
            </CardGraphique>
          </Col>
        </Row>
      </div>
    </div>
  );
}
