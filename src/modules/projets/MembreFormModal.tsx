import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Modal, Select, Switch } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useProjetsReferentiel } from '../../hooks/projets/useProjets';
import { useMembreMutations } from '../../hooks/projets/useMembresProjet';

const schema = z.object({
  utilisateurId: z.string().min(1, 'Requis'),
  roleEquipeValeurId: z.string().optional(),
  peutModifier: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  projetId: string;
  onClose: () => void;
}

export function MembreFormModal({ open, organisationId, projetId, onClose }: Props) {
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: referentiel } = useProjetsReferentiel(organisationId);
  const { ajouter } = useMembreMutations(projetId);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { utilisateurId: '', roleEquipeValeurId: '', peutModifier: true },
  });

  useEffect(() => {
    if (open) reset({ utilisateurId: '', roleEquipeValeurId: '', peutModifier: true });
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    ajouter.mutate(
      {
        projet_id: projetId,
        utilisateur_id: values.utilisateurId,
        role_equipe_valeur_id: values.roleEquipeValeurId || null,
        peut_modifier: values.peutModifier,
      },
      { onSuccess: () => onClose() },
    );
  };

  const optionsUtilisateurs = (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }));

  return (
    <Modal
      open={open}
      title="Ajouter un membre"
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={ajouter.isPending}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Utilisateur">
          <Controller
            name="utilisateurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                autoFocus
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={optionsUtilisateurs}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Rôle dans l'équipe">
          <Controller
            name="roleEquipeValeurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(referentiel?.rolesEquipe ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Droit de modification" help="Un membre en lecture seule peut consulter le projet mais pas le modifier (§4)">
          <Controller
            name="peutModifier"
            control={control}
            render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
