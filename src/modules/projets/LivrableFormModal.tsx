import { zodResolver } from '@hookform/resolvers/zod';
import { DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useContactsExecution } from '../../hooks/projets/useContactsExecution';
import { useLivrableMutations } from '../../hooks/projets/useLivrables';
import { useMembresProjet } from '../../hooks/projets/useMembresProjet';
import { useProjetsReferentiel } from '../../hooks/projets/useProjets';
import type { Livrable } from '../../services/projets/livrables';

const schema = z.object({
  nom: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  responsable: z.string().optional(),
  poidsPct: z.number().min(0).max(100),
  datePrevue: z.custom<dayjs.Dayjs | null>().optional(),
  dateRemise: z.custom<dayjs.Dayjs | null>().optional(),
  statutValeurId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  projetId: string;
  livrable?: Livrable | null;
  onClose: () => void;
}

const VIDE: FormValues = {
  nom: '',
  description: '',
  responsable: '',
  poidsPct: 0,
  datePrevue: null,
  dateRemise: null,
  statutValeurId: '',
};

// Le responsable d'un livrable est soit un membre du projet, soit un contact
// de l'organisme d'exécution (§4) — encodé en une seule valeur de select
// préfixée ("membre:<id>" / "contact:<id>") pour n'avoir qu'un seul champ,
// décodée à la soumission vers responsable_utilisateur_id/responsable_contact_id.
export function LivrableFormModal({ open, organisationId, projetId, livrable, onClose }: Props) {
  const { data: membres } = useMembresProjet(projetId);
  const { data: contacts } = useContactsExecution(projetId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: referentiel } = useProjetsReferentiel(organisationId);
  const { create, update } = useLivrableMutations(projetId);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  });

  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  const optionsResponsable = useMemo(
    () => [
      {
        label: 'Membres du projet',
        options: (membres ?? []).map((m) => ({
          value: `membre:${m.utilisateur_id}`,
          label: utilisateurParId.get(m.utilisateur_id) ?? m.utilisateur_id,
        })),
      },
      {
        label: "Contacts d'exécution",
        options: (contacts ?? []).map((c) => ({ value: `contact:${c.id}`, label: c.nom })),
      },
    ],
    [membres, contacts, utilisateurParId],
  );

  useEffect(() => {
    if (!open) return;
    reset(
      livrable
        ? {
            nom: livrable.nom,
            description: livrable.description ?? '',
            responsable: livrable.responsable_utilisateur_id
              ? `membre:${livrable.responsable_utilisateur_id}`
              : livrable.responsable_contact_id
                ? `contact:${livrable.responsable_contact_id}`
                : '',
            poidsPct: livrable.poids_pct,
            datePrevue: livrable.date_prevue ? dayjs(livrable.date_prevue) : null,
            dateRemise: livrable.date_remise ? dayjs(livrable.date_remise) : null,
            statutValeurId: livrable.statut_valeur_id ?? '',
          }
        : VIDE,
    );
  }, [open, livrable, reset]);

  const enCours = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    const [type, id] = values.responsable ? values.responsable.split(':') : [null, null];
    const patch = {
      nom: values.nom,
      description: values.description || null,
      responsable_utilisateur_id: type === 'membre' ? id : null,
      responsable_contact_id: type === 'contact' ? id : null,
      poids_pct: values.poidsPct,
      date_prevue: values.datePrevue ? values.datePrevue.format('YYYY-MM-DD') : null,
      date_remise: values.dateRemise ? values.dateRemise.format('YYYY-MM-DD') : null,
      statut_valeur_id: values.statutValeurId || null,
    };
    if (livrable) {
      update.mutate({ id: livrable.id, patch }, { onSuccess: () => onClose() });
    } else {
      create.mutate({ ...patch, projet_id: projetId }, { onSuccess: () => onClose() });
    }
  };

  return (
    <Modal
      open={open}
      title={livrable ? 'Modifier le livrable' : 'Nouveau livrable'}
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={enCours}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Nom">
          <Controller name="nom" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Description">
          <Controller
            name="description"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} />}
          />
        </Form.Item>
        <Form.Item label="Responsable" help="Membre du projet ou contact de l'organisme d'exécution">
          <Controller
            name="responsable"
            control={control}
            render={({ field }) => (
              <Select {...field} allowClear showSearch optionFilterProp="label" options={optionsResponsable} />
            )}
          />
        </Form.Item>
        <Form.Item label="Poids (%)" help="Quote-part de ce livrable dans l'avancement global du projet">
          <Controller
            name="poidsPct"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={0} max={100} style={{ width: '100%' }} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Form.Item>
        <Form.Item label="Date prévue">
          <Controller
            name="datePrevue"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Date de remise">
          <Controller
            name="dateRemise"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
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
                options={(referentiel?.statutsLivrable ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
