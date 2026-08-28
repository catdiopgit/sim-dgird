import { PrinterOutlined } from '@ant-design/icons';
import { Button, Descriptions, Modal, Typography } from 'antd';
import { useMemo } from 'react';
import { useEnteteDocument } from '../../hooks/administration/useEnteteDocument';
import { useOrganisation } from '../../hooks/administration/useOrganisation';
import { useParticipantsMission } from '../../hooks/missions/useParticipants';
import type { Mission } from '../../services/missions/missions';
import type { MissionsReferentiel } from '../../services/missions/referentiel';
import { EnteteDocumentImprime } from '../courrier/EnteteDocumentImprime';

interface Props {
  mission: Mission;
  organisationId: string;
  entiteLibelle: string;
  responsableLibelle: string;
  referentiel: MissionsReferentiel | undefined;
  utilisateurParId: Map<string, string>;
  open: boolean;
  onClose: () => void;
}

// Ordre de mission imprimable — même patron que FicheExploitationModal
// (Courrier) : en-tête institutionnel partagé (EnteteDocumentImprime),
// impression via window.print() + .zone-imprimable (index.css), pas de
// dépendance PDF. Bouton d'accès conditionné (MissionDetailPage) à ce que
// la mission ait dépassé l'étape de validation.
export function MissionOrdreImprimeModal({
  mission,
  organisationId,
  entiteLibelle,
  responsableLibelle,
  referentiel,
  utilisateurParId,
  open,
  onClose,
}: Props) {
  const { data: organisation } = useOrganisation(organisationId);
  const entete = useEnteteDocument(organisationId);
  const { data: participants } = useParticipantsMission(mission.id);

  const roleParId = useMemo(
    () => new Map((referentiel?.typesParticipant ?? []).map((v) => [v.id, v.libelle])),
    [referentiel],
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={780}
      title="Ordre de mission"
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
      <div className="zone-imprimable">
        <EnteteDocumentImprime organisation={organisation} entete={entete} titre="ORDRE DE MISSION" />

        <Typography.Title level={5} style={{ marginBottom: 12, textAlign: 'center' }}>
          N° {mission.reference}
        </Typography.Title>

        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Objet" span={2}>
            {mission.objet}
          </Descriptions.Item>
          <Descriptions.Item label="Entité">{entiteLibelle}</Descriptions.Item>
          <Descriptions.Item label="Responsable">{responsableLibelle}</Descriptions.Item>
          <Descriptions.Item label="Lieu">{mission.lieu ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Budget prévu">
            {mission.budget_prevu != null ? `${mission.budget_prevu.toLocaleString('fr-FR')} FCFA` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Date de départ">
            {new Date(mission.date_depart).toLocaleDateString('fr-FR')}
          </Descriptions.Item>
          <Descriptions.Item label="Date de retour">
            {new Date(mission.date_retour).toLocaleDateString('fr-FR')}
          </Descriptions.Item>
          <Descriptions.Item label="Objectifs" span={2}>
            {mission.objectifs ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Activités prévues" span={2}>
            {mission.activites_prevues ?? '—'}
          </Descriptions.Item>
        </Descriptions>

        <Typography.Title level={5} style={{ marginTop: 16 }}>
          Participants
        </Typography.Title>
        {(participants ?? []).length === 0 ? (
          <Typography.Text type="secondary">Aucun participant enregistré</Typography.Text>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #d9d9d9', padding: '4px 8px', textAlign: 'left', fontSize: 12 }}>
                  Nom
                </th>
                <th style={{ border: '1px solid #d9d9d9', padding: '4px 8px', textAlign: 'left', fontSize: 12 }}>
                  Rôle
                </th>
              </tr>
            </thead>
            <tbody>
              {(participants ?? []).map((p) => (
                <tr key={p.id}>
                  <td style={{ border: '1px solid #d9d9d9', padding: '4px 8px', fontSize: 12 }}>
                    {utilisateurParId.get(p.utilisateur_id) ?? '—'}
                  </td>
                  <td style={{ border: '1px solid #d9d9d9', padding: '4px 8px', fontSize: 12 }}>
                    {p.role_participant_valeur_id ? (roleParId.get(p.role_participant_valeur_id) ?? '—') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
          <div style={{ textAlign: 'center', width: 220 }}>
            <Typography.Text style={{ fontSize: 12 }}>Le Responsable</Typography.Text>
            <div style={{ borderTop: '1px solid #000', marginTop: 48 }} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
