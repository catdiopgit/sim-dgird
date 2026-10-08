import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../../components/form/champ';
import { FormDialog } from '../../../components/form/form-dialog';
import { Input } from '../../../components/ui/input';
import { NativeSelect } from '../../../components/ui/native-select';
import { ariaErreur } from '../../../lib/form';
import type { UtilisateurOption } from '../../../services/administration/entites';
import type { TypeEntite } from '../../../services/administration/typeEntites';
import { slugifier } from '../../../utils/slug';

const schema = z.object({
  type_entite_id: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  libelle: z.string().min(1, 'Requis'),
  sigle: z.string().optional(),
  responsable_utilisateur_id: z.string().optional(),
  personne_receptrice_id: z.string().optional(),
});
export type EntiteFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  titre: string;
  valeursInitiales?: Partial<EntiteFormValues>;
  estNouveau: boolean;
  typeEntites: TypeEntite[];
  utilisateursOptions: UtilisateurOption[];
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: EntiteFormValues) => void;
}

export function EntiteFormModal({
  open,
  titre,
  valeursInitiales,
  estNouveau,
  typeEntites,
  utilisateursOptions,
  confirmLoading,
  onCancel,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EntiteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type_entite_id: '',
      code: '',
      libelle: '',
      sigle: '',
      responsable_utilisateur_id: '',
      personne_receptrice_id: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        type_entite_id: valeursInitiales?.type_entite_id ?? '',
        code: valeursInitiales?.code ?? '',
        libelle: valeursInitiales?.libelle ?? '',
        sigle: valeursInitiales?.sigle ?? '',
        responsable_utilisateur_id: valeursInitiales?.responsable_utilisateur_id ?? '',
        personne_receptrice_id: valeursInitiales?.personne_receptrice_id ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const libelle = watch('libelle');
  useEffect(() => {
    if (estNouveau && libelle) {
      setValue('code', slugifier(libelle));
    }
  }, [libelle, estNouveau, setValue]);

  const optionsUtilisateurs = utilisateursOptions.map((u) => (
    <option key={u.id} value={u.id}>
      {u.prenom} {u.nom}
    </option>
  ));

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      titre={titre}
      onSubmit={handleSubmit(onSubmit)}
      enCours={confirmLoading}
      libelleValider={estNouveau ? "Créer l'entité" : 'Enregistrer'}
      largeur="lg"
    >
      <Champ label="Type d'entité" htmlFor="entite-type" requis erreur={errors.type_entite_id?.message}>
        <NativeSelect {...ariaErreur('entite-type', errors.type_entite_id)} {...register('type_entite_id')}>
          <option value="">Sélectionner un type</option>
          {typeEntites.map((t) => (
            <option key={t.id} value={t.id}>
              {t.libelle}
            </option>
          ))}
        </NativeSelect>
      </Champ>
      <Champ label="Libellé" htmlFor="entite-libelle" requis erreur={errors.libelle?.message}>
        <Input autoFocus {...ariaErreur('entite-libelle', errors.libelle)} {...register('libelle')} />
      </Champ>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ label="Code" htmlFor="entite-code" requis aide={estNouveau ? 'Proposé à partir du libellé.' : undefined} erreur={errors.code?.message}>
          <Input className="font-mono" {...ariaErreur('entite-code', errors.code)} {...register('code')} />
        </Champ>
        <Champ label="Sigle" htmlFor="entite-sigle">
          <Input id="entite-sigle" {...register('sigle')} />
        </Champ>
        <Champ label="Responsable" htmlFor="entite-responsable">
          <NativeSelect id="entite-responsable" {...register('responsable_utilisateur_id')}>
            <option value="">Aucun</option>
            {optionsUtilisateurs}
          </NativeSelect>
        </Champ>
        <Champ
          label="Personne réceptrice des courriers"
          htmlFor="entite-receptrice"
          aide="Reçoit une copie des courriers imputés à l'entité (souvent un secrétariat)."
        >
          <NativeSelect id="entite-receptrice" {...register('personne_receptrice_id')}>
            <option value="">Aucune</option>
            {optionsUtilisateurs}
          </NativeSelect>
        </Champ>
      </div>
    </FormDialog>
  );
}
