import { DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, Popconfirm, Progress, Row, Statistic, Table, Tag, message } from 'antd';
import { useMemo, useState } from 'react';
import { useAvenants } from '../../hooks/projets/useAvenants';
import { useDecaissementMutations, useDecaissements } from '../../hooks/projets/useDecaissements';
import { useDocumentsProjet } from '../../hooks/projets/useDocumentsProjet';
import { getUrlTelechargementDocument } from '../../services/projets/documents';
import type { Decaissement } from '../../services/projets/decaissements';
import { DecaissementFormModal } from './DecaissementFormModal';

interface Props {
  projetId: string;
  peutModifier: boolean;
  cloture: boolean;
  budgetPrevu: number | null;
  utilisateurParId: Map<string, string>;
}

// §2/§4/§5 Décaissements : origine (contrat d'origine ou avenant précis) et
// contrôles de cohérence par origine, appliqués côté serveur par
// app.fn_verifier_decaissement (0075) — l'UI se contente de relayer le
// message d'erreur si un cumul est dépassé.
export function ProjetDecaissementsTab({ projetId, peutModifier, cloture, budgetPrevu, utilisateurParId }: Props) {
  const { data: decaissements, isLoading } = useDecaissements(projetId);
  const { data: documents } = useDocumentsProjet(projetId);
  const { data: avenants } = useAvenants(projetId);
  const { remove: supprimer } = useDecaissementMutations(projetId);
  const [formOuvert, setFormOuvert] = useState(false);

  const documentParDecaissementId = useMemo(
    () => new Map((documents ?? []).filter((d) => d.decaissement_id).map((d) => [d.decaissement_id as string, d])),
    [documents],
  );
  const avenantParId = useMemo(() => new Map((avenants ?? []).map((a) => [a.id, a])), [avenants]);

  const cumulPct = useMemo(() => (decaissements ?? []).reduce((s, d) => s + d.pourcentage, 0), [decaissements]);
  const cumulMontant = useMemo(() => (decaissements ?? []).reduce((s, d) => s + d.montant, 0), [decaissements]);
  const solde = budgetPrevu != null ? budgetPrevu - cumulMontant : null;

  const cumulContrat = useMemo(
    () => (decaissements ?? []).filter((d) => !d.avenant_id).reduce((s, d) => s + d.montant, 0),
    [decaissements],
  );
  const cumulAvenants = useMemo(
    () => (decaissements ?? []).filter((d) => d.avenant_id).reduce((s, d) => s + d.montant, 0),
    [decaissements],
  );

  const nomOrigine = (d: Decaissement) => {
    if (!d.avenant_id) return "Contrat d'origine";
    return avenantParId.get(d.avenant_id)?.reference ?? 'Avenant';
  };

  const telecharger = async (decaissement: Decaissement) => {
    const document = documentParDecaissementId.get(decaissement.id);
    if (!document) {
      message.error('Aucun justificatif disponible.');
      return;
    }
    const url = await getUrlTelechargementDocument(document);
    if (!url) {
      message.error('Aucun fichier disponible pour ce justificatif.');
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <Card
      title="Décaissements"
      extra={
        peutModifier &&
        !cloture && (
          <Button icon={<PlusOutlined />} onClick={() => setFormOuvert(true)}>
            Ajouter un décaissement
          </Button>
        )
      }
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic title="Cumul décaissé" value={cumulPct} suffix="%" />
          <Progress percent={Math.min(100, Math.round(cumulPct))} size="small" status={cumulPct > 100 ? 'exception' : 'active'} />
        </Col>
        <Col span={6}>
          <Statistic title="Montant cumulé" value={cumulMontant} suffix="FCFA" />
        </Col>
        <Col span={6}>
          <Statistic title="Dont contrat d'origine / avenants" value={`${cumulContrat.toLocaleString('fr-FR')} / ${cumulAvenants.toLocaleString('fr-FR')}`} />
        </Col>
        <Col span={6}>
          <Statistic title="Solde restant à décaisser" value={solde ?? '—'} suffix={solde != null ? 'FCFA' : undefined} />
        </Col>
      </Row>

      <Table<Decaissement>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={decaissements}
        pagination={false}
        columns={[
          {
            title: 'Date',
            width: 110,
            render: (_, d) => new Date(d.date_decaissement).toLocaleDateString('fr-FR'),
          },
          {
            title: 'Origine',
            width: 160,
            render: (_, d) => (d.avenant_id ? <Tag color="purple">{nomOrigine(d)}</Tag> : <Tag>{nomOrigine(d)}</Tag>),
          },
          { title: 'Pourcentage', width: 100, render: (_, d) => `${d.pourcentage}%` },
          { title: 'Montant', render: (_, d) => `${d.montant.toLocaleString('fr-FR')} FCFA` },
          {
            title: 'Déposé par',
            width: 160,
            render: (_, d) => (d.created_by ? (utilisateurParId.get(d.created_by) ?? '—') : '—'),
          },
          { title: 'Observations', render: (_, d) => d.observations || '—' },
          {
            title: 'Actions',
            key: 'actions',
            width: 180,
            render: (_, d) => (
              <span>
                <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => void telecharger(d)}>
                  Justificatif
                </Button>
                {peutModifier && !cloture && (
                  <Popconfirm title="Supprimer ce décaissement ?" onConfirm={() => supprimer.mutate(d.id)}>
                    <Button type="link" size="small" danger>
                      Supprimer
                    </Button>
                  </Popconfirm>
                )}
              </span>
            ),
          },
        ]}
      />

      <DecaissementFormModal
        open={formOuvert}
        projetId={projetId}
        budgetPrevu={budgetPrevu}
        avenants={avenants}
        onClose={() => setFormOuvert(false)}
      />
    </Card>
  );
}
