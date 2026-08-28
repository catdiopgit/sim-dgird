import { zodResolver } from '@hookform/resolvers/zod';
import { DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useProjetMutations, useProjetsReferentiel } from '../../hooks/projets/useProjets';
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
  dateDebut: z.custom<dayjs.Dayjs | null>().optional(),
  dateFinPrevue: z.custom<dayjs.Dayjs | null>().optional(),
  budgetPrevu: z.number().optional(),
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
  dateDebut: null,
  dateFinPrevue: null,
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

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
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
            dateDebut: projet.date_debut ? dayjs(projet.date_debut) : null,
            dateFinPrevue: projet.date_fin_prevue ? dayjs(projet.date_fin_prevue) : null,
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
      date_debut: values.dateDebut ? values.dateDebut.format('YYYY-MM-DD') : null,
      date_fin_prevue: values.dateFinPrevue ? values.dateFinPrevue.format('YYYY-MM-DD') : null,
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

  const optionsUtilisateurs = (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }));

  return (
    <Modal
      open={open}
      title={projet ? 'Modifier le projet' : 'Nouveau projet'}
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={enCours}
      destroyOnHidden
      width={640}
    >
      <Form layout="vertical">
        <Form.Item label="Code" help="Identifiant court, unique dans l'organisation">
          <Controller name="code" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Nom">
          <Controller name="nom" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Description">
          <Controller
            name="description"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} />}
          />
        </Form.Item>
        <Form.Item label="Entité">
          <Controller
            name="entiteId"
            control={control}
            render={({ field }) => (
              <Select {...field} options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))} />
            )}
          />
        </Form.Item>
        <Form.Item label="Responsable">
          <Controller
            name="responsableId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={optionsUtilisateurs}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Financement">
          <Controller name="financement" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Coordonnateur">
          <Controller
            name="coordonnateurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={optionsUtilisateurs}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Lieu d'exécution">
          <Controller name="lieuExecution" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Date de début">
          <Controller
            name="dateDebut"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Date de fin prévue">
          <Controller
            name="dateFinPrevue"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Budget prévu">
          <Controller
            name="budgetPrevu"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={0} style={{ width: '100%' }} onChange={(v) => field.onChange(v ?? undefined)} />
            )}
          />
        </Form.Item>
        <Form.Item label="Statut">
          <Controller
            name="statutValeurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(referentiel?.statuts ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Priorité">
          <Controller
            name="prioriteValeurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(referentiel?.priorites ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Visibilité" help="Qui peut consulter ce projet (les entités/agents précis se choisissent ensuite depuis la fiche projet)">
          <Controller
            name="porteeVisibilite"
            control={control}
            render={({ field }) => <Select {...field} options={PORTEES_VISIBILITE} />}
          />
        </Form.Item>
        <Form.Item label="Organisme chargé de l'exécution">
          <Controller
            name="organismeExecutionType"
            control={control}
            render={({ field }) => <Select {...field} options={TYPES_ORGANISME_EXECUTION} />}
          />
        </Form.Item>
        {organismeExecutionType !== 'organisation' && (
          <Form.Item label="Nom de l'organisme">
            <Controller name="organismeExecutionNom" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
