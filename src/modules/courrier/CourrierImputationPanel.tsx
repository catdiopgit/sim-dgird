import { Button, Card, DatePicker, Form, Input, Select, Space, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import {
  useEntitesImputables,
  useImputerCourrier,
  useTransitionsDisponiblesCourrier,
} from '../../hooks/courrier/useWorkflow';
import type { Courrier } from '../../services/courrier/courriers';

interface Props {
  courrier: Courrier;
  organisationId: string;
  peutModifier: boolean;
}

// Panneau dédié à l'imputation (plan V3 §6/§E) : distinct de la mise en copie
// (CourrierDestinataires) — impute réellement le courrier à une entité/agent
// (met à jour courriers.entite_id/agent_destinataire_id) et peut déclencher
// dans la foulée une transition de workflow (typiquement "affecter").
export function CourrierImputationPanel({ courrier, organisationId, peutModifier }: Props) {
  const { data: entites } = useEntitesImputables();
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: transitionsDisponibles } = useTransitionsDisponiblesCourrier(courrier.id);
  const imputer = useImputerCourrier(courrier.id);

  const [entiteId, setEntiteId] = useState<string | undefined>(courrier.entite_id ?? undefined);
  const [agentId, setAgentId] = useState<string | undefined>(courrier.agent_destinataire_id ?? undefined);
  const [instruction, setInstruction] = useState('');
  const [echeance, setEcheance] = useState<Dayjs | null>(null);
  const [transitionId, setTransitionId] = useState<string | undefined>();

  if (!peutModifier) return null;

  const onImputer = () => {
    if (!entiteId) return;
    imputer.mutate(
      {
        p_entite_id: entiteId,
        p_agent_id: agentId || null,
        p_instruction: instruction || null,
        p_echeance: echeance ? echeance.format('YYYY-MM-DD') : null,
        p_transition_id: transitionId || null,
      },
      {
        onSuccess: () => {
          setInstruction('');
          setEcheance(null);
          setTransitionId(undefined);
        },
      },
    );
  };

  return (
    <Card title="Imputation" style={{ marginTop: 16 }}>
      <Typography.Paragraph type="secondary">
        Affecte le courrier à l'entité (et éventuellement l'agent) réellement chargé du dossier.
        Distinct de la mise en copie ci-dessous. Seules les entités de votre périmètre
        hiérarchique (votre entité et ses descendantes) sont proposées.
      </Typography.Paragraph>
      <Form layout="vertical">
        <Space wrap align="start" style={{ width: '100%' }}>
          <Form.Item label="Entité" required style={{ marginBottom: 8 }}>
            <Select
              placeholder="Choisir l'entité"
              value={entiteId}
              onChange={setEntiteId}
              style={{ width: 220 }}
              options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))}
            />
          </Form.Item>
          <Form.Item label="Agent (facultatif)" style={{ marginBottom: 8 }}>
            <Select
              placeholder="Choisir un agent"
              allowClear
              value={agentId}
              onChange={setAgentId}
              style={{ width: 200 }}
              options={(utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))}
            />
          </Form.Item>
          <Form.Item label="Instruction" style={{ marginBottom: 8 }}>
            <Input
              placeholder="Action demandée"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              style={{ width: 220 }}
            />
          </Form.Item>
          <Form.Item label="Échéance" style={{ marginBottom: 8 }}>
            <DatePicker value={echeance} onChange={setEcheance} />
          </Form.Item>
          <Form.Item label="Action de workflow associée (facultatif)" style={{ marginBottom: 8 }}>
            <Select
              placeholder="Aucune"
              allowClear
              value={transitionId}
              onChange={setTransitionId}
              style={{ width: 200 }}
              options={(transitionsDisponibles ?? []).map((t) => ({ value: t.transition_id, label: t.libelle_action }))}
            />
          </Form.Item>
        </Space>
        <Button type="primary" onClick={onImputer} disabled={!entiteId} loading={imputer.isPending}>
          Imputer
        </Button>
      </Form>
    </Card>
  );
}
