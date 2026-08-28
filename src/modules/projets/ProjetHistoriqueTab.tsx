import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Table, Tag } from 'antd';
import { useMemo } from 'react';
import { listActions } from '../../services/administration/permissions';
import { useHistoriqueProjet } from '../../hooks/projets/useHistoriqueProjet';
import type { JournalAudit } from '../../services/projets/historique';

interface Props {
  projetId: string;
  utilisateurParId: Map<string, string>;
}

const LIBELLES_OBJET: Record<string, string> = {
  projets: 'Projet',
  phases: 'Phase',
  activites: 'Activité',
  taches: 'Tâche',
  livrables: 'Livrable',
  projet_membres: 'Membre',
  avenants: 'Avenant',
  documents: 'Document',
};

export function ProjetHistoriqueTab({ projetId, utilisateurParId }: Props) {
  const { data: historique, isLoading } = useHistoriqueProjet(projetId);
  const { data: actions } = useQuery({ queryKey: ['actions'], queryFn: listActions, staleTime: 5 * 60_000 });

  const actionParId = useMemo(() => new Map((actions ?? []).map((a) => [a.id, a.libelle])), [actions]);

  return (
    <Card title="Historique">
      <Table<JournalAudit>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={historique}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: <Empty description="Aucun événement enregistré" /> }}
        columns={[
          {
            title: 'Date',
            width: 160,
            render: (_, e) => new Date(e.created_at).toLocaleString('fr-FR'),
          },
          {
            title: 'Utilisateur',
            width: 180,
            render: (_, e) => (e.utilisateur_id ? (utilisateurParId.get(e.utilisateur_id) ?? '—') : '—'),
          },
          {
            title: 'Action',
            width: 160,
            render: (_, e) => (e.action_id ? (actionParId.get(e.action_id) ?? '—') : '—'),
          },
          {
            title: 'Objet',
            width: 120,
            render: (_, e) => <Tag>{LIBELLES_OBJET[e.objet_type] ?? e.objet_type}</Tag>,
          },
        ]}
      />
    </Card>
  );
}
