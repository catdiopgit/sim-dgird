import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ, ChampFichier } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Encart } from '../../components/ui/encart';
import { Input } from '../../components/ui/input';
import { useAjouterDocumentMarcheMutation } from '../../hooks/marches/useDocumentsMarche';
import { usePhaseMarcheMutations } from '../../hooks/marches/usePhasesMarche';
import { ariaErreur } from '../../lib/form';
import type { PhaseMarcheAvecStatut } from '../../services/marches/phasesMarche';

const schema = z.object({ titre: z.string().min(1, 'Requis') });
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  marcheId: string;
  phase: PhaseMarcheAvecStatut | null;
  onClose: () => void;
}

// §12 : un document justificatif est obligatoire pour valider la réalisation
// d'une phase — ce modal permet de le joindre puis enchaîne la validation
// (qui enregistre automatiquement la date de fin réelle côté serveur), même
// principe que LivrableClotureModal côté Projets.
export function PhaseValidationModal({ open, marcheId, phase, onClose }: Props) {
  const ajouterDocument = useAjouterDocumentMarcheMutation(marcheId);
  const { valider } = usePhaseMarcheMutations(marcheId);
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
      reset({ titre: phase ? `Justificatif — ${phase.nom}` : '' });
      setFichier(null);
      setTentative(false);
    }
  }, [open, phase, reset]);

  const enCours = ajouterDocument.isPending || valider.isPending;

  const onSubmit = (values: FormValues) => {
    if (!fichier || !phase) return;
    ajouterDocument.mutate(
      { payload: { titre: values.titre, phase_marche_id: phase.id }, fichier },
      {
        onSuccess: () => {
          valider.mutate(phase.id, { onSuccess: () => onClose() });
        },
      },
    );
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre="Joindre un justificatif et valider la phase"
      description={phase?.nom}
      onSubmit={(e) => {
        setTentative(true);
        void handleSubmit(onSubmit)(e);
      }}
      enCours={enCours}
      libelleValider="Valider la phase"
    >
      <Encart>Cette phase n'a pas encore de document justificatif — il est requis pour la valider (§12).</Encart>
      <Champ label="Titre du justificatif" htmlFor="phase-justificatif-titre" requis erreur={errors.titre?.message}>
        <Input autoFocus {...ariaErreur('phase-justificatif-titre', errors.titre)} {...register('titre')} />
      </Champ>
      <Champ
        label="Justificatif"
        htmlFor="phase-justificatif-fichier"
        requis
        erreur={tentative && !fichier ? 'Un fichier est requis' : undefined}
      >
        <ChampFichier id="phase-justificatif-fichier" fichier={fichier} onChange={setFichier} invalide={tentative && !fichier} />
      </Champ>
    </FormDialog>
  );
}
