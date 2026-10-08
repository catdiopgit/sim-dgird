import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useEntites } from '../../hooks/administration/useEntites';
import { useOptionsDossiersGed } from '../../hooks/ged/useDossiers';
import { useCreerVersement } from '../../hooks/ged/useVersements';
import { ariaErreur } from '../../lib/form';
import type { GedVersement } from '../../services/ged/versements';

const schema = z.object({
  objet: z.string().min(1, 'Requis'),
  entiteId: z.string().optional(),
  dossierCibleId: z.string().optional(),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  onClose: () => void;
  onCree: (versement: GedVersement) => void;
}

const VIDE: FormValues = { objet: '', entiteId: '', dossierCibleId: '', description: '' };

// Première étape du dépôt (GED V2) : constituer le brouillon (objet du lot,
// entité, dossier de classement cible — un seul dossier par versement). Les
// documents eux-mêmes sont ajoutés ensuite sur la fiche du versement.
export function VersementFormModal({ open, organisationId, onClose, onCree }: Props) {
  const { data: entites } = useEntites(organisationId);
  const optionsDossiers = useOptionsDossiersGed(organisationId);
  const creer = useCreerVersement(organisationId);

  const {
    register,
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
    creer.mutate(
      {
        p_objet: values.objet,
        p_entite_id: values.entiteId || null,
        p_dossier_cible_id: values.dossierCibleId || null,
        p_description: values.description || null,
      },
      { onSuccess: (versement) => onCree(versement) },
    );
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre="Nouveau versement"
      description="Le versement est créé en brouillon : vous y ajouterez ensuite les documents avant de le soumettre."
      onSubmit={handleSubmit(onSubmit)}
      enCours={creer.isPending}
      libelleValider="Créer le brouillon"
    >
      <Champ label="Objet du versement" htmlFor="versement-objet" requis erreur={errors.objet?.message}>
        <Input autoFocus placeholder="Ex. Rapports de recettes — 3e trimestre 2026" {...ariaErreur('versement-objet', errors.objet)} {...register('objet')} />
      </Champ>
      <Champ label="Entité" htmlFor="versement-entite">
        <NativeSelect id="versement-entite" {...register('entiteId')}>
          <option value="">—</option>
          {(entites ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.sigle ? `${e.sigle} — ${e.libelle}` : e.libelle}
            </option>
          ))}
        </NativeSelect>
      </Champ>
      <Champ label="Dossier de classement cible" htmlFor="versement-dossier" aide="Proposition : l'archiviste pourra la confirmer au classement.">
        <NativeSelect id="versement-dossier" {...register('dossierCibleId')}>
          <option value="">Aucun</option>
          {optionsDossiers.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </Champ>
      <Champ label="Description" htmlFor="versement-description">
        <Textarea id="versement-description" rows={2} {...register('description')} />
      </Champ>
    </FormDialog>
  );
}
