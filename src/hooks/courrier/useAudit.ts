import { useQuery } from '@tanstack/react-query';
import { listAuditCourrier, listJournalAudit, type AuditFiltres } from '../../services/courrier/audit';

export function useAuditCourrier(courrierId: string | undefined) {
  return useQuery({
    queryKey: ['audit-courrier', courrierId],
    queryFn: () => listAuditCourrier(courrierId!),
    enabled: Boolean(courrierId),
  });
}

export function useJournalAudit(organisationId: string | undefined, filtres: AuditFiltres = {}) {
  return useQuery({
    queryKey: ['journal-audit', organisationId, filtres],
    queryFn: () => listJournalAudit(organisationId!, filtres),
    enabled: Boolean(organisationId),
  });
}
