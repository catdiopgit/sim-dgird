import { zodResolver } from '@hookform/resolvers/zod';
import { DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useMarcheMutations } from '../../hooks/marches/useMarches';
import { useTypesMarche } from '../../hooks/marches/useTypesMarche';
import type { Marche } from '../../services/marches/marches';

const schema = z.object({
  reference: z.string().min(1, 'Requis'),
  objet: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  entiteId: z.string().min(1, 'Requis'),
  typeMarcheId: z.string().min(1, 'Requis'),
  responsableId: z.string().optional(),
  dateDebutPrevue: z.custom<dayjs.Dayjs | null>().optional(),
  dateFinPrevue: z.custom<dayjs.Dayjs | null>().optional(),
  montantEstimatif: z.number().optional(),
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
  dateDebutPrevue: null,
  dateFinPrevue: null,
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

  const { control, handleSubmit, reset } = useForm<FormValues>({
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
            dateDebutPrevue: marche.date_debut_prevue ? dayjs(marche.date_debut_prevue) : null,
            dateFinPrevue: marche.date_fin_prevue ? dayjs(marche.date_fin_prevue) : null,
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
      date_debut_prevue: values.dateDebutPrevue ? values.dateDebutPrevue.format('YYYY-MM-DD') : null,
      date_fin_prevue: values.dateFinPrevue ? values.dateFinPrevue.format('YYYY-MM-DD') : null,
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

  const optionsUtilisateurs = (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }));

  return (
    <Modal
      open={open}
      title={marche ? 'Modifier le marché' : 'Nouveau marché'}
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={enCours}
      destroyOnHidden
      width={640}
    >
      <Form layout="vertical">
        <Form.Item label="Référence">
          <Controller name="reference" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Objet">
          <Controller name="objet" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Description">
          <Controller name="description" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} />} />
        </Form.Item>
        <Form.Item label="Type de marché">
          <Controller
            name="typeMarcheId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                disabled={Boolean(marche)}
                options={(types ?? []).filter((t) => t.actif || t.id === marche?.type_marche_id).map((t) => ({ value: t.id, label: t.libelle }))}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Entité porteuse">
          <Controller
            name="entiteId"
            control={control}
            render={({ field }) => (
              <Select {...field} options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))} />
            )}
          />
        </Form.Item>
        <Form.Item label="Responsable / agent chargé du marché">
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
        <Form.Item
          label="Date de début prévisionnelle"
          help="Déclenche la planification automatique des phases dès qu'elle est renseignée"
        >
          <Controller
            name="dateDebutPrevue"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Date de fin prévisionnelle" help="Calculée automatiquement après planification, modifiable si besoin">
          <Controller
            name="dateFinPrevue"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Montant estimatif">
          <Controller
            name="montantEstimatif"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={0} style={{ width: '100%' }} onChange={(v) => field.onChange(v ?? undefined)} />
            )}
          />
        </Form.Item>
        <Form.Item label="Observations">
          <Controller name="observations" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} />} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
