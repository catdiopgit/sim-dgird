import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAvenantLivrables, useAvenantMutations } from '../../hooks/projets/useAvenants';
import { useLivrables } from '../../hooks/projets/useLivrables';
import { definirAvenantLivrables } from '../../services/projets/avenants';
import type { Avenant } from '../../services/projets/avenants';

const schema = z.object({
  reference: z.string().min(1, 'Requis'),
  dateAvenant: z.custom<dayjs.Dayjs | null>().optional(),
  objet: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  motif: z.string().optional(),
  montant: z.number().optional(),
  dureeInitiale: z.string().optional(),
  nouvelleDuree: z.string().optional(),
  dateDebut: z.custom<dayjs.Dayjs | null>().optional(),
  nouvelleDateFin: z.custom<dayjs.Dayjs | null>().optional(),
  observations: z.string().optional(),
  creeNouveauxLivrables: z.boolean(),
  livrablesModifies: z.array(z.string()),
  echeanceModifiee: z.boolean(),
  contenuModifie: z.boolean(),
  livrablesSupprimes: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

const DEFAUTS: FormValues = {
  reference: '',
  dateAvenant: dayjs(),
  objet: '',
  description: '',
  motif: '',
  montant: undefined,
  dureeInitiale: '',
  nouvelleDuree: '',
  dateDebut: null,
  nouvelleDateFin: null,
  observations: '',
  creeNouveauxLivrables: false,
  livrablesModifies: [],
  echeanceModifiee: false,
  contenuModifie: false,
  livrablesSupprimes: [],
};

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

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAUTS,
  });

  const optionsLivrables = useMemo(() => (livrables ?? []).map((l) => ({ value: l.id, label: l.nom })), [livrables]);

  useEffect(() => {
    if (!open) return;
    if (avenant) {
      reset({
        reference: avenant.reference,
        dateAvenant: avenant.date_avenant ? dayjs(avenant.date_avenant) : null,
        objet: avenant.objet,
        description: avenant.description ?? '',
        motif: avenant.motif ?? '',
        montant: avenant.montant ?? undefined,
        dureeInitiale: avenant.duree_initiale ?? '',
        nouvelleDuree: avenant.nouvelle_duree ?? '',
        dateDebut: avenant.date_debut ? dayjs(avenant.date_debut) : null,
        nouvelleDateFin: avenant.nouvelle_date_fin ? dayjs(avenant.nouvelle_date_fin) : null,
        observations: avenant.observations ?? '',
        creeNouveauxLivrables: (impacts ?? []).some((i) => i.type_impact === 'cree'),
        livrablesModifies: (impacts ?? []).filter((i) => i.type_impact === 'modifie' && i.livrable_id).map((i) => i.livrable_id!),
        echeanceModifiee: (impacts ?? []).some((i) => i.type_impact === 'modifie' && i.echeance_modifiee),
        contenuModifie: (impacts ?? []).some((i) => i.type_impact === 'modifie' && i.contenu_modifie),
        livrablesSupprimes: (impacts ?? []).filter((i) => i.type_impact === 'supprime' && i.livrable_id).map((i) => i.livrable_id!),
      });
    } else {
      reset(DEFAUTS);
    }
    // impacts n'arrive qu'après le premier rendu (requête async) — se
    // resynchronise volontairement quand la liste change pour un avenant existant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, avenant, impacts, reset]);

  const enCours = create.isPending || update.isPending;

  const onSubmit = async (values: FormValues) => {
    const patch = {
      reference: values.reference,
      date_avenant: values.dateAvenant ? values.dateAvenant.format('YYYY-MM-DD') : undefined,
      objet: values.objet,
      description: values.description || null,
      motif: values.motif || null,
      montant: values.montant ?? null,
      duree_initiale: values.dureeInitiale || null,
      nouvelle_duree: values.nouvelleDuree || null,
      date_debut: values.dateDebut ? values.dateDebut.format('YYYY-MM-DD') : null,
      nouvelle_date_fin: values.nouvelleDateFin ? values.nouvelleDateFin.format('YYYY-MM-DD') : null,
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
    <Modal
      open={open}
      title={avenant ? "Modifier l'avenant" : 'Nouvel avenant'}
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
        <Form.Item label="Date">
          <Controller
            name="dateAvenant"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Objet">
          <Controller name="objet" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Description">
          <Controller
            name="description"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} />}
          />
        </Form.Item>
        <Form.Item label="Motif">
          <Controller name="motif" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Montant">
          <Controller
            name="montant"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={0} style={{ width: '100%' }} onChange={(v) => field.onChange(v ?? undefined)} />
            )}
          />
        </Form.Item>
        <Form.Item label="Durée initiale">
          <Controller name="dureeInitiale" control={control} render={({ field }) => <Input {...field} placeholder="ex. 12 mois" />} />
        </Form.Item>
        <Form.Item label="Nouvelle durée">
          <Controller name="nouvelleDuree" control={control} render={({ field }) => <Input {...field} placeholder="ex. 15 mois" />} />
        </Form.Item>
        <Form.Item label="Date de début">
          <Controller
            name="dateDebut"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Nouvelle date de fin">
          <Controller
            name="nouvelleDateFin"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Observations">
          <Controller
            name="observations"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} />}
          />
        </Form.Item>

        <Form.Item>
          <Controller
            name="creeNouveauxLivrables"
            control={control}
            render={({ field }) => (
              <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)}>
                Cet avenant crée de nouveaux livrables
              </Checkbox>
            )}
          />
        </Form.Item>
        <Form.Item label="Livrables modifiés par cet avenant">
          <Controller
            name="livrablesModifies"
            control={control}
            render={({ field }) => <Select {...field} mode="multiple" allowClear options={optionsLivrables} />}
          />
        </Form.Item>
        <Form.Item>
          <Controller
            name="echeanceModifiee"
            control={control}
            render={({ field }) => (
              <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} style={{ marginRight: 16 }}>
                Échéance modifiée
              </Checkbox>
            )}
          />
          <Controller
            name="contenuModifie"
            control={control}
            render={({ field }) => (
              <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)}>
                Contenu modifié
              </Checkbox>
            )}
          />
        </Form.Item>
        <Form.Item label="Livrables supprimés par cet avenant">
          <Controller
            name="livrablesSupprimes"
            control={control}
            render={({ field }) => <Select {...field} mode="multiple" allowClear options={optionsLivrables} />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
