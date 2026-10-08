import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useMarcheCandidatMutations } from '../../hooks/marches/useMarcheCandidats';
import { ariaErreur } from '../../lib/form';
import type { MarcheCandidat } from '../../services/marches/candidats';

const schema = z.object({
  nom: z.string().min(1, 'Requis'),
  type: z.enum(['entreprise', 'consultant']),
  coordonnees: z.string().optional(),
  informationsComplementaires: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  marcheId: string;
  candidat?: MarcheCandidat | null;
  onClose: () => void;
}

const DEFAUTS: FormValues = { nom: '', type: 'entreprise', coordonnees: '', informationsComplementaires: '' };

// §15 — fonctionnalité optionnelle : entreprises/consultants participant à la procédure.
export function MarcheCandidatFormModal({ open, marcheId, candidat, onClose }: Props) {
  const { create, update } = useMarcheCandidatMutations(marcheId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAUTS,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      candidat
        ? {
            nom: candidat.nom,
            type: candidat.type,
            coordonnees: candidat.coordonnees ?? '',
            informationsComplementaires: candidat.informations_complementaires ?? '',
          }
        : DEFAUTS,
    );
  }, [open, candidat, reset]);

  const enCours = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    const patch = {
      nom: values.nom,
      type: values.type,
      coordonnees: values.coordonnees || null,
      informations_complementaires: values.informationsComplementaires || null,
    };
    if (candidat) {
      update.mutate({ id: candidat.id, patch }, { onSuccess: () => onClose() });
    } else {
      create.mutate(patch, { onSuccess: () => onClose() });
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre={candidat ? 'Modifier le candidat' : 'Nouveau candidat'}
      onSubmit={handleSubmit(onSubmit)}
      enCours={enCours}
      libelleValider={candidat ? 'Enregistrer' : 'Ajouter le candidat'}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
        <Champ label="Nom / raison sociale" htmlFor="candidat-nom" requis erreur={errors.nom?.message}>
          <Input autoFocus {...ariaErreur('candidat-nom', errors.nom)} {...register('nom')} />
        </Champ>
        <Champ label="Type" htmlFor="candidat-type" requis>
          <NativeSelect id="candidat-type" {...register('type')}>
            <option value="entreprise">Entreprise</option>
            <option value="consultant">Consultant</option>
          </NativeSelect>
        </Champ>
      </div>
      <Champ label="Coordonnées" htmlFor="candidat-coordonnees">
        <Textarea id="candidat-coordonnees" rows={2} {...register('coordonnees')} />
      </Champ>
      <Champ label="Informations complémentaires" htmlFor="candidat-infos">
        <Textarea id="candidat-infos" rows={2} {...register('informationsComplementaires')} />
      </Champ>
    </FormDialog>
  );
}
