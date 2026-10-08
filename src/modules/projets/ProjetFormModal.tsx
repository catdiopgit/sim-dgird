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
import { useProjetMutations, useProjetsReferentiel } from '../../hooks/projets/useProjets';
import { ariaErreur, nombreOuVide, versChampDate } from '../../lib/form';
import type { Projet } from '../../services/projets/projets';

const schema = z.object({
  code: z.string().min(1, 'Requis'),
  nom: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  entiteId: z.string().min(1, 'Requis'),
  responsableId: z.string().optional(),
  financement: z.string().optional(),
  coordonnateurId: z.string().optional(),
  lieuExecution: z.string().optional(),
  dateDebut: z.string().optional(),
  dateFinPrevue: z.string().optional(),
  budgetPrevu: z.number().min(0, 'Montant invalide').optional(),
  statutValeurId: z.string().optional(),
  prioriteValeurId: z.string().optional(),
  organismeExecutionType: z.enum(['organisation', 'consultant', 'entreprise', 'externe']),
  organismeExecutionNom: z.string().optional(),
  porteeVisibilite: z.enum(['membres', 'entites', 'agents', 'tous']),
});
type FormValues = z.infer<typeof schema>;

const PORTEES_VISIBILITE: { value: FormValues['porteeVisibilite']; label: string }[] = [
  { value: 'membres', label: 'Membres du projet uniquement' },
  { value: 'entites', label: "Agents d'une ou plusieurs entités" },
  { value: 'agents', label: 'Agents spécifiques' },
  { value: 'tous', label: 'Tout le monde (organisation)' },
];

const TYPES_ORGANISME_EXECUTION: { value: FormValues['organismeExecutionType']; label: string }[] = [
  { value: 'organisation', label: "L'organisation elle-même" },
  { value: 'consultant', label: 'Consultant' },
  { value: 'entreprise', label: 'Entreprise' },
  { value: 'externe', label: 'Autre organisme externe' },
];

interface Props {
  open: boolean;
  organisationId: string;
  projet?: Projet | null;
  onClose: () => void;
  onCree?: (projet: Projet) => void;
}

const DEFAUTS: FormValues = {
  code: '',
  nom: '',
  description: '',
  entiteId: '',
  responsableId: '',
  financement: '',
  coordonnateurId: '',
  lieuExecution: '',
  dateDebut: '',
  dateFinPrevue: '',
  budgetPrevu: undefined,
  statutValeurId: '',
  prioriteValeurId: '',
  organismeExecutionType: 'organisation',
  organismeExecutionNom: '',
  porteeVisibilite: 'membres',
};

export function ProjetFormModal({ open, organisationId, projet, onClose, onCree }: Props) {
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: referentiel } = useProjetsReferentiel(organisationId);
  const { create, update } = useProjetMutations(organisationId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAUTS,
  });
  const organismeExecutionType = watch('organismeExecutionType');

  useEffect(() => {
    if (!open) return;
    reset(
      projet
        ? {
            code: projet.code,
            nom: projet.nom,
            description: projet.description ?? '',
            entiteId: projet.entite_id,
            responsableId: projet.responsable_id ?? '',
            financement: projet.financement ?? '',
            coordonnateurId: projet.coordonnateur_id ?? '',
            lieuExecution: projet.lieu_execution ?? '',
            dateDebut: versChampDate(projet.date_debut),
            dateFinPrevue: versChampDate(projet.date_fin_prevue),
            budgetPrevu: projet.budget_prevu ?? undefined,
            statutValeurId: projet.statut_valeur_id ?? '',
            prioriteValeurId: projet.priorite_valeur_id ?? '',
            organismeExecutionType: projet.organisme_execution_type,
            organismeExecutionNom: projet.organisme_execution_nom ?? '',
            porteeVisibilite: projet.portee_visibilite,
          }
        : DEFAUTS,
    );
  }, [open, projet, reset]);

  const enCours = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    const patch = {
      code: values.code,
      nom: values.nom,
      description: values.description || null,
      entite_id: values.entiteId,
      responsable_id: values.responsableId || null,
      financement: values.financement || null,
      coordonnateur_id: values.coordonnateurId || null,
      lieu_execution: values.lieuExecution || null,
      date_debut: values.dateDebut || null,
      date_fin_prevue: values.dateFinPrevue || null,
      budget_prevu: values.budgetPrevu ?? null,
      statut_valeur_id: values.statutValeurId || null,
      priorite_valeur_id: values.prioriteValeurId || null,
      organisme_execution_type: values.organismeExecutionType,
      organisme_execution_nom: values.organismeExecutionType === 'organisation' ? null : values.organismeExecutionNom || null,
      portee_visibilite: values.porteeVisibilite,
    };
    if (projet) {
      update.mutate({ id: projet.id, patch }, { onSuccess: () => onClose() });
    } else {
      create.mutate(
        { ...patch, organisation_id: organisationId },
        {
          onSuccess: (nouveauProjet) => {
            onCree?.(nouveauProjet);
            onClose();
          },
        },
      );
    }
  };

  const optionsUtilisateurs = (utilisateurs ?? []).map((u) => (
    <option key={u.id} value={u.id}>
      {u.prenom} {u.nom}
    </option>
  ));

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre={projet ? 'Modifier le projet' : 'Nouveau projet'}
      description={projet ? `${projet.code} — ${projet.nom}` : "L'avancement se calculera automatiquement à partir des livrables."}
      onSubmit={handleSubmit(onSubmit)}
      enCours={enCours}
      libelleValider={projet ? 'Enregistrer' : 'Créer le projet'}
      largeur="lg"
    >
      <SectionFormulaire titre="Identification">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
          <Champ label="Code" htmlFor="projet-code" requis aide="Unique dans l'organisation" erreur={errors.code?.message}>
            <Input autoFocus placeholder="PRJ-2026-…" {...ariaErreur('projet-code', errors.code)} {...register('code')} />
          </Champ>
          <Champ label="Nom" htmlFor="projet-nom" requis erreur={errors.nom?.message}>
            <Input {...ariaErreur('projet-nom', errors.nom)} {...register('nom')} />
          </Champ>
        </div>
        <Champ label="Description" htmlFor="projet-description">
          <Textarea id="projet-description" rows={2} {...register('description')} />
        </Champ>
      </SectionFormulaire>

      <SectionFormulaire titre="Pilotage">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Entité porteuse" htmlFor="projet-entite" requis erreur={errors.entiteId?.message}>
            <NativeSelect {...ariaErreur('projet-entite', errors.entiteId)} {...register('entiteId')}>
              <option value="">Sélectionner une entité</option>
              {(entites ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.sigle ? `${e.sigle} — ${e.libelle}` : e.libelle}
                </option>
              ))}
            </NativeSelect>
          </Champ>
          <Champ label="Responsable" htmlFor="projet-responsable">
            <NativeSelect id="projet-responsable" {...register('responsableId')}>
              <option value="">—</option>
              {optionsUtilisateurs}
            </NativeSelect>
          </Champ>
          <Champ label="Coordonnateur" htmlFor="projet-coordonnateur">
            <NativeSelect id="projet-coordonnateur" {...register('coordonnateurId')}>
              <option value="">—</option>
              {optionsUtilisateurs}
            </NativeSelect>
          </Champ>
          <Champ label="Statut" htmlFor="projet-statut">
            <NativeSelect id="projet-statut" {...register('statutValeurId')}>
              <option value="">—</option>
              {(referentiel?.statuts ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.libelle}
                </option>
              ))}
            </NativeSelect>
          </Champ>
          <Champ label="Priorité" htmlFor="projet-priorite">
            <NativeSelect id="projet-priorite" {...register('prioriteValeurId')}>
              <option value="">—</option>
              {(referentiel?.priorites ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.libelle}
                </option>
              ))}
            </NativeSelect>
          </Champ>
        </div>
      </SectionFormulaire>

      <SectionFormulaire titre="Calendrier et financement">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Date de début" htmlFor="projet-debut">
            <Input id="projet-debut" type="date" {...register('dateDebut')} />
          </Champ>
          <Champ label="Date de fin prévue" htmlFor="projet-fin">
            <Input id="projet-fin" type="date" {...register('dateFinPrevue')} />
          </Champ>
          <Champ label="Budget prévu (FCFA)" htmlFor="projet-budget" erreur={errors.budgetPrevu?.message}>
            <Input
              type="number"
              min={0}
              step="any"
              {...ariaErreur('projet-budget', errors.budgetPrevu)}
              {...register('budgetPrevu', { setValueAs: nombreOuVide })}
            />
          </Champ>
          <Champ label="Financement" htmlFor="projet-financement">
            <Input id="projet-financement" placeholder="Bailleur, budget de l'État…" {...register('financement')} />
          </Champ>
          <Champ label="Lieu d'exécution" htmlFor="projet-lieu" className="sm:col-span-2">
            <Input id="projet-lieu" {...register('lieuExecution')} />
          </Champ>
        </div>
      </SectionFormulaire>

      <SectionFormulaire titre="Exécution et visibilité">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Organisme chargé de l'exécution" htmlFor="projet-organisme">
            <NativeSelect id="projet-organisme" {...register('organismeExecutionType')}>
              {TYPES_ORGANISME_EXECUTION.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </Champ>
          {organismeExecutionType !== 'organisation' && (
            <Champ label="Nom de l'organisme" htmlFor="projet-organisme-nom">
              <Input id="projet-organisme-nom" {...register('organismeExecutionNom')} />
            </Champ>
          )}
          <Champ
            label="Visibilité"
            htmlFor="projet-visibilite"
            className="sm:col-span-2"
            aide="Les entités ou agents précis se choisissent ensuite depuis la fiche projet."
          >
            <NativeSelect id="projet-visibilite" {...register('porteeVisibilite')}>
              {PORTEES_VISIBILITE.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </Champ>
        </div>
      </SectionFormulaire>
    </FormDialog>
  );
}
