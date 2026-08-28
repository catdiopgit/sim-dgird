import { ArrowLeftOutlined, EditOutlined, PrinterOutlined } from '@ant-design/icons';
import { Button, Descriptions, Popconfirm, Result, Skeleton, Space, Tabs, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useMission, useMissionMutations, useMissionsReferentiel } from '../../hooks/missions/useMissions';
import { usePeutModifierMission } from '../../hooks/missions/usePeutModifierMission';
import { useProfile } from '../../hooks/useProfile';
import { MissionActionsSuiviTab } from './MissionActionsSuiviTab';
import { MissionDepensesTab } from './MissionDepensesTab';
import { MissionDocumentsTab } from './MissionDocumentsTab';
import { MissionFormModal } from './MissionFormModal';
import { MissionOrdreImprimeModal } from './MissionOrdreImprimeModal';
import { MissionParticipantsTab } from './MissionParticipantsTab';
import { MissionWorkflowPanel } from './MissionWorkflowPanel';

// Étapes atteintes une fois la soumission validée (transition
// "valider-soumission", cf. migration 0077) — avant cela, l'ordre de
// mission n'a pas encore de valeur officielle.
const ETAPES_POST_VALIDATION = new Set([
  'preparation',
  'en-cours',
  'retour-rapport',
  'validation-rapport',
  'cloture',
]);

export function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const { data: mission, isLoading, isError } = useMission(id);
  const { data: referentiel } = useMissionsReferentiel(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { remove: supprimerMission } = useMissionMutations(organisationId);
  const peutModifier = usePeutModifierMission(mission, profile?.id, can);

  const [editionOuverte, setEditionOuverte] = useState(false);
  const [impressionOuverte, setImpressionOuverte] = useState(false);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  if (isLoading || !organisationId) return <Skeleton active />;

  if (isError || !mission) {
    return (
      <Result
        status="404"
        title="Mission introuvable"
        subTitle="Cette mission n'existe pas ou vous n'y avez pas accès."
        extra={
          <Button type="primary" onClick={() => navigate('/missions')}>
            Retour aux missions
          </Button>
        }
      />
    );
  }

  const peutSupprimer = can('missions', 'supprimer', mission.entite_id);

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/missions')}>
          Retour
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {mission.reference} — {mission.objet}
        </Typography.Title>
        {mission.etape_libelle && <Tag color="blue">{mission.etape_libelle}</Tag>}
        {mission.etape_code && ETAPES_POST_VALIDATION.has(mission.etape_code) && (
          <Button icon={<PrinterOutlined />} onClick={() => setImpressionOuverte(true)}>
            Imprimer l'ordre de mission
          </Button>
        )}
        {peutModifier && (
          <Button icon={<EditOutlined />} onClick={() => setEditionOuverte(true)}>
            Modifier
          </Button>
        )}
        {peutSupprimer && (
          <Popconfirm
            title="Supprimer cette mission ?"
            onConfirm={() => supprimerMission.mutate(mission.id, { onSuccess: () => navigate('/missions') })}
          >
            <Button danger loading={supprimerMission.isPending}>
              Supprimer
            </Button>
          </Popconfirm>
        )}
      </Space>

      <Tabs
        items={[
          {
            key: 'vue-ensemble',
            label: "Vue d'ensemble",
            children: (
              <div>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Entité">{entiteParId.get(mission.entite_id) ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Responsable">
                    {mission.responsable_id ? (utilisateurParId.get(mission.responsable_id) ?? '—') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Lieu">{mission.lieu ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Étape">{mission.etape_libelle ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Date de départ">
                    {new Date(mission.date_depart).toLocaleDateString('fr-FR')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Date de retour">
                    {new Date(mission.date_retour).toLocaleDateString('fr-FR')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Budget prévu">
                    {mission.budget_prevu != null ? `${mission.budget_prevu.toLocaleString('fr-FR')} FCFA` : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Budget réel">
                    {mission.budget_reel != null ? `${mission.budget_reel.toLocaleString('fr-FR')} FCFA` : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Objectifs" span={2}>
                    {mission.objectifs ?? '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Activités prévues" span={2}>
                    {mission.activites_prevues ?? '—'}
                  </Descriptions.Item>
                </Descriptions>

                <MissionWorkflowPanel mission={mission} organisationId={organisationId} />
              </div>
            ),
          },
          {
            key: 'participants',
            label: 'Participants',
            children: (
              <MissionParticipantsTab
                missionId={mission.id}
                organisationId={organisationId}
                peutModifier={peutModifier}
                referentiel={referentiel}
                utilisateurParId={utilisateurParId}
              />
            ),
          },
          {
            key: 'actions-suivi',
            label: 'Actions de suivi',
            children: (
              <MissionActionsSuiviTab
                missionId={mission.id}
                organisationId={organisationId}
                peutModifier={peutModifier}
                referentiel={referentiel}
                utilisateurParId={utilisateurParId}
              />
            ),
          },
          {
            key: 'depenses',
            label: 'Dépenses',
            children: (
              <MissionDepensesTab
                missionId={mission.id}
                peutModifier={peutModifier}
                budgetPrevu={mission.budget_prevu}
                budgetReel={mission.budget_reel}
              />
            ),
          },
          {
            key: 'documents',
            label: 'Documents',
            children: (
              <MissionDocumentsTab
                missionId={mission.id}
                peutModifier={peutModifier}
                ordreMissionDocumentId={mission.ordre_mission_document_id}
                compteRenduDocumentId={mission.compte_rendu_document_id}
                pvDocumentId={mission.pv_document_id}
              />
            ),
          },
        ]}
      />

      <MissionFormModal
        open={editionOuverte}
        organisationId={organisationId}
        mission={mission}
        onClose={() => setEditionOuverte(false)}
      />

      <MissionOrdreImprimeModal
        mission={mission}
        organisationId={organisationId}
        entiteLibelle={entiteParId.get(mission.entite_id) ?? '—'}
        responsableLibelle={mission.responsable_id ? (utilisateurParId.get(mission.responsable_id) ?? '—') : '—'}
        referentiel={referentiel}
        utilisateurParId={utilisateurParId}
        open={impressionOuverte}
        onClose={() => setImpressionOuverte(false)}
      />
    </div>
  );
}
