import { Alert, Card, Col, Descriptions, Progress, Row, Space, Statistic, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { useAvenants } from '../../hooks/projets/useAvenants';
import { useContactsExecution } from '../../hooks/projets/useContactsExecution';
import { useDecaissements } from '../../hooks/projets/useDecaissements';
import { useDocumentsProjet } from '../../hooks/projets/useDocumentsProjet';
import { useLivrables } from '../../hooks/projets/useLivrables';
import type { Projet } from '../../services/projets/projets';
import type { ProjetsReferentiel } from '../../services/projets/referentiel';

interface Props {
  projet: Projet;
  referentiel: ProjetsReferentiel | undefined;
  entiteParId: Map<string, string>;
  utilisateurParId: Map<string, string>;
}

const LIBELLES_ORGANISME: Record<Projet['organisme_execution_type'], string> = {
  organisation: "L'organisation elle-même",
  consultant: 'Consultant',
  entreprise: 'Entreprise',
  externe: 'Autre organisme externe',
};

// §7 Vue d'ensemble : tableau de pilotage du projet — avancement (calculé
// automatiquement à partir des livrables, §6), situation financière
// (décaissements vs budget), équipe de direction, et alertes sur les points
// nécessitant une attention (poids des livrables, retards, justificatifs
// manquants, dépassement budgétaire).
export function ProjetVueEnsembleTab({ projet, referentiel, entiteParId, utilisateurParId }: Props) {
  const { data: livrables } = useLivrables(projet.id);
  const { data: documents } = useDocumentsProjet(projet.id);
  const { data: avenants } = useAvenants(projet.id);
  const { data: decaissements } = useDecaissements(projet.id);
  const { data: contacts } = useContactsExecution(projet.id);

  const statutParId = useMemo(() => new Map((referentiel?.statuts ?? []).map((v) => [v.id, v])), [referentiel]);
  const statutLivrableParId = useMemo(
    () => new Map((referentiel?.statutsLivrable ?? []).map((v) => [v.id, v])),
    [referentiel],
  );
  const contactParId = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, c.nom])), [contacts]);

  const statut = projet.statut_valeur_id ? statutParId.get(projet.statut_valeur_id) : null;

  const repartitionLivrables = useMemo(() => {
    const compte = { realises: 0, enCours: 0, nonRealises: 0, total: livrables?.length ?? 0, poidsTotal: 0 };
    for (const l of livrables ?? []) {
      compte.poidsTotal += l.poids_pct;
      const code = l.statut_valeur_id ? statutLivrableParId.get(l.statut_valeur_id)?.code : null;
      if (code === 'realise' || code === 'valide') compte.realises += 1;
      else if (code === 'en-cours') compte.enCours += 1;
      else compte.nonRealises += 1;
    }
    return compte;
  }, [livrables, statutLivrableParId]);

  const cumulPct = useMemo(() => (decaissements ?? []).reduce((s, d) => s + d.pourcentage, 0), [decaissements]);
  const cumulMontant = useMemo(() => (decaissements ?? []).reduce((s, d) => s + d.montant, 0), [decaissements]);
  const cumulContrat = useMemo(
    () => (decaissements ?? []).filter((d) => !d.avenant_id).reduce((s, d) => s + d.montant, 0),
    [decaissements],
  );
  const cumulAvenants = useMemo(
    () => (decaissements ?? []).filter((d) => d.avenant_id).reduce((s, d) => s + d.montant, 0),
    [decaissements],
  );
  // §3 (V3 bis) : le montant contractuel consolidé intègre les avenants —
  // le contrat d'origine seul ne suffit plus à représenter l'engagement
  // financier réel du projet une fois des avenants signés.
  const montantAvenants = useMemo(() => (avenants ?? []).reduce((s, a) => s + (a.montant ?? 0), 0), [avenants]);
  const montantContractuel =
    projet.budget_prevu != null || montantAvenants > 0 ? (projet.budget_prevu ?? 0) + montantAvenants : null;
  const solde = montantContractuel != null ? montantContractuel - cumulMontant : null;
  const dernierDecaissement = useMemo(
    () => (decaissements ?? [])[0] ?? null, // déjà trié par date_decaissement desc côté service
    [decaissements],
  );

  const nomChargeExecution = projet.charge_execution_utilisateur_id
    ? (utilisateurParId.get(projet.charge_execution_utilisateur_id) ?? '—')
    : projet.charge_execution_contact_id
      ? (contactParId.get(projet.charge_execution_contact_id) ?? '—')
      : null;

  const alertes = useMemo(() => {
    const liste: string[] = [];
    if ((livrables?.length ?? 0) > 0 && repartitionLivrables.poidsTotal !== 100) {
      liste.push(`La somme des quote-parts des livrables est de ${repartitionLivrables.poidsTotal}% (devrait être 100%).`);
    }
    const enRetard = (livrables ?? []).filter(
      (l) => (l.statut_valeur_id ? statutLivrableParId.get(l.statut_valeur_id)?.code : null) === 'en-retard',
    ).length;
    if (enRetard > 0) liste.push(`${enRetard} livrable(s) en retard.`);
    const sansJustificatif = (livrables ?? []).filter((l) => {
      const code = l.statut_valeur_id ? statutLivrableParId.get(l.statut_valeur_id)?.code : null;
      if (code !== 'realise' && code !== 'valide') return false;
      return !(documents ?? []).some((d) => d.livrable_id === l.id);
    }).length;
    if (sansJustificatif > 0) liste.push(`${sansJustificatif} livrable(s) réalisé(s) sans document justificatif.`);
    if (montantContractuel != null && cumulMontant > montantContractuel) {
      liste.push('Le cumul des décaissements dépasse le montant contractuel (contrat + avenants).');
    }
    return liste;
  }, [livrables, repartitionLivrables, statutLivrableParId, documents, montantContractuel, cumulMontant]);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Typography.Text type="secondary">Statut</Typography.Text>
            <div style={{ marginTop: 4 }}>
              {statut ? <Tag color={statut.couleur ?? undefined}>{statut.libelle}</Tag> : '—'}
            </div>
          </Col>
          <Col span={6}>
            <Statistic title="Avancement global (calculé)" value={Math.round(projet.avancement_pct)} suffix="%" />
          </Col>
          <Col span={6}>
            <Statistic title="Livrables" value={repartitionLivrables.total} />
          </Col>
          <Col span={6}>
            <Statistic title="Avenants" value={avenants?.length ?? 0} />
          </Col>
        </Row>

        <Progress
          style={{ marginTop: 16 }}
          percent={Math.round(projet.avancement_pct)}
          status={projet.avancement_pct >= 100 ? 'success' : 'active'}
        />

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col span={8}>
            <Statistic title="Livrables réalisés" value={repartitionLivrables.realises} valueStyle={{ color: '#3f8600' }} />
          </Col>
          <Col span={8}>
            <Statistic title="Livrables en cours" value={repartitionLivrables.enCours} valueStyle={{ color: '#1677ff' }} />
          </Col>
          <Col span={8}>
            <Statistic title="Livrables non réalisés" value={repartitionLivrables.nonRealises} valueStyle={{ color: '#cf1322' }} />
          </Col>
        </Row>
      </Card>

      <Card title="Situation financière">
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Statistic title="Montant total du projet" value={montantContractuel ?? '—'} suffix={montantContractuel != null ? 'FCFA' : undefined} />
            {montantAvenants > 0 && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                dont {avenants?.length ?? 0} avenant(s) : {montantAvenants.toLocaleString('fr-FR')} FCFA
              </Typography.Text>
            )}
          </Col>
          <Col span={6}>
            <Statistic title="Montant décaissé" value={cumulMontant} suffix="FCFA" />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              dont contrat d'origine {cumulContrat.toLocaleString('fr-FR')} / avenants {cumulAvenants.toLocaleString('fr-FR')} FCFA
            </Typography.Text>
          </Col>
          <Col span={6}>
            <Statistic
              title="% financier décaissé"
              value={montantContractuel ? Math.round((cumulMontant / montantContractuel) * 10000) / 100 : cumulPct}
              suffix="%"
            />
          </Col>
          <Col span={6}>
            <Statistic title="Solde restant" value={solde ?? '—'} suffix={solde != null ? 'FCFA' : undefined} />
          </Col>
        </Row>
        <Typography.Paragraph style={{ marginTop: 12 }} type="secondary">
          Dernier décaissement :{' '}
          {dernierDecaissement
            ? `${dernierDecaissement.montant.toLocaleString('fr-FR')} FCFA le ${new Date(dernierDecaissement.date_decaissement).toLocaleDateString('fr-FR')}`
            : 'aucun'}
        </Typography.Paragraph>
      </Card>

      {alertes.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Points nécessitant une attention"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {alertes.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          }
        />
      )}

      <Card>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Entité porteuse">{entiteParId.get(projet.entite_id) ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Responsable du projet">
            {projet.responsable_id ? (utilisateurParId.get(projet.responsable_id) ?? '—') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Organisme chargé de l'exécution">
            {LIBELLES_ORGANISME[projet.organisme_execution_type]}
            {projet.organisme_execution_type !== 'organisation' && projet.organisme_execution_nom
              ? ` — ${projet.organisme_execution_nom}`
              : ''}
          </Descriptions.Item>
          <Descriptions.Item label="Chargé de l'exécution">{nomChargeExecution ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Date de début">
            {projet.date_debut ? new Date(projet.date_debut).toLocaleDateString('fr-FR') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Date de fin prévue">
            {projet.date_fin_prevue ? new Date(projet.date_fin_prevue).toLocaleDateString('fr-FR') : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );
}
