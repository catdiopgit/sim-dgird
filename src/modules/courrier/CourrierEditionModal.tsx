import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import dayjs from 'dayjs';
import { useContacts } from '../../hooks/courrier/useContacts';
import { useCourrierReferentiel, useUpdateCourrier } from '../../hooks/courrier/useCourriers';
import { ariaErreur, versChampDate } from '../../lib/form';
import type { Courrier } from '../../services/courrier/courriers';
import { controlerDatesCourrier, maxDateHeure, maxJour } from './reglesDates';

const schema = z
  .object({
    entrant: z.boolean(),
    objet: z.string().trim().min(1, 'Requis'),
    typeValeurId: z.string().optional(),
    prioriteValeurId: z.string().optional(),
    confidentialiteValeurId: z.string().optional(),
    modeTransmissionValeurId: z.string().optional(),
    dateCourrier: z.string().min(1, 'Requis'),
    dateReception: z.string().optional(),
    expediteurContactId: z.string().optional(),
    expediteurNom: z.string().optional(),
    referenceExpediteur: z.string().optional(),
    destinataireTexte: z.string().optional(),
    observations: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.entrant) {
      if (!v.dateReception) ctx.addIssue({ code: 'custom', path: ['dateReception'], message: 'Requis' });
      if (!v.expediteurContactId && !v.expediteurNom) {
        ctx.addIssue({ code: 'custom', path: ['expediteurContactId'], message: "Sélectionnez l'expéditeur" });
      }
    }
    const erreurs = controlerDatesCourrier(v.dateCourrier, v.dateReception);
    if (erreurs.dateCourrier) ctx.addIssue({ code: 'custom', path: ['dateCourrier'], message: erreurs.dateCourrier });
    if (erreurs.dateReception) ctx.addIssue({ code: 'custom', path: ['dateReception'], message: erreurs.dateReception });
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
  const { data: contacts } = useContacts(organisationId);
  const entrant = courrier.sens === 'entrant';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { entrant, objet: '', dateCourrier: '', observations: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        entrant,
        objet: courrier.objet,
        typeValeurId: courrier.type_valeur_id ?? '',
        prioriteValeurId: courrier.priorite_valeur_id ?? '',
        confidentialiteValeurId: courrier.confidentialite_valeur_id ?? '',
        modeTransmissionValeurId: courrier.mode_transmission_valeur_id ?? '',
        dateCourrier: versChampDate(courrier.date_courrier),
        dateReception: courrier.date_reception ? dayjs(courrier.date_reception).format('YYYY-MM-DDTHH:mm') : '',
        expediteurContactId: courrier.expediteur_contact_id ?? '',
        expediteurNom: courrier.expediteur_nom ?? '',
        referenceExpediteur: courrier.reference_expediteur ?? '',
        destinataireTexte: courrier.destinataire_texte ?? '',
        observations: courrier.observations ?? '',
      });
    }
  }, [open, courrier, reset, entrant]);

  const onSubmit = (values: FormValues) => {
    update.mutate(
      {
        objet: values.objet,
        type_valeur_id: values.typeValeurId || null,
        priorite_valeur_id: values.prioriteValeurId || null,
        confidentialite_valeur_id: values.confidentialiteValeurId || null,
        mode_transmission_valeur_id: values.modeTransmissionValeurId || null,
        date_courrier: values.dateCourrier || courrier.date_courrier,
        ...(entrant
          ? {
              date_reception: values.dateReception ? dayjs(values.dateReception).toISOString() : null,
              reference_expediteur: values.referenceExpediteur || null,
              // Expéditeur choisi dans les contacts (le nom est recopié côté serveur) ;
              // un ancien courrier saisi en texte libre garde son nom tant qu'on ne choisit rien.
              ...(values.expediteurContactId ? { expediteur_contact_id: values.expediteurContactId } : {}),
            }
          : {}),
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
        <Champ label="Date du courrier" htmlFor="edition-date" requis erreur={errors.dateCourrier?.message}>
          <Input type="date" max={maxJour()} {...ariaErreur('edition-date', errors.dateCourrier)} {...register('dateCourrier')} />
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
        {entrant && (
          <>
            <Champ label="Expéditeur" htmlFor="edition-expediteur" requis erreur={errors.expediteurContactId?.message}>
              <NativeSelect {...ariaErreur('edition-expediteur', errors.expediteurContactId)} {...register('expediteurContactId')}>
                <option value="">{courrier.expediteur_contact_id ? '—' : (courrier.expediteur_nom ?? '—')}</option>
                {(contacts ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </NativeSelect>
            </Champ>
            <Champ label="Référence de l'expéditeur" htmlFor="edition-reference">
              <Input id="edition-reference" {...register('referenceExpediteur')} />
            </Champ>
            <Champ
              label="Date et heure de réception"
              htmlFor="edition-reception"
              requis
              erreur={errors.dateReception?.message}
              className="sm:col-span-2"
            >
              <Input
                type="datetime-local"
                max={maxDateHeure()}
                {...ariaErreur('edition-reception', errors.dateReception)}
                {...register('dateReception')}
              />
            </Champ>
          </>
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
