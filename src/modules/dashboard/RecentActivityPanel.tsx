import { Card, Empty, Skeleton, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useJournalAudit } from '../../hooks/courrier/useAudit';
import { listActions } from '../../services/administration/permissions';

interface Props {
  organisationId: string | undefined;
}

const LABEL_OBJET: Record<string, string> = {
  courriers: 'un courrier',
  documents: 'un document',
  missions: 'une mission',
  projets: 'un projet',
  utilisateurs: 'un utilisateur',
  roles: 'un rôle',
  permissions: 'une permission',
  workflow_instances: 'un workflow',
  parametres_organisation: 'un paramètre organisation',
};

const LABEL_ACTION: Record<string, string> = {
  creer: 'a créé',
  modifier: 'a modifié',
  supprimer: 'a supprimé',
};

// Réservé aux utilisateurs disposant de administration.consulter : la RLS
// journal_audit_select (0013) ne laisse remonter aucune ligne aux autres, le
// parent (DashboardPage) n'affiche donc cette section que si profile.can le
// confirme déjà côté UX.
export function RecentActivityPanel({ organisationId }: Props) {
  const { data: entrees, isLoading } = useJournalAudit(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: actions } = useQuery({ queryKey: ['actions'], queryFn: listActions, staleTime: 5 * 60_000 });

  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const actionParId = useMemo(() => new Map((actions ?? []).map((a) => [a.id, a.code])), [actions]);

  return (
    <Card size="small" title="Activité récente" style={{ height: '100%' }}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : !entrees || entrees.length === 0 ? (
        <Empty description="Aucune activité à afficher" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entrees.slice(0, 8).map((e) => {
            const utilisateur = e.utilisateur_id ? (utilisateurParId.get(e.utilisateur_id) ?? 'Un utilisateur') : 'Le système';
            const codeAction = e.action_id ? actionParId.get(e.action_id) : undefined;
            const action = (codeAction && LABEL_ACTION[codeAction]) ?? 'a modifié';
            const objet = LABEL_OBJET[e.objet_type] ?? e.objet_type;
            return (
              <div key={e.id} style={{ display: 'flex', gap: 10 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12, minWidth: 42 }}>
                  {dayjs(e.created_at).format('HH:mm')}
                </Typography.Text>
                <Typography.Text style={{ fontSize: 13 }}>
                  {utilisateur} {action} {objet}
                </Typography.Text>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
