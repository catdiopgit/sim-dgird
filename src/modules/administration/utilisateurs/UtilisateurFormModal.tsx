import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, Modal, Select, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreerUtilisateur, useUpdateUtilisateur } from '../../../hooks/administration/useUtilisateurs';
import type { Entite } from '../../../services/administration/entites';
import type { Fonction } from '../../../services/administration/fonctions';
import type { CreerUtilisateurResultat, Utilisateur } from '../../../services/administration/utilisateurs';

const schema = z.object({
  email: z.string().min(1, 'Requis').email('Email invalide'),
  nom: z.string().min(1, 'Requis'),
  prenom: z.string().min(1, 'Requis'),
  entiteId: z.string().optional(),
  fonctionId: z.string().optional(),
  matricule: z.string().optional(),
  telephone: z.string().optional(),
  statut: z.enum(['actif', 'inactif', 'suspendu']),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  utilisateur?: Utilisateur;
  organisationId: string;
  entites: Entite[];
  fonctions: Fonction[];
  onClose: () => void;
}

export function UtilisateurFormModal({ open, utilisateur, organisationId, entites, fonctions, onClose }: Props) {
  const estModification = Boolean(utilisateur);
  const creer = useCreerUtilisateur(organisationId);
  const modifier = useUpdateUtilisateur(organisationId);
  const [resultatCreation, setResultatCreation] = useState<CreerUtilisateurResultat | null>(null);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      nom: '',
      prenom: '',
      entiteId: '',
      fonctionId: '',
      matricule: '',
      telephone: '',
      statut: 'actif',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        email: utilisateur?.email ?? '',
        nom: utilisateur?.nom ?? '',
        prenom: utilisateur?.prenom ?? '',
        entiteId: utilisateur?.entite_id ?? '',
        fonctionId: utilisateur?.fonction_id ?? '',
        matricule: utilisateur?.matricule ?? '',
        telephone: utilisateur?.telephone ?? '',
        statut: (utilisateur?.statut as FormValues['statut']) ?? 'actif',
      });
      setResultatCreation(null);
    }
  }, [open, utilisateur, reset]);

  const onSubmit = (values: FormValues) => {
    if (estModification && utilisateur) {
      modifier.mutate(
        {
          id: utilisateur.id,
          patch: {
            nom: values.nom,
            prenom: values.prenom,
            entite_id: values.entiteId || null,
            fonction_id: values.fonctionId || null,
            matricule: values.matricule || null,
            telephone: values.telephone || null,
            statut: values.statut,
          },
        },
        { onSuccess: () => onClose() },
      );
    } else {
      creer.mutate(
        {
          email: values.email,
          nom: values.nom,
          prenom: values.prenom,
          entiteId: values.entiteId || null,
          fonctionId: values.fonctionId || null,
          matricule: values.matricule || null,
          telephone: values.telephone || null,
        },
        { onSuccess: (resultat) => setResultatCreation(resultat) },
      );
    }
  };

  if (resultatCreation) {
    return (
      <Modal open={open} title="Utilisateur créé" onCancel={onClose} footer={<Button onClick={onClose}>Fermer</Button>}>
        <Alert
          type="success"
          showIcon
          message="Compte créé avec succès"
          description="Communiquez ces identifiants à l'utilisateur — le mot de passe ne sera plus affiché ensuite."
          style={{ marginBottom: 16 }}
        />
        <Typography.Paragraph>
          <strong>Email :</strong> {resultatCreation.email}
        </Typography.Paragraph>
        <Typography.Paragraph copyable={{ text: resultatCreation.motDePasseTemporaire }}>
          <strong>Mot de passe temporaire :</strong> {resultatCreation.motDePasseTemporaire}
        </Typography.Paragraph>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      title={estModification ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
      onCancel={onClose}
      onOk={handleSubmit(onSubmit, () => message.error('Veuillez corriger le formulaire.'))}
      confirmLoading={creer.isPending || modifier.isPending}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Email">
          <Controller
            name="email"
            control={control}
            render={({ field }) => <Input {...field} disabled={estModification} autoFocus />}
          />
        </Form.Item>
        <Form.Item label="Prénom">
          <Controller name="prenom" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Nom">
          <Controller name="nom" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Entité">
          <Controller
            name="entiteId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                placeholder="Aucune"
                options={entites.map((e) => ({ value: e.id, label: e.libelle }))}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Fonction">
          <Controller
            name="fonctionId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                placeholder="Aucune"
                options={fonctions.map((f) => ({ value: f.id, label: f.libelle }))}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Matricule">
          <Controller name="matricule" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item label="Téléphone">
          <Controller name="telephone" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        {estModification && (
          <Form.Item label="Statut">
            <Controller
              name="statut"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={[
                    { value: 'actif', label: 'Actif' },
                    { value: 'inactif', label: 'Inactif' },
                    { value: 'suspendu', label: 'Suspendu' },
                  ]}
                />
              )}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
