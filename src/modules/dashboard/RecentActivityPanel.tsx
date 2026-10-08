import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fr } from '../../utils/dateFr';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
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
  ged_versements: 'un versement',
  ged_dossiers: 'un dossier',
  livrables: 'un livrable',
  decaissements: 'un décaissement',
  avenants: 'un avenant',
  entites: 'une entité',
  delegations: 'une délégation',
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
  const liste = (entrees ?? []).slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Activité récente</CardTitle>
        <span className="text-[12px] text-muted-foreground">Journal d'audit</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : liste.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-muted-foreground">Aucune activité à afficher</div>
        ) : (
          <ol>
            {liste.map((e, i) => {
              const utilisateur = e.utilisateur_id ? (utilisateurParId.get(e.utilisateur_id) ?? 'Un utilisateur') : 'Le système';
              const codeAction = e.action_id ? actionParId.get(e.action_id) : undefined;
              const action = (codeAction && LABEL_ACTION[codeAction]) ?? 'a modifié';
              const objet = LABEL_OBJET[e.objet_type] ?? e.objet_type;
              const date = fr(e.created_at);
              return (
                <li key={e.id} className={`relative pl-6 ${i < liste.length - 1 ? 'pb-4' : ''}`}>
                  {i < liste.length - 1 && <span className="absolute bottom-0 left-[5px] top-3 w-px bg-border" />}
                  <span className="absolute left-0 top-1.5 size-[11px] rounded-full border-2 border-card bg-primary ring-1 ring-border" />
                  <div className="text-[13px]">
                    <b className="font-semibold">{utilisateur}</b> {action} {objet}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {date.isSame(dayjs(), 'day') ? date.format('HH:mm') : date.format('DD/MM à HH:mm')}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
