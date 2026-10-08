import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useCourrierReferentiel, useUpdateCourrier } from '../../hooks/courrier/useCourriers';
import { ariaErreur, versChampDate } from '../../lib/form';
import type { Courrier } from '../../services/courrier/courriers';

const schema = z.object({
  objet: z.string().min(1, 'Requis'),
  typeValeurId: z.string().optional(),
  prioriteValeurId: z.string().optional(),
  confidentialiteValeurId: z.string().optional(),
  modeTransmissionValeurId: z.string().optional(),
  dateCourrier: z.string().optional(),
  expediteurNom: z.string().optional(),
  destinataireTexte: z.string().optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  courrier: Courrier;
  organisationId: string;
  open: boolean;
  onClose: () => void;
}

// Édition des champs informatifs d'un courrier (CourrierPatchInfos) : le
// numéro, le sens et l'étape restent gérés par les fonctions serveur.
export function CourrierEditionModal({ courrier, organisationId, open, onClose }: Props) {
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const update = useUpdateCourrier(courrier.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { objet: '', observations: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        objet: courrier.objet,
        typeValeurId: courrier.type_valeur_id ?? '',
        prioriteValeurId: courrier.priorite_valeur_id ?? '',
        confidentialiteValeurId: courrier.confidentialite_valeur_id ?? '',
        modeTransmissionValeurId: courrier.mode_transmission_valeur_id ?? '',
        dateCourrier: versChampDate(courrier.date_courrier),
        expediteurNom: courrier.expediteur_nom ?? '',
        destinataireTexte: courrier.destinataire_texte ?? '',
        observations: courrier.observations ?? '',
      });
    }
  }, [open, courrier, reset]);

  const onSubmit = (values: FormValues) => {
    update.mutate(
      {
        objet: values.objet,
        type_valeur_id: values.typeValeurId || null,
        priorite_valeur_id: values.prioriteValeurId || null,
        confidentialite_valeur_id: values.confidentialiteValeurId || null,
        mode_transmission_valeur_id: values.modeTransmissionValeurId || null,
        date_courrier: values.dateCourrier || courrier.date_courrier,
        expediteur_nom: values.expediteurNom || null,
        destinataire_texte: values.destinataireTexte || null,
        observations: values.observations || null,
      },
      { onSuccess: onClose },
    );
  };

  const options = (liste: { id: string; libelle: string }[] | undefined) =>
    (liste ?? []).map((v) => (
      <option key={v.id} value={v.id}>
        {v.libelle}
      </option>
    ));

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre="Modifier le courrier"
      description={courrier.numero}
      onSubmit={handleSubmit(onSubmit)}
      enCours={update.isPending}
      largeur="lg"
    >
      <Champ label="Objet" htmlFor="edition-objet" requis erreur={errors.objet?.message}>
        <Input autoFocus {...ariaErreur('edition-objet', errors.objet)} {...register('objet')} />
      </Champ>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ label="Type de courrier" htmlFor="edition-type">
          <NativeSelect id="edition-type" {...register('typeValeurId')}>
            <option value="">—</option>
            {options(referentiel?.types)}
          </NativeSelect>
        </Champ>
        <Champ label="Date du courrier" htmlFor="edition-date">
          <Input id="edition-date" type="date" {...register('dateCourrier')} />
        </Champ>
        <Champ label="Priorité" htmlFor="edition-priorite">
          <NativeSelect id="edition-priorite" {...register('prioriteValeurId')}>
            <option value="">—</option>
            {options(referentiel?.priorites)}
          </NativeSelect>
        </Champ>
        <Champ label="Confidentialité" htmlFor="edition-confidentialite">
          <NativeSelect id="edition-confidentialite" {...register('confidentialiteValeurId')}>
            <option value="">—</option>
            {options(referentiel?.confidentialites)}
          </NativeSelect>
        </Champ>
        {courrier.sens === 'entrant' && (
          <Champ label="Expéditeur" htmlFor="edition-expediteur" className="sm:col-span-2">
            <Input id="edition-expediteur" {...register('expediteurNom')} />
          </Champ>
        )}
        {courrier.sens === 'sortant' && (
          <>
            <Champ label="Destinataire" htmlFor="edition-destinataire">
              <Input id="edition-destinataire" {...register('destinataireTexte')} />
            </Champ>
            <Champ label="Mode de transmission" htmlFor="edition-transmission">
              <NativeSelect id="edition-transmission" {...register('modeTransmissionValeurId')}>
                <option value="">—</option>
                {options(referentiel?.modesTransmission)}
              </NativeSelect>
            </Champ>
          </>
        )}
      </div>
      <Champ label="Observations" htmlFor="edition-observations">
        <Textarea id="edition-observations" rows={2} {...register('observations')} />
      </Champ>
    </FormDialog>
  );
}
