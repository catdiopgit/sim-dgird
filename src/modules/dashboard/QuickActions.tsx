import { Compass, FilePlus, FileSearch, KanbanSquare, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useProfile } from '../../hooks/useProfile';

// Raccourcis vers les pages où vivent déjà les actions de création (§20 du
// brief : visibles mais peu encombrantes) — pas de duplication des formulaires
// de création ici, chaque page conserve sa seule source de vérité pour ça.
export function QuickActions() {
  const navigate = useNavigate();
  const { can } = useProfile();

  const actions = [
    { cle: 'courrier', libelle: 'Nouveau courrier', icone: <Plus />, cible: '/courriers', visible: can('courrier', 'creer'), principal: true },
    { cle: 'ged', libelle: 'Document', titre: 'Ajouter un document', icone: <FilePlus />, cible: '/ged', visible: can('ged', 'creer') },
    { cle: 'projet', libelle: 'Projet', titre: 'Nouveau projet', icone: <KanbanSquare />, cible: '/projets', visible: can('projets', 'creer') },
    { cle: 'mission', libelle: 'Mission', titre: 'Nouvelle mission', icone: <Compass />, cible: '/missions', visible: can('missions', 'creer') },
    { cle: 'recherche', libelle: 'Rechercher', titre: 'Rechercher un document', icone: <FileSearch />, cible: '/ged/archives', visible: true },
  ].filter((a) => a.visible);

  if (actions.length === 0) return null;

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {actions.map((a) => (
        <Button
          key={a.cle}
          variant={a.principal ? 'default' : 'outline'}
          title={a.titre}
          onClick={() => navigate(a.cible)}
          className={a.principal ? undefined : '[&_svg]:text-muted-foreground'}
        >
          {a.icone}
          {a.libelle}
        </Button>
      ))}
    </div>
  );
}
