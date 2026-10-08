import { Pencil, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '../ui/button';
import { ConfirmDialog } from './confirm-dialog';

// Actions d'une ligne de tableau. Le conteneur arrête la propagation : les
// fenêtres ouvertes depuis la ligne sont des portails, dont les clics
// remontent quand même l'arbre React jusqu'au <tr> cliquable.
export function ActionsLigne({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}

export function BoutonModifier({ libelle, onClick }: { libelle: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={onClick} aria-label={libelle} title="Modifier">
      <Pencil />
    </Button>
  );
}

// Bouton icône « supprimer » + fenêtre de confirmation (remplace antd
// Popconfirm). `onConfirmer` reçoit `fermer`, à appeler au succès de la
// mutation pour que la fenêtre reste ouverte (avec son indicateur) pendant
// l'appel et en cas d'erreur.
export function BoutonSuppression({
  libelle,
  titre,
  children,
  libelleConfirmer = 'Supprimer',
  onConfirmer,
  enCours,
  icone,
}: {
  /** Nom accessible du bouton, ex. « Supprimer la fonction Directeur ». */
  libelle: string;
  titre: string;
  children?: ReactNode;
  libelleConfirmer?: string;
  onConfirmer: (fermer: () => void) => void;
  enCours?: boolean;
  icone?: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = () => setOuvert(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-crit-text"
        onClick={() => setOuvert(true)}
        aria-label={libelle}
        title={libelleConfirmer}
      >
        {icone ?? <Trash2 />}
      </Button>
      <ConfirmDialog
        open={ouvert}
        onClose={fermer}
        titre={titre}
        libelleConfirmer={libelleConfirmer}
        destructif
        enCours={enCours}
        onConfirmer={() => onConfirmer(fermer)}
      >
        {children ?? <p className="text-muted-foreground">Cette action est définitive.</p>}
      </ConfirmDialog>
    </>
  );
}
