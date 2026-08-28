import { Select, Skeleton, Space, Table, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useUtilisateursOptions } from '../../../hooks/administration/useEntites';
import { useJournalAudit } from '../../../hooks/courrier/useAudit';
import { useProfile } from '../../../hooks/useProfile';
import type { JournalAuditRow } from '../../../services/courrier/audit';

const LABEL_OBJET: Record<string, string> = {
  courriers: 'Courrier',
  documents: 'Document',
  missions: 'Mission',
  projets: 'Projet',
  utilisateurs: 'Utilisateur',
  roles: 'Rôle',
  permissions: 'Permission',
  workflow_instances: 'Workflow',
  parametres_organisation: 'Paramètre organisation',
};

// Vue d'ensemble en lecture seule du journal d'audit (plan V4 §10, ligne
// dépliable ancienne/nouvelle valeur ajoutée V5 §13) — lecture directe de
// journal_audit (0013), déjà protégée par la policy RLS journal_audit_select
// (has_permission('administration','consulter')) : un utilisateur sans ce
// droit ne reçoit simplement aucune ligne.
export function AuditTab() {
  const { profile } = useProfile();
  const organisationId = profile?.organisation_id;
  const [objetType, setObjetType] = useState<string | undefined>();
  const { data: entrees, isLoading } = useJournalAudit(organisationId, { objetType });
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);

  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  if (!organisationId) return <Skeleton active />;

  return (
    <div>
      <Typography.Paragraph type="secondary">
        Journal des créations, modifications et suppressions sur les objets sensibles de
        l'application. Non modifiable, non supprimable par un utilisateur.
      </Typography.Paragraph>
      <Space style={{ marginBottom: 12 }}>
        <Select
          placeholder="Tous les objets"
          allowClear
          style={{ width: 220 }}
          value={objetType}
          onChange={setObjetType}
          options={Object.entries(LABEL_OBJET).map(([value, label]) => ({ value, label }))}
        />
      </Space>
      <Table<JournalAuditRow>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={entrees}
        pagination={{ pageSize: 20 }}
        expandable={{
          rowExpandable: (record) => Boolean(record.ancienne_valeur || record.nouvelle_valeur),
          expandedRowRender: (record) => (
            <Space align="start" size={24} wrap>
              <div>
                <Typography.Text strong>Ancienne valeur</Typography.Text>
                <pre style={{ margin: 0, fontSize: 12, maxWidth: 480, whiteSpace: 'pre-wrap' }}>
                  {record.ancienne_valeur ? JSON.stringify(record.ancienne_valeur, null, 2) : '—'}
                </pre>
              </div>
              <div>
                <Typography.Text strong>Nouvelle valeur</Typography.Text>
                <pre style={{ margin: 0, fontSize: 12, maxWidth: 480, whiteSpace: 'pre-wrap' }}>
                  {record.nouvelle_valeur ? JSON.stringify(record.nouvelle_valeur, null, 2) : '—'}
                </pre>
              </div>
            </Space>
          ),
        }}
        columns={[
          {
            title: 'Date',
            dataIndex: 'created_at',
            width: 160,
            render: (v: string) => new Date(v).toLocaleString('fr-FR'),
          },
          {
            title: 'Utilisateur',
            dataIndex: 'utilisateur_id',
            width: 180,
            render: (v: string | null) => (v ? (utilisateurParId.get(v) ?? v) : '—'),
          },
          {
            title: 'Objet',
            dataIndex: 'objet_type',
            width: 130,
            render: (v: string) => LABEL_OBJET[v] ?? v,
          },
          { title: 'Identifiant', dataIndex: 'objet_id', width: 280 },
          { title: 'Adresse IP', dataIndex: 'adresse_ip', width: 130, render: (v: string | null) => v ?? '—' },
        ]}
      />
    </div>
  );
}
