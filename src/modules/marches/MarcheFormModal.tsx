import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { SectionFormulaire } from '../../components/form/section-formulaire';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useMarcheMutations } from '../../hooks/marches/useMarches';
import { useTypesMarche } from '../../hooks/marches/useTypesMarche';
import { ariaErreur, nombreOuVide, versChampDate } from '../../lib/form';
import type { Marche } from '../../services/marches/marches';

const schema = z.object({
  reference: z.string().min(1, 'Requis'),
  objet: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  entiteId: z.string().min(1, 'Requis'),
  typeMarcheId: z.string().min(1, 'Requis'),
  responsableId: z.string().optional(),
  dateDebutPrevue: z.string().optional(),
  dateFinPrevue: z.string().optional(),
  montantEstimatif: z.number().min(0, 'Montant invalide').optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  marche?: Marche | null;
  onClose: () => void;
  onCree?: (marche: Marche) => void;
}

const DEFAUTS: FormValues = {
  reference: '',
  objet: '',
  description: '',
  entiteId: '',
  typeMarcheId: '',
  responsableId: '',
  dateDebutPrevue: '',
  dateFinPrevue: '',
  montantEstimatif: undefined,
  observations: '',
};

// §8 Création d'un marché. La planification automatique des phases (§10) est
// déclenchée côté serveur juste après la création/mise à jour dès qu'une date
// de début prévisionnelle est renseignée (server/marches/marches.controller.ts) —
// rien à faire ici au-delà de l'envoyer.
export function MarcheFormModal({ open, organisationId, marche, onClose, onCree }: Props) {
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: types } = useTypesMarche();
  const { create, update } = useMarcheMutations();

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
      marche
        ? {
            reference: marche.reference,
            objet: marche.objet,
            description: marche.description ?? '',
            entiteId: marche.entite_id,
            typeMarcheId: marche.type_marche_id,
            responsableId: marche.responsable_id ?? '',
            dateDebutPrevue: versChampDate(marche.date_debut_prevue),
            dateFinPrevue: versChampDate(marche.date_fin_prevue),
            montantEstimatif: marche.montant_estimatif ?? undefined,
            observations: marche.observations ?? '',
          }
        : DEFAUTS,
    );
  }, [open, marche, reset]);

  const enCours = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    const patch = {
      reference: values.reference,
      objet: values.objet,
      description: values.description || null,
      entite_id: values.entiteId,
      type_marche_id: values.typeMarcheId,
      responsable_id: values.responsableId || null,
      date_debut_prevue: values.dateDebutPrevue || null,
      date_fin_prevue: values.dateFinPrevue || null,
      montant_estimatif: values.montantEstimatif ?? null,
      observations: values.observations || null,
    };
    if (marche) {
      update.mutate({ id: marche.id, patch }, { onSuccess: () => onClose() });
    } else {
      create.mutate(
        { ...patch, organisation_id: organisationId },
        {
          onSuccess: (nouveauMarche) => {
            onCree?.(nouveauMarche);
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
      titre={marche ? 'Modifier le marché' : 'Nouveau marché'}
      description={marche ? `${marche.reference} — ${marche.objet}` : 'Les phases sont planifiées automatiquement à partir de la date de début.'}
      onSubmit={handleSubmit(onSubmit)}
      enCours={enCours}
      libelleValider={marche ? 'Enregistrer' : 'Créer le marché'}
      largeur="lg"
    >
      <SectionFormulaire titre="Identification">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
          <Champ label="Référence" htmlFor="marche-reference" requis erreur={errors.reference?.message}>
            <Input autoFocus {...ariaErreur('marche-reference', errors.reference)} {...register('reference')} />
          </Champ>
          <Champ label="Objet" htmlFor="marche-objet" requis erreur={errors.objet?.message}>
            <Input {...ariaErreur('marche-objet', errors.objet)} {...register('objet')} />
          </Champ>
        </div>
        <Champ label="Description" htmlFor="marche-description">
          <Textarea id="marche-description" rows={2} {...register('description')} />
        </Champ>
      </SectionFormulaire>

      <SectionFormulaire titre="Pilotage">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ
            label="Type de marché"
            htmlFor="marche-type"
            requis
            erreur={errors.typeMarcheId?.message}
            aide={marche ? 'Non modifiable après création' : undefined}
          >
            <NativeSelect disabled={Boolean(marche)} {...ariaErreur('marche-type', errors.typeMarcheId)} {...register('typeMarcheId')}>
              <option value="">Sélectionner un type</option>
              {(types ?? [])
                .filter((t) => t.actif || t.id === marche?.type_marche_id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.libelle}
                  </option>
                ))}
            </NativeSelect>
          </Champ>
          <Champ label="Entité porteuse" htmlFor="marche-entite" requis erreur={errors.entiteId?.message}>
            <NativeSelect {...ariaErreur('marche-entite', errors.entiteId)} {...register('entiteId')}>
              <option value="">Sélectionner une entité</option>
              {(entites ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.libelle}
                </option>
              ))}
            </NativeSelect>
          </Champ>
          <Champ label="Responsable / agent chargé du marché" htmlFor="marche-responsable" className="sm:col-span-2">
            <NativeSelect id="marche-responsable" {...register('responsableId')}>
              <option value="">—</option>
              {(utilisateurs ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom}
                </option>
              ))}
            </NativeSelect>
          </Champ>
        </div>
      </SectionFormulaire>

      <SectionFormulaire titre="Calendrier et montant">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ
            label="Date de début prévisionnelle"
            htmlFor="marche-debut"
            aide="Déclenche la planification automatique des phases dès qu'elle est renseignée"
          >
            <Input id="marche-debut" type="date" {...register('dateDebutPrevue')} />
          </Champ>
          <Champ
            label="Date de fin prévisionnelle"
            htmlFor="marche-fin"
            aide="Calculée automatiquement après planification, modifiable si besoin"
          >
            <Input id="marche-fin" type="date" {...register('dateFinPrevue')} />
          </Champ>
          <Champ label="Montant estimatif (FCFA)" htmlFor="marche-montant" erreur={errors.montantEstimatif?.message}>
            <Input
              type="number"
              min={0}
              step="any"
              {...ariaErreur('marche-montant', errors.montantEstimatif)}
              {...register('montantEstimatif', { setValueAs: nombreOuVide })}
            />
          </Champ>
        </div>
        <Champ label="Observations" htmlFor="marche-observations">
          <Textarea id="marche-observations" rows={2} {...register('observations')} />
        </Champ>
      </SectionFormulaire>
    </FormDialog>
  );
}
