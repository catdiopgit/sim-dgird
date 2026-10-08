import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ, ChampFichier } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input } from '../../components/ui/input';
import { useAjouterDocumentProjet } from '../../hooks/projets/useDocumentsProjet';
import { useCloturerLivrable } from '../../hooks/projets/useLivrables';
import { ariaErreur } from '../../lib/form';
import type { Livrable } from '../../services/projets/livrables';

const schema = z.object({ titre: z.string().min(1, 'Requis') });
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  projetId: string;
  livrable: Livrable | null;
  onClose: () => void;
}

// §1 (V3 bis) : un livrable sans justificatif ne peut pas être clôturé
// directement (fn_cloturer_livrable l'exige, 0066/0073) — plutôt que de
// simplement afficher l'erreur, ce modal permet de joindre le justificatif
// puis enchaîne la clôture dans la foulée : useAjouterDocumentProjet dépose
// le document (rattaché au livrable via p_livrable_id), et son onSuccess
// déclenche useCloturerLivrable — les deux hooks invalident déjà le cache
// nécessaire (livrables, documents-projet, projet, cloture-checklist).
export function LivrableClotureModal({ open, projetId, livrable, onClose }: Props) {
  const ajouterDocument = useAjouterDocumentProjet(projetId);
  const cloturer = useCloturerLivrable(projetId);
  const [fichier, setFichier] = useState<File | null>(null);
  const [tentative, setTentative] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titre: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ titre: livrable ? `Justificatif — ${livrable.nom}` : '' });
      setFichier(null);
      setTentative(false);
    }
  }, [open, livrable, reset]);

  const enCours = ajouterDocument.isPending || cloturer.isPending;

  const onSubmit = (values: FormValues) => {
    if (!fichier || !livrable) return;
    ajouterDocument.mutate(
      { payload: { p_projet_id: projetId, p_titre: values.titre, p_livrable_id: livrable.id }, fichier },
      {
        onSuccess: () => {
          cloturer.mutate({ id: livrable.id }, { onSuccess: () => onClose() });
        },
      },
    );
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre="Clôturer le livrable"
      description={livrable?.nom}
      onSubmit={(e) => {
        setTentative(true);
        void handleSubmit(onSubmit)(e);
      }}
      enCours={enCours}
      libelleValider="Joindre et clôturer"
    >
      <div className="flex gap-2.5 rounded-lg bg-info/10 p-3 text-[13px]">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        Ce livrable n'a pas encore de document justificatif : il est requis pour le clôturer.
      </div>
      <Champ label="Titre du justificatif" htmlFor="cloture-titre" requis erreur={errors.titre?.message}>
        <Input autoFocus {...ariaErreur('cloture-titre', errors.titre)} {...register('titre')} />
      </Champ>
      <Champ label="Fichier" htmlFor="cloture-fichier" requis erreur={tentative && !fichier ? 'Un fichier est requis' : undefined}>
        <ChampFichier id="cloture-fichier" fichier={fichier} onChange={setFichier} invalide={tentative && !fichier} />
      </Champ>
    </FormDialog>
  );
}
