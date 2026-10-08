import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { SectionFormulaire } from '../../components/form/section-formulaire';
import { CaseACocher, ListeCases } from '../../components/ui/checkbox';
import { Input, Textarea } from '../../components/ui/input';
import { useAvenantLivrables, useAvenantMutations } from '../../hooks/projets/useAvenants';
import { useLivrables } from '../../hooks/projets/useLivrables';
import { ariaErreur, nombreOuVide, versChampDate } from '../../lib/form';
import { definirAvenantLivrables } from '../../services/projets/avenants';
import type { Avenant } from '../../services/projets/avenants';

const schema = z.object({
  reference: z.string().min(1, 'Requis'),
  dateAvenant: z.string().optional(),
  objet: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  motif: z.string().optional(),
  montant: z.number().min(0, 'Montant invalide').optional(),
  dureeInitiale: z.string().optional(),
  nouvelleDuree: z.string().optional(),
  dateDebut: z.string().optional(),
  nouvelleDateFin: z.string().optional(),
  observations: z.string().optional(),
  creeNouveauxLivrables: z.boolean(),
  livrablesModifies: z.array(z.string()),
  echeanceModifiee: z.boolean(),
  contenuModifie: z.boolean(),
  livrablesSupprimes: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

const defauts = (): FormValues => ({
  reference: '',
  dateAvenant: dayjs().format('YYYY-MM-DD'),
  objet: '',
  description: '',
  motif: '',
  montant: undefined,
  dureeInitiale: '',
  nouvelleDuree: '',
  dateDebut: '',
  nouvelleDateFin: '',
  observations: '',
  creeNouveauxLivrables: false,
  livrablesModifies: [],
  echeanceModifiee: false,
  contenuModifie: false,
  livrablesSupprimes: [],
});

interface Props {
  open: boolean;
  projetId: string;
  avenant?: Avenant | null;
  onClose: () => void;
}

export function AvenantFormModal({ open, projetId, avenant, onClose }: Props) {
  const { create, update } = useAvenantMutations(projetId);
  const { data: livrables } = useLivrables(projetId);
  const { data: impacts } = useAvenantLivrables(projetId, avenant?.id);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defauts(),
  });

  const optionsLivrables = useMemo(() => (livrables ?? []).map((l) => ({ valeur: l.id, libelle: l.nom })), [livrables]);
  const livrablesModifies = watch('livrablesModifies');

  useEffect(() => {
    if (!open) return;
    if (avenant) {
      reset({
        reference: avenant.reference,
        dateAvenant: versChampDate(avenant.date_avenant),
        objet: avenant.objet,
        description: avenant.description ?? '',
        motif: avenant.motif ?? '',
        montant: avenant.montant ?? undefined,
        dureeInitiale: avenant.duree_initiale ?? '',
        nouvelleDuree: avenant.nouvelle_duree ?? '',
        dateDebut: versChampDate(avenant.date_debut),
        nouvelleDateFin: versChampDate(avenant.nouvelle_date_fin),
        observations: avenant.observations ?? '',
        creeNouveauxLivrables: (impacts ?? []).some((i) => i.type_impact === 'cree'),
        livrablesModifies: (impacts ?? []).filter((i) => i.type_impact === 'modifie' && i.livrable_id).map((i) => i.livrable_id!),
        echeanceModifiee: (impacts ?? []).some((i) => i.type_impact === 'modifie' && i.echeance_modifiee),
        contenuModifie: (impacts ?? []).some((i) => i.type_impact === 'modifie' && i.contenu_modifie),
        livrablesSupprimes: (impacts ?? []).filter((i) => i.type_impact === 'supprime' && i.livrable_id).map((i) => i.livrable_id!),
      });
    } else {
      reset(defauts());
    }
    // impacts n'arrive qu'après le premier rendu (requête async) — se
    // resynchronise volontairement quand la liste change pour un avenant existant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, avenant, impacts, reset]);

  const enCours = create.isPending || update.isPending || isSubmitting;

  const onSubmit = async (values: FormValues) => {
    const patch = {
      reference: values.reference,
      date_avenant: values.dateAvenant || undefined,
      objet: values.objet,
      description: values.description || null,
      motif: values.motif || null,
      montant: values.montant ?? null,
      duree_initiale: values.dureeInitiale || null,
      nouvelle_duree: values.nouvelleDuree || null,
      date_debut: values.dateDebut || null,
      nouvelle_date_fin: values.nouvelleDateFin || null,
      observations: values.observations || null,
    };

    const entrees = [
      ...(values.creeNouveauxLivrables ? [{ livrable_id: null, type_impact: 'cree' as const }] : []),
      ...values.livrablesModifies.map((livrable_id) => ({
        livrable_id,
        type_impact: 'modifie' as const,
        echeance_modifiee: values.echeanceModifiee,
        contenu_modifie: values.contenuModifie,
      })),
      ...values.livrablesSupprimes.map((livrable_id) => ({ livrable_id, type_impact: 'supprime' as const })),
    ];

    const resultat = avenant
      ? await update.mutateAsync({ id: avenant.id, patch })
      : await create.mutateAsync({ ...patch, projet_id: projetId });

    await definirAvenantLivrables(projetId, resultat.id, entrees);
    onClose();
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre={avenant ? "Modifier l'avenant" : 'Nouvel avenant'}
      description="Le montant de l'avenant s'ajoute au montant contractuel du projet."
      onSubmit={handleSubmit(onSubmit)}
      enCours={enCours}
      libelleValider={avenant ? 'Enregistrer' : "Créer l'avenant"}
      largeur="lg"
    >
      <SectionFormulaire titre="Avenant">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
          <Champ label="Référence" htmlFor="avenant-reference" requis erreur={errors.reference?.message}>
            <Input autoFocus placeholder="AV-01" {...ariaErreur('avenant-reference', errors.reference)} {...register('reference')} />
          </Champ>
          <Champ label="Date" htmlFor="avenant-date">
            <Input id="avenant-date" type="date" {...register('dateAvenant')} />
          </Champ>
        </div>
        <Champ label="Objet" htmlFor="avenant-objet" requis erreur={errors.objet?.message}>
          <Input {...ariaErreur('avenant-objet', errors.objet)} {...register('objet')} />
        </Champ>
        <Champ label="Description" htmlFor="avenant-description">
          <Textarea id="avenant-description" rows={2} {...register('description')} />
        </Champ>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Motif" htmlFor="avenant-motif">
            <Input id="avenant-motif" {...register('motif')} />
          </Champ>
          <Champ label="Montant (FCFA)" htmlFor="avenant-montant" erreur={errors.montant?.message}>
            <Input type="number" min={0} step="any" {...ariaErreur('avenant-montant', errors.montant)} {...register('montant', { setValueAs: nombreOuVide })} />
          </Champ>
        </div>
      </SectionFormulaire>

      <SectionFormulaire titre="Durée et calendrier">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Durée initiale" htmlFor="avenant-duree-initiale">
            <Input id="avenant-duree-initiale" placeholder="ex. 12 mois" {...register('dureeInitiale')} />
          </Champ>
          <Champ label="Nouvelle durée" htmlFor="avenant-nouvelle-duree">
            <Input id="avenant-nouvelle-duree" placeholder="ex. 15 mois" {...register('nouvelleDuree')} />
          </Champ>
          <Champ label="Date de début" htmlFor="avenant-debut">
            <Input id="avenant-debut" type="date" {...register('dateDebut')} />
          </Champ>
          <Champ label="Nouvelle date de fin" htmlFor="avenant-fin">
            <Input id="avenant-fin" type="date" {...register('nouvelleDateFin')} />
          </Champ>
        </div>
        <Champ label="Observations" htmlFor="avenant-observations">
          <Textarea id="avenant-observations" rows={2} {...register('observations')} />
        </Champ>
      </SectionFormulaire>

      <SectionFormulaire titre="Impact sur les livrables">
        <Controller
          name="creeNouveauxLivrables"
          control={control}
          render={({ field }) => (
            <CaseACocher checked={field.value} onChange={field.onChange}>
              Cet avenant crée de nouveaux livrables
            </CaseACocher>
          )}
        />
        <Champ label="Livrables modifiés" htmlFor="avenant-modifies">
          <Controller
            name="livrablesModifies"
            control={control}
            render={({ field }) => (
              <ListeCases id="avenant-modifies" options={optionsLivrables} valeurs={field.value} onChange={field.onChange} vide="Aucun livrable dans ce projet" />
            )}
          />
        </Champ>
        {livrablesModifies.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 pl-1">
            <Controller
              name="echeanceModifiee"
              control={control}
              render={({ field }) => (
                <CaseACocher checked={field.value} onChange={field.onChange}>
                  Échéance modifiée
                </CaseACocher>
              )}
            />
            <Controller
              name="contenuModifie"
              control={control}
              render={({ field }) => (
                <CaseACocher checked={field.value} onChange={field.onChange}>
                  Contenu modifié
                </CaseACocher>
              )}
            />
          </div>
        )}
        <Champ label="Livrables supprimés" htmlFor="avenant-supprimes">
          <Controller
            name="livrablesSupprimes"
            control={control}
            render={({ field }) => (
              <ListeCases id="avenant-supprimes" options={optionsLivrables} valeurs={field.value} onChange={field.onChange} vide="Aucun livrable dans ce projet" />
            )}
          />
        </Champ>
      </SectionFormulaire>
    </FormDialog>
  );
}
