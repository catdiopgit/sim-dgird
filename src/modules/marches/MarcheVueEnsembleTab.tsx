import { Alert, Card, Col, Descriptions, Progress, Row, Space, Statistic, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { useDocumentsMarche } from '../../hooks/marches/useDocumentsMarche';
import { useMarcheAttribution } from '../../hooks/marches/useMarcheAttribution';
import { useMarcheCandidats } from '../../hooks/marches/useMarcheCandidats';
import { usePhasesMarche } from '../../hooks/marches/usePhasesMarche';
import type { Marche } from '../../services/marches/marches';

interface Props {
  marche: Marche;
  entiteParId: Map<string, string>;
  typeParId: Map<string, string>;
  utilisateurParId: Map<string, string>;
  candidatParId: Map<string, string>;
}

// §21 Vue d'ensemble — état global, progression des phases, prochaines
// échéances et écarts prévu/réel, entreprises/attribution, à l'image de
// ProjetVueEnsembleTab côté Projets.
export function MarcheVueEnsembleTab({ marche, entiteParId, typeParId, utilisateurParId, candidatParId }: Props) {
  const { data: phases } = usePhasesMarche(marche.id);
  const { data: documents } = useDocumentsMarche(marche.id);
  const { data: candidats } = useMarcheCandidats(marche.id);
  const { data: attribution } = useMarcheAttribution(marche.id);

  const repartition = useMemo(() => {
    const compte = { realisees: 0, enCours: 0, enRetard: 0, aVenir: 0, total: phases?.length ?? 0 };
    for (const p of phases ?? []) {
      if (p.statut_calcule.startsWith('realisee')) compte.realisees += 1;
      else if (p.statut_calcule === 'en_cours') compte.enCours += 1;
      else if (p.statut_calcule === 'en_retard') compte.enRetard += 1;
      else compte.aVenir += 1;
    }
    return compte;
  }, [phases]);

  const avancementPct = repartition.total > 0 ? Math.round((repartition.realisees / repartition.total) * 100) : 0;

  const prochaineEcheance = useMemo(
    () =>
      (phases ?? [])
        .filter((p) => !p.date_fin_reelle && p.date_fin_prevue)
        .sort((a, b) => (a.date_fin_prevue! < b.date_fin_prevue! ? -1 : 1))[0] ?? null,
    [phases],
  );

  const statutGlobal = useMemo(() => {
    if (marche.statut_cloture === 'cloture') return { libelle: 'Clôturé', couleur: 'green' };
    if (repartition.enRetard > 0) return { libelle: 'En retard', couleur: 'red' };
    if (!marche.date_debut_prevue || dayjsAfter(marche.date_debut_prevue)) return { libelle: 'À venir', couleur: 'default' };
    return { libelle: 'En cours', couleur: 'blue' };
  }, [marche, repartition]);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Typography.Text type="secondary">État global</Typography.Text>
            <div style={{ marginTop: 4 }}>
              <Tag color={statutGlobal.couleur}>{statutGlobal.libelle}</Tag>
            </div>
          </Col>
          <Col span={6}>
            <Statistic title="Progression des phases" value={avancementPct} suffix="%" />
          </Col>
          <Col span={6}>
            <Statistic title="Phases" value={repartition.total} />
          </Col>
          <Col span={6}>
            <Statistic title="Documents" value={documents?.length ?? 0} />
          </Col>
        </Row>
        <Progress style={{ marginTop: 16 }} percent={avancementPct} status={avancementPct >= 100 ? 'success' : 'active'} />
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col span={8}>
            <Statistic title="Phases terminées" value={repartition.realisees} valueStyle={{ color: '#3f8600' }} />
          </Col>
          <Col span={8}>
            <Statistic title="Phases en cours" value={repartition.enCours} valueStyle={{ color: '#1677ff' }} />
          </Col>
          <Col span={8}>
            <Statistic title="Phases en retard" value={repartition.enRetard} valueStyle={{ color: '#cf1322' }} />
          </Col>
        </Row>
      </Card>

      {repartition.enRetard > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Points nécessitant une attention"
          description={`${repartition.enRetard} phase(s) en retard sur ce marché.`}
        />
      )}

      <Card title="Entreprises / consultants et attribution">
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Statistic title="Candidats enregistrés" value={candidats?.length ?? 0} />
          </Col>
          <Col span={8}>
            <Statistic
              title="Attributaire"
              value={attribution ? (candidatParId.get(attribution.candidat_attributaire_id) ?? '—') : '—'}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Montant attribué"
              value={attribution?.montant_attribue ?? '—'}
              suffix={attribution?.montant_attribue != null ? 'FCFA' : undefined}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Type de marché">{typeParId.get(marche.type_marche_id) ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Entité porteuse">{entiteParId.get(marche.entite_id) ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Responsable">
            {marche.responsable_id ? (utilisateurParId.get(marche.responsable_id) ?? '—') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Montant estimatif">
            {marche.montant_estimatif != null ? `${marche.montant_estimatif.toLocaleString('fr-FR')} FCFA` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Début prévisionnel">
            {marche.date_debut_prevue ? new Date(marche.date_debut_prevue).toLocaleDateString('fr-FR') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Fin prévisionnelle">
            {marche.date_fin_prevue ? new Date(marche.date_fin_prevue).toLocaleDateString('fr-FR') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Prochaine échéance" span={2}>
            {prochaineEcheance
              ? `${prochaineEcheance.nom} — ${new Date(prochaineEcheance.date_fin_prevue!).toLocaleDateString('fr-FR')}`
              : 'Aucune'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );
}

function dayjsAfter(date: string): boolean {
  return new Date(date).getTime() > Date.now();
}
