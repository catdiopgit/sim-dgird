import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Popconfirm, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useParticipantMutations, useParticipantsMission } from '../../hooks/missions/useParticipants';
import type { MissionsReferentiel } from '../../services/missions/referentiel';
import type { MissionParticipant } from '../../services/missions/participants';
import { MissionParticipantFormModal } from './MissionParticipantFormModal';

interface Props {
  missionId: string;
  organisationId: string;
  peutModifier: boolean;
  referentiel: MissionsReferentiel | undefined;
  utilisateurParId: Map<string, string>;
}

export function MissionParticipantsTab({ missionId, organisationId, peutModifier, referentiel, utilisateurParId }: Props) {
  const { data: participants, isLoading } = useParticipantsMission(missionId);
  const { retirer } = useParticipantMutations(missionId);
  const [formOuvert, setFormOuvert] = useState(false);

  const roleParId = useMemo(
    () => new Map((referentiel?.typesParticipant ?? []).map((v) => [v.id, v])),
    [referentiel],
  );

  return (
    <Card
      title="Participants"
      extra={
        peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setFormOuvert(true)}>
            Ajouter un participant
          </Button>
        )
      }
    >
      <Table<MissionParticipant>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={participants}
        pagination={false}
        columns={[
          { title: 'Participant', render: (_, p) => utilisateurParId.get(p.utilisateur_id) ?? '—' },
          {
            title: 'Rôle',
            render: (_, p) => {
              const r = p.role_participant_valeur_id ? roleParId.get(p.role_participant_valeur_id) : null;
              return r ? <Tag color={r.couleur ?? undefined}>{r.libelle}</Tag> : '—';
            },
          },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 100,
                  render: (_: unknown, p: MissionParticipant) => (
                    <Popconfirm title="Retirer ce participant ?" onConfirm={() => retirer.mutate(p.id)}>
                      <Button type="link" size="small" danger>
                        Retirer
                      </Button>
                    </Popconfirm>
                  ),
                },
              ]
            : []),
        ]}
      />
      <MissionParticipantFormModal
        open={formOuvert}
        organisationId={organisationId}
        missionId={missionId}
        onClose={() => setFormOuvert(false)}
      />
    </Card>
  );
}
