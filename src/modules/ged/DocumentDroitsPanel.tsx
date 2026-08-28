import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, List, Popconfirm, Segmented, Select, Space, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useRoles } from '../../hooks/administration/useUtilisateurs';
import { listActions } from '../../services/administration/permissions';
import {
  useDroitsDocument,
  useOctroyerDroitDocument,
  useRevoquerDroitDocument,
} from '../../hooks/ged/useDroitsGed';

interface Props {
  documentId: string;
  organisationId: string;
}

type TypeBeneficiaire = 'role' | 'utilisateur' | 'entite';

// Sous-ensemble pertinent pour un octroi document-par-document — les autres
// actions (creer/supprimer/exporter) se règlent au niveau rôle (Administration
// > Rôles), pas via un droit ponctuel sur un document.
const CODES_ACTIONS_DROIT = ['consulter', 'modifier', 'valider', 'archiver'];

export function DocumentDroitsPanel({ documentId, organisationId }: Props) {
  const { data: droits } = useDroitsDocument(documentId);
  const { data: roles } = useRoles(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: actions } = useQuery({ queryKey: ['actions'], queryFn: listActions, staleTime: 5 * 60_000 });
  const octroyer = useOctroyerDroitDocument(documentId);
  const revoquer = useRevoquerDroitDocument(documentId);

  const [typeBeneficiaire, setTypeBeneficiaire] = useState<TypeBeneficiaire>('role');
  const [beneficiaireId, setBeneficiaireId] = useState<string | undefined>();
  const [actionCode, setActionCode] = useState<string>('consulter');

  const actionsDroit = useMemo(
    () => (actions ?? []).filter((a) => CODES_ACTIONS_DROIT.includes(a.code)),
    [actions],
  );
  const actionParId = useMemo(() => new Map((actions ?? []).map((a) => [a.id, a.libelle])), [actions]);
  const roleParId = useMemo(() => new Map((roles ?? []).map((r) => [r.id, r.libelle])), [roles]);
  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  const optionsBeneficiaire =
    typeBeneficiaire === 'role'
      ? (roles ?? []).map((r) => ({ value: r.id, label: r.libelle }))
      : typeBeneficiaire === 'entite'
        ? (entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))
        : (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }));

  const beneficiaireLabel = (droit: { role_id: string | null; utilisateur_id: string | null; entite_id: string | null }) => {
    if (droit.role_id) return `Rôle: ${roleParId.get(droit.role_id) ?? droit.role_id}`;
    if (droit.entite_id) return `Entité: ${entiteParId.get(droit.entite_id) ?? droit.entite_id}`;
    if (droit.utilisateur_id) return `Utilisateur: ${utilisateurParId.get(droit.utilisateur_id) ?? droit.utilisateur_id}`;
    return '—';
  };

  const octroyerDroit = () => {
    if (!beneficiaireId) return;
    octroyer.mutate(
      {
        p_action_code: actionCode,
        p_role_id: typeBeneficiaire === 'role' ? beneficiaireId : null,
        p_utilisateur_id: typeBeneficiaire === 'utilisateur' ? beneficiaireId : null,
        p_entite_id: typeBeneficiaire === 'entite' ? beneficiaireId : null,
      },
      { onSuccess: () => setBeneficiaireId(undefined) },
    );
  };

  return (
    <Card title="Droits d'accès" style={{ marginTop: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space wrap>
          <Segmented
            value={typeBeneficiaire}
            onChange={(v) => {
              setTypeBeneficiaire(v as TypeBeneficiaire);
              setBeneficiaireId(undefined);
            }}
            options={[
              { value: 'role', label: 'Rôle' },
              { value: 'entite', label: 'Entité' },
              { value: 'utilisateur', label: 'Utilisateur' },
            ]}
          />
          <Select
            style={{ width: 220 }}
            placeholder="Sélectionner"
            value={beneficiaireId}
            onChange={setBeneficiaireId}
            options={optionsBeneficiaire}
          />
          <Select
            style={{ width: 160 }}
            value={actionCode}
            onChange={setActionCode}
            options={actionsDroit.map((a) => ({ value: a.code, label: a.libelle }))}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!beneficiaireId}
            loading={octroyer.isPending}
            onClick={octroyerDroit}
          >
            Accorder
          </Button>
        </Space>

        <List
          dataSource={droits ?? []}
          renderItem={(d) => (
            <List.Item
              actions={[
                <Popconfirm key="revoquer" title="Révoquer ce droit ?" onConfirm={() => revoquer.mutate(d.id)}>
                  <Button danger type="text" icon={<DeleteOutlined />} loading={revoquer.isPending} />
                </Popconfirm>,
              ]}
            >
              <Space>
                <Tag>{actionParId.get(d.action_id) ?? d.action_id}</Tag>
                <span>{beneficiaireLabel(d)}</span>
              </Space>
            </List.Item>
          )}
        />
        {(droits ?? []).length === 0 && (
          <Typography.Text type="secondary">Aucun droit explicite (accès hérité du dossier).</Typography.Text>
        )}
      </Space>
    </Card>
  );
}
