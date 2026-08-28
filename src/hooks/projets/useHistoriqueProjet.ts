import { useQuery } from '@tanstack/react-query';
import { fetchHistoriqueProjet } from '../../services/projets/historique';

export function useHistoriqueProjet(projetId: string | undefined) {
  return useQuery({
    queryKey: ['historique-projet', projetId],
    queryFn: () => fetchHistoriqueProjet(projetId!),
    enabled: Boolean(projetId),
  });
}
