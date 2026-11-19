import { useQuery } from '@tanstack/react-query';
import { Archive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { statutElementVerse, type ModuleVerse } from '../../services/ged/versementsAuto';

// v8.7 — badge affiché dans les modules (Courrier, Projets, Marchés) pour un
// élément versé aux archives : « En cours de versement » puis « Archivé ».
export function BadgeVersementGed({ type, id }: { type: ModuleVerse; id: string | undefined }) {
  const { data } = useQuery({
    queryKey: ['ged-element-verse', type, id],
    queryFn: () => statutElementVerse(type, id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
  if (!data?.etat) return null;
  const contenu = (
    <Badge variant={data.etat === 'archive' ? 'success' : 'warning'} shape="pill" className="inline-flex items-center gap-1">
      <Archive className="size-3" />
      {data.etat === 'archive' ? `Archivé${data.codeArchivage ? ` · ${data.codeArchivage}` : ''}` : 'En cours de versement'}
    </Badge>
  );
  return data.versementId ? <Link to={`/ged/versements/${data.versementId}`}>{contenu}</Link> : contenu;
}
