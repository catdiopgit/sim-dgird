import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input, Textarea } from '../../components/ui/input';
import { useCreerDossierGed, useModifierDossierGed } from '../../hooks/ged/useDossiers';
import { ariaErreur } from '../../lib/form';
import type { GedDossier } from '../../services/ged/dossiers';

const schema = z.object({
  libelle: z.string().min(1, 'Requis'),
  code: z.string().trim().min(1, 'Requis').max(40, '40 caractères au maximum'),
  ordre: z.string().optional(),
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
  // v8.6 : code proposé à la création (suite logique des frères), modifiable.
  codePropose?: string;
}

export function DossierFormModal({ open, organisationId, dossier, parentDossierId, onClose, onCree, codePropose }: Props) {
  const creer = useCreerDossierGed(organisationId);
  const modifier = useModifierDossierGed(organisationId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { libelle: '', code: '', ordre: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        libelle: dossier?.libelle ?? '',
        code: dossier?.code ?? codePropose ?? '',
        ordre: dossier ? String(dossier.ordre ?? '') : '',
        description: dossier?.description ?? '',
      });
    }
  }, [open, dossier, reset, codePropose]);

  const codeVerrouille = Boolean(dossier?.verrouille);
  const ordre = (v: string | undefined) => (v && /^-?\d+$/.test(v.trim()) ? Number(v.trim()) : null);

  const enCours = creer.isPending || modifier.isPending;

  const onSubmit = (values: FormValues) => {
    if (dossier) {
      modifier.mutate(
        {
          p_dossier_id: dossier.id,
          p_code: codeVerrouille ? undefined : values.code,
          p_libelle: values.libelle,
          p_description: values.description || null,
          p_ordre: ordre(values.ordre),
        },
        { onSuccess: () => onClose() },
      );
    } else {
      creer.mutate(
        {
          p_libelle: values.libelle,
          p_code: values.code,
          p_parent_dossier_id: parentDossierId ?? null,
          p_description: values.description || null,
          p_ordre: ordre(values.ordre),
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
      titre={dossier ? 'Modifier le dossier' : 'Nouveau dossier'}
      onSubmit={handleSubmit(onSubmit)}
      enCours={enCours}
      libelleValider={dossier ? 'Enregistrer' : 'Créer le dossier'}
    >
      <Champ
        label="Code"
        htmlFor="dossier-code"
        requis
        aide={
          codeVerrouille
            ? 'Code verrouillé : ce dossier (ou un de ses sous-dossiers) contient des documents.'
            : 'Saisi librement (ex. A, CA, PM-I, A-I-01) ; unique dans le plan.'
        }
        erreur={errors.code?.message}
      >
        <Input
          autoFocus={!dossier}
          disabled={codeVerrouille}
          className="font-mono"
          {...ariaErreur('dossier-code', errors.code)}
          {...register('code')}
        />
      </Champ>
      <Champ label="Intitulé" htmlFor="dossier-libelle" requis erreur={errors.libelle?.message}>
        <Input autoFocus={Boolean(dossier)} {...ariaErreur('dossier-libelle', errors.libelle)} {...register('libelle')} />
      </Champ>
      <Champ label="Ordre d'affichage" htmlFor="dossier-ordre" aide="Position parmi les dossiers du même niveau (laisser vide : à la fin).">
        <Input id="dossier-ordre" inputMode="numeric" className="max-w-[140px]" {...register('ordre')} />
      </Champ>
      <Champ label="Description" htmlFor="dossier-description">
        <Textarea id="dossier-description" rows={2} {...register('description')} />
      </Champ>
    </FormDialog>
  );
}
