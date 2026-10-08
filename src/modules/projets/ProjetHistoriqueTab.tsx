import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { PaginationTableau, Tableau } from '../../components/ui/tableau';
import { listActions } from '../../services/administration/permissions';
import { useHistoriqueProjet } from '../../hooks/projets/useHistoriqueProjet';
import type { JournalAudit } from '../../services/projets/historique';
import { fr } from '../../utils/dateFr';

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

const TAILLE_PAGE = 20;

export function ProjetHistoriqueTab({ projetId, utilisateurParId }: Props) {
  const { data: historique, isLoading } = useHistoriqueProjet(projetId);
  const { data: actions } = useQuery({ queryKey: ['actions'], queryFn: listActions, staleTime: 5 * 60_000 });
  const [page, setPage] = useState(1);

  const actionParId = useMemo(() => new Map((actions ?? []).map((a) => [a.id, a.libelle])), [actions]);

  const lignes = historique ?? [];
  const nbPages = Math.max(1, Math.ceil(lignes.length / TAILLE_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const lignesPage = lignes.slice((pageCourante - 1) * TAILLE_PAGE, pageCourante * TAILLE_PAGE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique</CardTitle>
      </CardHeader>
      <CardContent>
        <Tableau<JournalAudit>
          libelle="Historique du projet"
          lignes={lignesPage}
          cleLigne={(e) => e.id}
          chargement={isLoading}
          minLargeur={560}
          vide={{ icone: History, titre: 'Aucun événement enregistré' }}
          colonnes={[
            {
              cle: 'date',
              titre: 'Date',
              className: 'w-44 whitespace-nowrap tabular-nums text-muted-foreground',
              rendu: (e) => fr(e.created_at).format('D MMM YYYY · HH:mm'),
            },
            {
              cle: 'utilisateur',
              titre: 'Utilisateur',
              rendu: (e) => <span className="font-medium">{e.utilisateur_id ? (utilisateurParId.get(e.utilisateur_id) ?? '—') : '—'}</span>,
            },
            { cle: 'action', titre: 'Action', rendu: (e) => (e.action_id ? (actionParId.get(e.action_id) ?? '—') : '—') },
            {
              cle: 'objet',
              titre: 'Objet',
              className: 'w-32',
              rendu: (e) => (
                <Badge variant="muted" shape="pill">
                  {LIBELLES_OBJET[e.objet_type] ?? e.objet_type}
                </Badge>
              ),
            },
          ]}
        />
        {!isLoading && lignes.length > 0 && (
          <PaginationTableau total={lignes.length} unite="événement" page={pageCourante} nbPages={nbPages} onPage={setPage} />
        )}
      </CardContent>
    </Card>
  );
}
