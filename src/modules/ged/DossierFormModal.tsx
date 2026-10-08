import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useEntites } from '../../hooks/administration/useEntites';
import { useCreerDossierGed, useModifierDossierGed } from '../../hooks/ged/useDossiers';
import { ariaErreur } from '../../lib/form';
import type { GedDossier } from '../../services/ged/dossiers';

const schema = z.object({
  libelle: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  entiteId: z.string().optional(),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  // Dossier à renommer (édition) ; absent = création.
  dossier?: GedDossier | null;
  // Parent pré-rempli pour une création lancée depuis un nœud de l'arbre.
  parentDossierId?: string | null;
  onClose: () => void;
  // Notifié avec le dossier créé (pas en édition) — permet par exemple au
  // Classement documentaire de sélectionner immédiatement le nouveau dossier.
  onCree?: (dossier: GedDossier) => void;
}

export function DossierFormModal({ open, organisationId, dossier, parentDossierId, onClose, onCree }: Props) {
  const { data: entites } = useEntites(organisationId);
  const creer = useCreerDossierGed(organisationId);
  const modifier = useModifierDossierGed(organisationId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { libelle: '', code: '', entiteId: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        libelle: dossier?.libelle ?? '',
        // En édition, le code n'est pas modifiable mais reste requis par le schéma.
        code: dossier?.code ?? '',
        entiteId: dossier?.entite_id ?? '',
        description: dossier?.description ?? '',
      });
    }
  }, [open, dossier, reset]);

  const enCours = creer.isPending || modifier.isPending;

  const onSubmit = (values: FormValues) => {
    if (dossier) {
      modifier.mutate(
        {
          p_dossier_id: dossier.id,
          p_libelle: values.libelle,
          p_description: values.description || null,
        },
        { onSuccess: () => onClose() },
      );
    } else {
      creer.mutate(
        {
          p_libelle: values.libelle,
          p_code: values.code,
          p_entite_id: values.entiteId || null,
          p_parent_dossier_id: parentDossierId ?? null,
          p_description: values.description || null,
        },
        {
          onSuccess: (nouveauDossier) => {
            onCree?.(nouveauDossier);
            onClose();
          },
        },
      );
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre={dossier ? 'Renommer le dossier' : 'Nouveau dossier'}
      onSubmit={handleSubmit(onSubmit)}
      enCours={enCours}
      libelleValider={dossier ? 'Enregistrer' : 'Créer le dossier'}
    >
      <Champ label="Libellé" htmlFor="dossier-libelle" requis erreur={errors.libelle?.message}>
        <Input autoFocus {...ariaErreur('dossier-libelle', errors.libelle)} {...register('libelle')} />
      </Champ>
      {!dossier && (
        <>
          <Champ label="Code" htmlFor="dossier-code" requis aide="Identifiant court, unique dans l'organisation" erreur={errors.code?.message}>
            <Input {...ariaErreur('dossier-code', errors.code)} {...register('code')} />
          </Champ>
          <Champ label="Entité" htmlFor="dossier-entite" aide="Laisser vide pour un dossier transverse, partagé par toute l'organisation.">
            <NativeSelect id="dossier-entite" {...register('entiteId')}>
              <option value="">Dossier transverse</option>
              {(entites ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.sigle ? `${e.sigle} — ${e.libelle}` : e.libelle}
                </option>
              ))}
            </NativeSelect>
          </Champ>
        </>
      )}
      <Champ label="Description" htmlFor="dossier-description">
        <Textarea id="dossier-description" rows={2} {...register('description')} />
      </Champ>
    </FormDialog>
  );
}
