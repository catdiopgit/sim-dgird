import { useState, type ReactNode } from 'react';
import { FormDialog } from './form-dialog';

// Confirmation d'une action (suppression, archivage…) : même fenêtre que les
// formulaires, bouton de validation en rouge pour une action destructive.
export function ConfirmDialog({
  open,
  onClose,
  titre,
  children,
  libelleConfirmer,
  onConfirmer,
  enCours,
  destructif,
  confirmerDesactive,
}: {
  open: boolean;
  onClose: () => void;
  titre: string;
  children: ReactNode;
  libelleConfirmer: string;
  onConfirmer: () => void;
  enCours?: boolean;
  destructif?: boolean;
  confirmerDesactive?: boolean;
}) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre={titre}
      onSubmit={(e) => {
        e.preventDefault();
        onConfirmer();
      }}
      enCours={enCours}
      libelleValider={libelleConfirmer}
      validerDesactive={confirmerDesactive}
      variante={destructif ? 'destructive' : 'default'}
    >
      <div className="space-y-3 text-[14px]">{children}</div>
    </FormDialog>
  );
}

// Déclencheur quelconque + confirmation (remplace antd Popconfirm).
// `onConfirmer` reçoit `fermer` : l'appeler au succès de la mutation garde la
// fenêtre ouverte (avec son indicateur) pendant l'appel et en cas d'erreur.
export function Confirmation({
  declencheur,
  titre,
  children,
  libelleConfirmer,
  onConfirmer,
  enCours,
  destructif,
}: {
  declencheur: (ouvrir: () => void) => ReactNode;
  titre: string;
  children?: ReactNode;
  libelleConfirmer: string;
  onConfirmer: (fermer: () => void) => void;
  enCours?: boolean;
  destructif?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = () => setOuvert(false);
  return (
    <>
      {declencheur(() => setOuvert(true))}
      <ConfirmDialog
        open={ouvert}
        onClose={fermer}
        titre={titre}
        libelleConfirmer={libelleConfirmer}
        destructif={destructif}
        enCours={enCours}
        onConfirmer={() => onConfirmer(fermer)}
      >
        {children}
      </ConfirmDialog>
    </>
  );
}
