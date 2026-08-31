import { CheckCircleOutlined, PlayCircleOutlined, ScheduleOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Popconfirm, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useDocumentsMarche } from '../../hooks/marches/useDocumentsMarche';
import { usePhaseMarcheMutations, usePhasesMarche } from '../../hooks/marches/usePhasesMarche';
import type { PhaseMarcheAvecStatut } from '../../services/marches/phasesMarche';
import { PhaseValidationModal } from './PhaseValidationModal';
import { COULEURS_STATUT_PHASE, LIBELLES_STATUT_PHASE } from './statutPhase';

interface Props {
  marcheId: string;
  peutModifier: boolean;
  cloture: boolean;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

// §10/§11/§13 : planification en cascade (bouton "Planifier", idempotent —
// génère les phases depuis le type de marché si aucune n'existe encore, sinon
// recalcule les dates prévisionnelles), suivi individuel de chaque phase avec
// dates prévues/réelles distinctes, statut calculé côté serveur.
export function MarchePhasesTab({ marcheId, peutModifier, cloture }: Props) {
  const { data: phases, isLoading } = usePhasesMarche(marcheId);
  const { data: documents } = useDocumentsMarche(marcheId);
  const { planifier, demarrer, valider } = usePhaseMarcheMutations(marcheId);
  const [phaseAValider, setPhaseAValider] = useState<PhaseMarcheAvecStatut | null>(null);

  const phasesAvecJustificatif = useMemo(
    () => new Set((documents ?? []).filter((d) => d.phase_marche_id).map((d) => d.phase_marche_id as string)),
    [documents],
  );

  return (
    <Card
      title="Planification et réalisation des phases"
      extra={
        peutModifier &&
        !cloture && (
          <Button icon={<ScheduleOutlined />} loading={planifier.isPending} onClick={() => planifier.mutate()}>
            {phases && phases.length > 0 ? 'Recalculer la planification' : 'Planifier'}
          </Button>
        )
      }
    >
      {!isLoading && (!phases || phases.length === 0) && (
        <Empty description="Aucune phase planifiée — cliquez sur « Planifier » (le type de marché doit avoir des phases paramétrées)." />
      )}

      <Table<PhaseMarcheAvecStatut>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={phases}
        pagination={false}
        columns={[
          { title: 'Phase', dataIndex: 'nom' },
          { title: 'Durée prévue', width: 110, render: (_, p) => `${p.duree_prevue} ${p.unite_duree}(s)` },
          { title: 'Début prévisionnel', width: 130, render: (_, p) => fmt(p.date_debut_prevue) },
          { title: 'Fin prévisionnelle', width: 130, render: (_, p) => fmt(p.date_fin_prevue) },
          { title: 'Début réel', width: 120, render: (_, p) => fmt(p.date_debut_reelle) },
          { title: 'Fin réelle', width: 120, render: (_, p) => fmt(p.date_fin_reelle) },
          {
            title: 'Obligatoire',
            width: 100,
            render: (_, p) => (p.obligatoire ? <Tag>Oui</Tag> : <Tag color="default">Non</Tag>),
          },
          {
            title: 'Statut',
            width: 170,
            render: (_, p) => <Tag color={COULEURS_STATUT_PHASE[p.statut_calcule]}>{LIBELLES_STATUT_PHASE[p.statut_calcule]}</Tag>,
          },
          {
            title: 'Justificatif',
            width: 100,
            render: (_, p) => (phasesAvecJustificatif.has(p.id) ? <Tag color="green">Présent</Tag> : <Tag>Aucun</Tag>),
          },
          ...(peutModifier && !cloture
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 200,
                  render: (_: unknown, p: PhaseMarcheAvecStatut) => {
                    if (p.date_fin_reelle) return null;
                    return (
                      <span>
                        {!p.date_debut_reelle && (
                          <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => demarrer.mutate(p.id)}>
                            Démarrer
                          </Button>
                        )}
                        {phasesAvecJustificatif.has(p.id) ? (
                          <Popconfirm title="Valider la réalisation de cette phase ?" onConfirm={() => valider.mutate(p.id)}>
                            <Button type="link" size="small" icon={<CheckCircleOutlined />} loading={valider.isPending}>
                              Valider la réalisation
                            </Button>
                          </Popconfirm>
                        ) : (
                          <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => setPhaseAValider(p)}>
                            Valider la réalisation
                          </Button>
                        )}
                      </span>
                    );
                  },
                },
              ]
            : []),
        ]}
      />

      {phases && phases.some((p) => p.statut_calcule === 'en_retard') && (
        <Alert
          style={{ marginTop: 16 }}
          type="warning"
          showIcon
          message="Certaines phases sont en retard — une alerte par e-mail est envoyée automatiquement au responsable du marché."
        />
      )}

      <PhaseValidationModal
        open={phaseAValider !== null}
        marcheId={marcheId}
        phase={phaseAValider}
        onClose={() => setPhaseAValider(null)}
      />
    </Card>
  );
}
