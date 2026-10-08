import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ, ChampFichier } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useAjouterDocumentMarcheMutation } from '../../hooks/marches/useDocumentsMarche';
import { ariaErreur } from '../../lib/form';
import type { MarcheCandidat } from '../../services/marches/candidats';
import type { PhaseMarcheAvecStatut } from '../../services/marches/phasesMarche';

const schema = z.object({
  titre: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  phaseMarcheId: z.string().optional(),
  marcheCandidatId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  marcheId: string;
  phases?: PhaseMarcheAvecStatut[];
  candidats?: MarcheCandidat[];
  phaseIdFixe?: string;
  candidatIdFixe?: string;
  onClose: () => void;
}

// §9 Documents du marché — un seul appel multipart, comme pour Projets.
export function DocumentMarcheAjouterModal({ open, marcheId, phases, candidats, phaseIdFixe, candidatIdFixe, onClose }: Props) {
  const ajouter = useAjouterDocumentMarcheMutation(marcheId);
  const [fichier, setFichier] = useState<File | null>(null);
  const [tentative, setTentative] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titre: '', description: '', phaseMarcheId: phaseIdFixe ?? '', marcheCandidatId: candidatIdFixe ?? '' },
  });

  useEffect(() => {
    if (open) {
      reset({ titre: '', description: '', phaseMarcheId: phaseIdFixe ?? '', marcheCandidatId: candidatIdFixe ?? '' });
      setFichier(null);
      setTentative(false);
    }
  }, [open, phaseIdFixe, candidatIdFixe, reset]);

  const onSubmit = (values: FormValues) => {
    if (!fichier) return;
    ajouter.mutate(
      {
        payload: {
          titre: values.titre,
          description: values.description || null,
          phase_marche_id: values.phaseMarcheId || null,
          marche_candidat_id: values.marcheCandidatId || null,
        },
        fichier,
      },
      { onSuccess: () => onClose() },
    );
  };

  const choixLibre = !phaseIdFixe && !candidatIdFixe;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre="Ajouter un document"
      onSubmit={(e) => {
        setTentative(true);
        void handleSubmit(onSubmit)(e);
      }}
      enCours={ajouter.isPending}
      libelleValider="Ajouter le document"
    >
      <Champ label="Fichier" htmlFor="doc-marche-fichier" requis erreur={tentative && !fichier ? 'Un fichier est requis' : undefined}>
        <ChampFichier id="doc-marche-fichier" fichier={fichier} onChange={setFichier} invalide={tentative && !fichier} />
      </Champ>
      <Champ label="Titre" htmlFor="doc-marche-titre" requis erreur={errors.titre?.message}>
        <Input autoFocus {...ariaErreur('doc-marche-titre', errors.titre)} {...register('titre')} />
      </Champ>
      <Champ label="Description" htmlFor="doc-marche-description">
        <Textarea id="doc-marche-description" rows={2} {...register('description')} />
      </Champ>
      {choixLibre && ((phases?.length ?? 0) > 0 || (candidats?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {phases && phases.length > 0 && (
            <Champ label="Phase associée" htmlFor="doc-marche-phase" aide="Laisser vide pour un document rattaché directement au marché">
              <NativeSelect id="doc-marche-phase" {...register('phaseMarcheId')}>
                <option value="">Aucune</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </NativeSelect>
            </Champ>
          )}
          {candidats && candidats.length > 0 && (
            <Champ label="Candidat associé" htmlFor="doc-marche-candidat" aide="Pour joindre une offre technique/financière">
              <NativeSelect id="doc-marche-candidat" {...register('marcheCandidatId')}>
                <option value="">Aucun</option>
                {candidats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </NativeSelect>
            </Champ>
          )}
        </div>
      )}
    </FormDialog>
  );
}
