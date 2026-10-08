import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { NativeSelect } from '../../components/ui/native-select';
import { Switch } from '../../components/ui/switch';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useMembreMutations } from '../../hooks/projets/useMembresProjet';
import { useProjetsReferentiel } from '../../hooks/projets/useProjets';
import { ariaErreur } from '../../lib/form';

const schema = z.object({
  utilisateurId: z.string().min(1, 'Requis'),
  roleEquipeValeurId: z.string().optional(),
  peutModifier: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  projetId: string;
  onClose: () => void;
}

const VIDE: FormValues = { utilisateurId: '', roleEquipeValeurId: '', peutModifier: true };

export function MembreFormModal({ open, organisationId, projetId, onClose }: Props) {
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: referentiel } = useProjetsReferentiel(organisationId);
  const { ajouter } = useMembreMutations(projetId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  });

  useEffect(() => {
    if (open) reset(VIDE);
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    ajouter.mutate(
      {
        projet_id: projetId,
        utilisateur_id: values.utilisateurId,
        role_equipe_valeur_id: values.roleEquipeValeurId || null,
        peut_modifier: values.peutModifier,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre="Ajouter un membre"
      onSubmit={handleSubmit(onSubmit)}
      enCours={ajouter.isPending}
      libelleValider="Ajouter le membre"
    >
      <Champ label="Utilisateur" htmlFor="membre-utilisateur" requis erreur={errors.utilisateurId?.message}>
        <NativeSelect autoFocus {...ariaErreur('membre-utilisateur', errors.utilisateurId)} {...register('utilisateurId')}>
          <option value="">Sélectionner un utilisateur</option>
          {(utilisateurs ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.prenom} {u.nom}
            </option>
          ))}
        </NativeSelect>
      </Champ>
      <Champ label="Rôle dans l'équipe" htmlFor="membre-role">
        <NativeSelect id="membre-role" {...register('roleEquipeValeurId')}>
          <option value="">—</option>
          {(referentiel?.rolesEquipe ?? []).map((v) => (
            <option key={v.id} value={v.id}>
              {v.libelle}
            </option>
          ))}
        </NativeSelect>
      </Champ>
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div>
          <label htmlFor="membre-modification" className="text-[13px] font-medium">
            Droit de modification
          </label>
          <p id="membre-modification-aide" className="mt-0.5 text-[12px] text-muted-foreground">
            Un membre en lecture seule peut consulter le projet mais pas le modifier.
          </p>
        </div>
        <Controller
          name="peutModifier"
          control={control}
          render={({ field }) => (
            <Switch id="membre-modification" checked={field.value} onCheckedChange={field.onChange} aria-describedby="membre-modification-aide" />
          )}
        />
      </div>
    </FormDialog>
  );
}
