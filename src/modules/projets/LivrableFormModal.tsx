import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useContactsExecution } from '../../hooks/projets/useContactsExecution';
import { useLivrableMutations } from '../../hooks/projets/useLivrables';
import { useMembresProjet } from '../../hooks/projets/useMembresProjet';
import { useProjetsReferentiel } from '../../hooks/projets/useProjets';
import { ariaErreur, nombreOuVide, versChampDate } from '../../lib/form';
import type { Livrable } from '../../services/projets/livrables';

const schema = z.object({
  nom: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  responsable: z.string().optional(),
  poidsPct: z.number({ message: 'Requis' }).min(0, 'Entre 0 et 100').max(100, 'Entre 0 et 100'),
  datePrevue: z.string().optional(),
  dateRemise: z.string().optional(),
  statutValeurId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  projetId: string;
  livrable?: Livrable | null;
  onClose: () => void;
}

const VIDE: FormValues = {
  nom: '',
  description: '',
  responsable: '',
  poidsPct: 0,
  datePrevue: '',
  dateRemise: '',
  statutValeurId: '',
};

// Le responsable d'un livrable est soit un membre du projet, soit un contact
// de l'organisme d'exécution (§4) — encodé en une seule valeur de select
// préfixée ("membre:<id>" / "contact:<id>") pour n'avoir qu'un seul champ,
// décodée à la soumission vers responsable_utilisateur_id/responsable_contact_id.
export function LivrableFormModal({ open, organisationId, projetId, livrable, onClose }: Props) {
  const { data: membres } = useMembresProjet(projetId);
  const { data: contacts } = useContactsExecution(projetId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: referentiel } = useProjetsReferentiel(organisationId);
  const { create, update } = useLivrableMutations(projetId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  });

  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  useEffect(() => {
    if (!open) return;
    reset(
      livrable
        ? {
            nom: livrable.nom,
            description: livrable.description ?? '',
            responsable: livrable.responsable_utilisateur_id
              ? `membre:${livrable.responsable_utilisateur_id}`
              : livrable.responsable_contact_id
                ? `contact:${livrable.responsable_contact_id}`
                : '',
            poidsPct: livrable.poids_pct,
            datePrevue: versChampDate(livrable.date_prevue),
            dateRemise: versChampDate(livrable.date_remise),
            statutValeurId: livrable.statut_valeur_id ?? '',
          }
        : VIDE,
    );
  }, [open, livrable, reset]);

  const enCours = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    const [type, id] = values.responsable ? values.responsable.split(':') : [null, null];
    const patch = {
      nom: values.nom,
      description: values.description || null,
      responsable_utilisateur_id: type === 'membre' ? id : null,
      responsable_contact_id: type === 'contact' ? id : null,
      poids_pct: values.poidsPct,
      date_prevue: values.datePrevue || null,
      date_remise: values.dateRemise || null,
      statut_valeur_id: values.statutValeurId || null,
    };
    if (livrable) {
      update.mutate({ id: livrable.id, patch }, { onSuccess: () => onClose() });
    } else {
      create.mutate({ ...patch, projet_id: projetId }, { onSuccess: () => onClose() });
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre={livrable ? 'Modifier le livrable' : 'Nouveau livrable'}
      description="Chaque livrable pèse dans l'avancement global du projet selon sa quote-part."
      onSubmit={handleSubmit(onSubmit)}
      enCours={enCours}
      libelleValider={livrable ? 'Enregistrer' : 'Ajouter le livrable'}
    >
      <Champ label="Nom" htmlFor="livrable-nom" requis erreur={errors.nom?.message}>
        <Input autoFocus {...ariaErreur('livrable-nom', errors.nom)} {...register('nom')} />
      </Champ>
      <Champ label="Description" htmlFor="livrable-description">
        <Textarea id="livrable-description" rows={2} {...register('description')} />
      </Champ>
      <Champ label="Responsable" htmlFor="livrable-responsable" aide="Membre du projet ou contact de l'organisme d'exécution">
        <NativeSelect id="livrable-responsable" {...register('responsable')}>
          <option value="">—</option>
          <optgroup label="Membres du projet">
            {(membres ?? []).map((m) => (
              <option key={m.utilisateur_id} value={`membre:${m.utilisateur_id}`}>
                {utilisateurParId.get(m.utilisateur_id) ?? m.utilisateur_id}
              </option>
            ))}
          </optgroup>
          <optgroup label="Contacts d'exécution">
            {(contacts ?? []).map((c) => (
              <option key={c.id} value={`contact:${c.id}`}>
                {c.nom}
              </option>
            ))}
          </optgroup>
        </NativeSelect>
      </Champ>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ label="Poids (%)" htmlFor="livrable-poids" requis aide="Quote-part dans l'avancement" erreur={errors.poidsPct?.message}>
          <Input
            type="number"
            min={0}
            max={100}
            step="any"
            {...ariaErreur('livrable-poids', errors.poidsPct)}
            {...register('poidsPct', { setValueAs: nombreOuVide })}
          />
        </Champ>
        <Champ label="Statut" htmlFor="livrable-statut">
          <NativeSelect id="livrable-statut" {...register('statutValeurId')}>
            <option value="">—</option>
            {(referentiel?.statutsLivrable ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.libelle}
              </option>
            ))}
          </NativeSelect>
        </Champ>
        <Champ label="Date prévue" htmlFor="livrable-date-prevue">
          <Input id="livrable-date-prevue" type="date" {...register('datePrevue')} />
        </Champ>
        <Champ label="Date de remise" htmlFor="livrable-date-remise">
          <Input id="livrable-date-remise" type="date" {...register('dateRemise')} />
        </Champ>
      </div>
    </FormDialog>
  );
}
