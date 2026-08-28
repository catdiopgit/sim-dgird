import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Popconfirm, Select, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useActionSuiviMutations, useActionsSuiviMission } from '../../hooks/missions/useActionsSuivi';
import type { MissionsReferentiel } from '../../services/missions/referentiel';
import type { MissionActionSuivi } from '../../services/missions/actionsSuivi';
import { MissionActionSuiviFormModal } from './MissionActionSuiviFormModal';

interface Props {
  missionId: string;
  organisationId: string;
  peutModifier: boolean;
  referentiel: MissionsReferentiel | undefined;
  utilisateurParId: Map<string, string>;
}

export function MissionActionsSuiviTab({ missionId, organisationId, peutModifier, referentiel, utilisateurParId }: Props) {
  const { data: actions, isLoading } = useActionsSuiviMission(missionId);
  const { update, supprimer } = useActionSuiviMutations(missionId);
  const [formOuvert, setFormOuvert] = useState(false);

  const statutParId = useMemo(() => new Map((referentiel?.statutsAction ?? []).map((v) => [v.id, v])), [referentiel]);

  return (
    <Card
      title="Actions de suivi"
      extra={
        peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setFormOuvert(true)}>
            Ajouter une action
          </Button>
        )
      }
    >
      <Table<MissionActionSuivi>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={actions}
        pagination={false}
        columns={[
          { title: 'Description', dataIndex: 'description' },
          { title: 'Responsable', render: (_, a) => (a.responsable_id ? (utilisateurParId.get(a.responsable_id) ?? '—') : '—') },
          {
            title: 'Échéance',
            width: 120,
            render: (_, a) => (a.date_echeance ? new Date(a.date_echeance).toLocaleDateString('fr-FR') : '—'),
          },
          {
            title: 'Statut',
            width: 180,
            render: (_, a) => {
              if (!peutModifier) {
                const s = a.statut_valeur_id ? statutParId.get(a.statut_valeur_id) : null;
                return s ? <Tag color={s.couleur ?? undefined}>{s.libelle}</Tag> : '—';
              }
              return (
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  value={a.statut_valeur_id ?? undefined}
                  allowClear
                  options={(referentiel?.statutsAction ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
                  onChange={(v) => update.mutate({ id: a.id, patch: { statut_valeur_id: v ?? null } })}
                />
              );
            },
          },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 100,
                  render: (_: unknown, a: MissionActionSuivi) => (
                    <Popconfirm title="Supprimer cette action ?" onConfirm={() => supprimer.mutate(a.id)}>
                      <Button type="link" size="small" danger>
                        Supprimer
                      </Button>
                    </Popconfirm>
                  ),
                },
              ]
            : []),
        ]}
      />
      <MissionActionSuiviFormModal
        open={formOuvert}
        organisationId={organisationId}
        missionId={missionId}
        onClose={() => setFormOuvert(false)}
      />
    </Card>
  );
}
