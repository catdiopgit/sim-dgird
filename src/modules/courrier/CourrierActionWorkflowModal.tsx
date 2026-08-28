import { Alert, Checkbox, DatePicker, Form, Input, Modal, Select, Space, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useCourrierReferentiel } from '../../hooks/courrier/useCourriers';
import {
  useEntitesImputables,
  useEntitesTransmissibles,
  useImputerCourrier,
  usePersonnesTransmissibles,
} from '../../hooks/courrier/useWorkflow';
import type { Courrier } from '../../services/courrier/courriers';
import type { TypeActionCourrier } from '../../services/courrier/workflow';

interface Props {
  open: boolean;
  onClose: () => void;
  courrier: Courrier;
  organisationId: string;
  typeAction: TypeActionCourrier;
  transitionId: string;
}

const LIBELLE_ACTION: Record<TypeActionCourrier, string> = {
  imputation: 'Imputation',
  affectation: 'Affectation',
  transmission: 'Transmission',
  redirection: 'Redirection',
};

// Fenêtre modale d'action de workflow (Version 5 §3-§9), calquée sur
// documentation/imputation.png : « Imputer à » (entité, ou personne de la
// hiérarchie pour transmission/redirection — l'entité de rattachement est
// alors dérivée automatiquement), « En copie » (entités, multi-sélection),
// « Actions demandées » (référentiel administrable, multi-sélection),
// Priorité, Date limite, Observation. Un seul composant réutilisé pour les
// 4 types d'action — la distinction technique (transmission ne réaffecte
// pas l'entité en charge, cf. fn_imputer_courrier) est gérée côté serveur.
export function CourrierActionWorkflowModal({
  open,
  onClose,
  courrier,
  organisationId,
  typeAction,
  transitionId,
}: Props) {
  const estTransmissionOuRedirection = typeAction === 'transmission' || typeAction === 'redirection';

  const { data: entitesImputables } = useEntitesImputables();
  const { data: entitesTransmissibles } = useEntitesTransmissibles();
  const { data: personnesTransmissibles } = usePersonnesTransmissibles();
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: entitesOrganisation } = useEntites(organisationId);
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const imputer = useImputerCourrier(courrier.id);

  // « Imputer à » : entités du périmètre d'affectation (imputation/
  // affectation) ou de transmission (transmission/redirection), + personnes
  // de la hiérarchie pour ces deux derniers.
  const entitesCibles = estTransmissionOuRedirection ? entitesTransmissibles : entitesImputables;
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const entiteParIdOrganisation = useMemo(
    () => new Map((entitesOrganisation ?? []).map((e) => [e.id, e.libelle])),
    [entitesOrganisation],
  );

  const [cibleValeur, setCibleValeur] = useState<string | undefined>();
  const [entitesCopieIds, setEntitesCopieIds] = useState<string[]>([]);
  const [actionsDemandeesIds, setActionsDemandeesIds] = useState<string[]>([]);
  const [prioriteValeurId, setPrioriteValeurId] = useState<string | undefined>(
    courrier.priorite_valeur_id ?? undefined,
  );
  const [dateLimite, setDateLimite] = useState<Dayjs | null>(null);
  const [observation, setObservation] = useState('');

  const optionsCible = estTransmissionOuRedirection
    ? [
        ...(entitesCibles ?? []).map((e) => ({ value: `entite:${e.id}`, label: `${e.libelle} (entité)` })),
        ...(personnesTransmissibles ?? []).map((p) => ({
          value: `personne:${p.utilisateur_id}`,
          label: `${utilisateurParId.get(p.utilisateur_id) ?? p.utilisateur_id} (${entiteParIdOrganisation.get(p.entite_id) ?? '—'})`,
        })),
      ]
    : (entitesCibles ?? []).map((e) => ({ value: `entite:${e.id}`, label: e.libelle }));

  const reinitialiser = () => {
    setCibleValeur(undefined);
    setEntitesCopieIds([]);
    setActionsDemandeesIds([]);
    setPrioriteValeurId(courrier.priorite_valeur_id ?? undefined);
    setDateLimite(null);
    setObservation('');
  };

  const fermer = () => {
    onClose();
    reinitialiser();
  };

  const onValider = () => {
    if (!cibleValeur) return;
    const [type, id] = cibleValeur.split(':');
    let entiteId: string;
    let agentId: string | null = null;
    if (type === 'personne') {
      const personne = (personnesTransmissibles ?? []).find((p) => p.utilisateur_id === id);
      if (!personne) return;
      entiteId = personne.entite_id;
      agentId = id;
    } else {
      entiteId = id;
    }

    imputer.mutate(
      {
        p_entite_id: entiteId,
        p_agent_id: agentId,
        p_instruction: observation || null,
        p_echeance: dateLimite ? dateLimite.format('YYYY-MM-DD') : null,
        p_transition_id: transitionId,
        p_type_action: typeAction,
        p_entites_copie_ids: entitesCopieIds.length > 0 ? entitesCopieIds : null,
        p_actions_demandees_ids: actionsDemandeesIds.length > 0 ? actionsDemandeesIds : null,
        p_priorite_valeur_id: prioriteValeurId || null,
      },
      { onSuccess: fermer },
    );
  };

  return (
    <Modal
      open={open}
      onCancel={fermer}
      title={LIBELLE_ACTION[typeAction].toUpperCase()}
      width={640}
      onOk={onValider}
      okText={`Valider l'${LIBELLE_ACTION[typeAction].toLowerCase()}`}
      confirmLoading={imputer.isPending}
      okButtonProps={{ disabled: !cibleValeur }}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label={estTransmissionOuRedirection ? 'Transmettre à' : 'Imputer à'} required>
          <Select
            placeholder="Choisir l'entité ou la personne"
            showSearch
            value={cibleValeur}
            onChange={setCibleValeur}
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={optionsCible}
          />
        </Form.Item>

        <Space size={24} align="start" wrap style={{ width: '100%' }}>
          <div style={{ minWidth: 240 }}>
            <Typography.Text strong>En copie</Typography.Text>
            <div
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                maxHeight: 200,
                overflowY: 'auto',
                padding: 8,
                marginTop: 4,
              }}
            >
              <Checkbox.Group
                style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                value={entitesCopieIds}
                onChange={(v) => setEntitesCopieIds(v as string[])}
                options={(entitesImputables ?? []).map((e) => ({ value: e.id, label: e.libelle }))}
              />
            </div>
          </div>

          <div style={{ minWidth: 240 }}>
            <Typography.Text strong>Actions demandées</Typography.Text>
            <div
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                maxHeight: 200,
                overflowY: 'auto',
                padding: 8,
                marginTop: 4,
              }}
            >
              <Checkbox.Group
                style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                value={actionsDemandeesIds}
                onChange={(v) => setActionsDemandeesIds(v as string[])}
                options={(referentiel?.actionsDemandees ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
              {(referentiel?.actionsDemandees ?? []).length === 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Aucune action configurée (Administration &gt; Paramètres &gt; Liste de valeurs).
                </Typography.Text>
              )}
            </div>
          </div>
        </Space>

        <Space wrap style={{ marginTop: 16, width: '100%' }} align="start">
          <Form.Item label="Priorité" style={{ marginBottom: 8 }}>
            <Select
              placeholder="Priorité"
              allowClear
              style={{ width: 180 }}
              value={prioriteValeurId}
              onChange={setPrioriteValeurId}
              options={(referentiel?.priorites ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
            />
          </Form.Item>
          <Form.Item label="Date limite" style={{ marginBottom: 8 }}>
            <DatePicker value={dateLimite} onChange={setDateLimite} disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
          </Form.Item>
        </Space>

        <Form.Item label="Observation">
          <Input.TextArea
            rows={2}
            placeholder="Instruction ou observation concernant cette action"
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
          />
        </Form.Item>

        {estTransmissionOuRedirection && typeAction === 'transmission' && (
          <Alert
            type="info"
            showIcon
            message="La transmission conserve le circuit initial : l'entité actuellement en charge du dossier n'est pas modifiée."
          />
        )}
      </Form>
    </Modal>
  );
}
