import { Button, Card, Input, Popconfirm, Skeleton, Space, Timeline, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import {
  useWorkflowEtapes,
  useWorkflowHistorique,
  useWorkflowInstance,
} from '../../hooks/workflow/useWorkflowGenerique';
import { useExecuterTransitionVersement, useTransitionsDisponiblesVersement } from '../../hooks/ged/useWorkflowGed';
import type { GedVersement } from '../../services/ged/versements';

interface Props {
  versement: GedVersement;
  organisationId: string;
}

export function GedWorkflowPanel({ versement, organisationId }: Props) {
  const { data: instance, isLoading: chargementInstance } = useWorkflowInstance(
    versement.workflow_instance_id ?? undefined,
  );
  const { data: etapes } = useWorkflowEtapes(instance?.workflow_definition_id);
  const { data: historique, isLoading: chargementHistorique } = useWorkflowHistorique(
    versement.workflow_instance_id ?? undefined,
  );
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: transitionsDisponibles, isLoading: chargementTransitions } = useTransitionsDisponiblesVersement(
    versement.id,
  );
  const executer = useExecuterTransitionVersement(versement.id);
  const [commentaire, setCommentaire] = useState('');

  const etapeParId = useMemo(() => new Map((etapes ?? []).map((e) => [e.id, e])), [etapes]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  if (chargementInstance || chargementHistorique) return <Skeleton active />;

  return (
    <Card title="Workflow" style={{ marginTop: 16 }}>
      {instance?.statut_instance === 'en_cours' && (
        <Input.TextArea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Commentaire (optionnel)"
          rows={2}
          style={{ marginBottom: 12 }}
        />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        {!chargementTransitions &&
          (transitionsDisponibles ?? []).length === 0 &&
          instance?.statut_instance === 'en_cours' && (
            <Typography.Text type="secondary">Aucune action disponible pour vous à cette étape.</Typography.Text>
          )}
        {instance?.statut_instance !== 'en_cours' && (
          <Typography.Text type="secondary">Workflow terminé.</Typography.Text>
        )}
        {(transitionsDisponibles ?? []).map((t) => (
          <Popconfirm
            key={t.transition_id}
            title={`Confirmer l'action « ${t.libelle_action} » ?`}
            onConfirm={() =>
              executer.mutate({ transitionId: t.transition_id, commentaire: commentaire || undefined })
            }
          >
            <Button loading={executer.isPending}>{t.libelle_action}</Button>
          </Popconfirm>
        ))}
      </Space>

      <Timeline
        items={(historique ?? []).map((h) => ({
          content: (
            <div>
              <div>
                <strong>
                  {!h.transition_id && !h.etape_precedente_id
                    ? 'Soumission'
                    : (etapeParId.get(h.etape_suivante_id)?.libelle ?? h.etape_suivante_id)}
                </strong>
              </div>
              {h.commentaire && <div style={{ fontSize: 13 }}>{h.commentaire}</div>}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {h.utilisateur_id ? `${utilisateurParId.get(h.utilisateur_id) ?? ''} — ` : ''}
                {new Date(h.date_action).toLocaleString('fr-FR')}
              </Typography.Text>
            </div>
          ),
        }))}
      />
    </Card>
  );
}
