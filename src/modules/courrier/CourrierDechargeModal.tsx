import { Lock } from 'lucide-react';
import { useState } from 'react';
import { Champ, ChampFichier } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { useAjouterDecharge } from '../../hooks/courrier/useDecharge';

interface Props {
  courrierId: string;
  open: boolean;
  onClose: () => void;
}

// Ajout d'une décharge (plan V4 §9/§10) : pièce justificative de dépôt d'un
// courrier départ. Verrouille définitivement le courrier dès la validation
// (public.fn_ajouter_decharge_courrier) — d'où l'avertissement explicite
// avant de confirmer.
export function CourrierDechargeModal({ courrierId, open, onClose }: Props) {
  const [fichier, setFichier] = useState<File | null>(null);
  const ajouter = useAjouterDecharge(courrierId);

  const fermer = () => {
    setFichier(null);
    onClose();
  };

  return (
    <FormDialog
      open={open}
      onClose={fermer}
      titre="Ajouter une décharge"
      description="Pièce attestant le dépôt du courrier auprès de son destinataire."
      onSubmit={(e) => {
        e.preventDefault();
        if (fichier) ajouter.mutate(fichier, { onSuccess: fermer });
      }}
      enCours={ajouter.isPending}
      validerDesactive={!fichier}
      libelleValider="Valider la décharge"
    >
      <div role="alert" className="flex gap-3 rounded-lg border border-warn/40 bg-warn/10 p-4 text-[13px]">
        <Lock className="mt-0.5 size-4 shrink-0 text-warn-text" />
        <div>
          <div className="font-semibold text-warn-text">Verrouillage définitif</div>
          <p className="mt-0.5">
            Une fois la décharge validée, ce courrier devient définitivement immodifiable (informations, destinataires,
            pièces jointes). Seul un administrateur habilité pourra le déverrouiller, à titre exceptionnel et journalisé.
          </p>
        </div>
      </div>
      <Champ label="Document de décharge" htmlFor="decharge-fichier" requis>
        <ChampFichier id="decharge-fichier" fichier={fichier} onChange={setFichier} />
      </Champ>
    </FormDialog>
  );
}
