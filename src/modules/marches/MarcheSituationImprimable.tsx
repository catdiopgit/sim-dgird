import { PrinterOutlined } from '@ant-design/icons';
import { Button, Descriptions, Modal, Skeleton, Table, Tag, Typography } from 'antd';
import { useOrganisation } from '../../hooks/administration/useOrganisation';
import { useDocumentsMarche } from '../../hooks/marches/useDocumentsMarche';
import { useMarcheAttribution } from '../../hooks/marches/useMarcheAttribution';
import { usePhasesMarche } from '../../hooks/marches/usePhasesMarche';
import type { Marche } from '../../services/marches/marches';
import type { PhaseMarcheAvecStatut } from '../../services/marches/phasesMarche';
import { COULEURS_STATUT_PHASE, LIBELLES_STATUT_PHASE } from './statutPhase';

interface Props {
  open: boolean;
  marche: Marche;
  entiteParId: Map<string, string>;
  typeParId: Map<string, string>;
  utilisateurParId: Map<string, string>;
  candidatParId: Map<string, string>;
  onClose: () => void;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const ecart = (phase: PhaseMarcheAvecStatut) => {
  if (phase.ecart_jours == null) return '—';
  if (phase.ecart_jours === 0) return 'À temps';
  return phase.ecart_jours > 0 ? `+${phase.ecart_jours} j (retard)` : `${phase.ecart_jours} j (avance)`;
};

// §17 « Imprimer la situation du marché » — sortie professionnelle et
// institutionnelle, même mécanisme que FicheExploitationModal côté Courriers :
// window.print() + CSS @media print isolant .zone-imprimable.
export function MarcheSituationImprimable({
  open,
  marche,
  entiteParId,
  typeParId,
  utilisateurParId,
  candidatParId,
  onClose,
}: Props) {
  const { data: organisation } = useOrganisation(marche.organisation_id);
  const { data: phases, isLoading } = usePhasesMarche(marche.id);
  const { data: attribution } = useMarcheAttribution(marche.id);
  const { data: documents } = useDocumentsMarche(marche.id);

  const phasesAvecJustificatif = new Set((documents ?? []).filter((d) => d.phase_marche_id).map((d) => d.phase_marche_id));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={860}
      title="Situation du marché"
      footer={[
        <Button key="fermer" onClick={onClose}>
          Fermer
        </Button>,
        <Button key="imprimer" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
          Imprimer
        </Button>,
      ]}
      destroyOnHidden
    >
      {isLoading ? (
        <Skeleton active />
      ) : (
        <div className="zone-imprimable">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {organisation?.logo_url && <img src={organisation.logo_url} alt="" style={{ height: 48, objectFit: 'contain' }} />}
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {organisation?.nom ?? ''}
              </Typography.Title>
              <Typography.Text type="secondary">Situation du marché — {marche.reference}</Typography.Text>
            </div>
          </div>

          <Typography.Title level={5}>Informations générales</Typography.Title>
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Référence">{marche.reference}</Descriptions.Item>
            <Descriptions.Item label="Objet">{marche.objet}</Descriptions.Item>
            <Descriptions.Item label="Type">{typeParId.get(marche.type_marche_id) ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Responsable">
              {marche.responsable_id ? (utilisateurParId.get(marche.responsable_id) ?? '—') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Entité porteuse">{entiteParId.get(marche.entite_id) ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Statut">
              {marche.statut_cloture === 'cloture' ? <Tag color="green">Clôturé</Tag> : <Tag color="blue">En cours</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Début prévisionnel">{fmt(marche.date_debut_prevue)}</Descriptions.Item>
            <Descriptions.Item label="Fin prévisionnelle">{fmt(marche.date_fin_prevue)}</Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5}>Planification et réalisation</Typography.Title>
          <Table<PhaseMarcheAvecStatut>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={phases}
            style={{ marginBottom: 16 }}
            columns={[
              { title: 'Phase', dataIndex: 'nom' },
              { title: 'Durée prévue', render: (_, p) => `${p.duree_prevue} ${p.unite_duree}(s)` },
              { title: 'Début prévu', render: (_, p) => fmt(p.date_debut_prevue) },
              { title: 'Fin prévue', render: (_, p) => fmt(p.date_fin_prevue) },
              { title: 'Début réel', render: (_, p) => fmt(p.date_debut_reelle) },
              { title: 'Fin réelle', render: (_, p) => fmt(p.date_fin_reelle) },
              { title: 'Écart', render: (_, p) => ecart(p) },
              {
                title: 'Statut',
                render: (_, p) => <Tag color={COULEURS_STATUT_PHASE[p.statut_calcule]}>{LIBELLES_STATUT_PHASE[p.statut_calcule]}</Tag>,
              },
              { title: 'Justificatif', render: (_, p) => (phasesAvecJustificatif.has(p.id) ? 'Oui' : 'Non') },
            ]}
          />

          <Typography.Title level={5}>Attribution</Typography.Title>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Attributaire">
              {attribution ? (candidatParId.get(attribution.candidat_attributaire_id) ?? '—') : 'Non attribué'}
            </Descriptions.Item>
            <Descriptions.Item label="Montant">
              {attribution?.montant_attribue != null ? `${attribution.montant_attribue.toLocaleString('fr-FR')} FCFA` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Date d'attribution">{fmt(attribution?.date_attribution ?? null)}</Descriptions.Item>
            <Descriptions.Item label="Observations">{attribution?.observations ?? '—'}</Descriptions.Item>
          </Descriptions>
        </div>
      )}
    </Modal>
  );
}
