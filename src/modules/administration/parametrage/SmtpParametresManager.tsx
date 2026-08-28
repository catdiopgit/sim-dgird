import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Form, Input, InputNumber, Select, Skeleton, Switch, Typography } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useDefinirParametresSmtp, useParametresSmtp } from '../../../hooks/administration/useSmtp';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

const schema = z.object({
  hote: z.string().min(1, 'Requis'),
  port: z.coerce.number().int().min(1).max(65535),
  securite: z.enum(['none', 'tls', 'ssl']),
  utilisateur: z.string().min(1, 'Requis'),
  motDePasse: z.string().optional(),
  adresseExpediteur: z.string().email('Email invalide'),
  nomExpediteur: z.string().optional(),
  actif: z.boolean(),
});
type FormValues = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

const DEFAUTS: FormInput = {
  hote: '',
  port: 587,
  securite: 'tls',
  utilisateur: '',
  motDePasse: '',
  adresseExpediteur: '',
  nomExpediteur: '',
  actif: true,
};

// Compte SMTP utilisé pour envoyer les notifications par email générées par
// le moteur de workflow (public.notifications, cf. app.fn_notifier_transition
// et app.fn_notifier_destinataires_courrier) — livraison effectuée par
// l'Edge Function envoyer-notifications-email. Le mot de passe n'est jamais
// relu depuis le client (privilège colonne retiré, migration 0052) : le
// champ reste vide au chargement, "laisser vide" conserve l'existant.
export function SmtpParametresManager({ organisationId, peutModifier }: Props) {
  const { data: parametres, isLoading } = useParametresSmtp(organisationId);
  const definir = useDefinirParametresSmtp(organisationId);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAUTS,
  });

  useEffect(() => {
    if (parametres) {
      reset({
        hote: parametres.hote,
        port: parametres.port,
        securite: parametres.securite as FormValues['securite'],
        utilisateur: parametres.utilisateur,
        motDePasse: '',
        adresseExpediteur: parametres.adresse_expediteur,
        nomExpediteur: parametres.nom_expediteur ?? '',
        actif: parametres.actif,
      });
    } else {
      reset(DEFAUTS);
    }
  }, [parametres, reset]);

  const onSubmit = (values: FormValues) => {
    definir.mutate({
      p_hote: values.hote,
      p_port: values.port,
      p_securite: values.securite,
      p_utilisateur: values.utilisateur,
      p_mot_de_passe: values.motDePasse || null,
      p_adresse_expediteur: values.adresseExpediteur,
      p_nom_expediteur: values.nomExpediteur || null,
      p_actif: values.actif,
    });
  };

  if (isLoading) return <Skeleton active />;

  return (
    <Card>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        Notifications par email (SMTP)
      </Typography.Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, maxWidth: 640 }}
        message="Compte utilisé pour l'envoi des notifications"
        description="Chaque notification déjà générée par l'application (traitement, imputation, décharge, retard…) est envoyée par email via ce compte, en plus de la notification affichée dans l'application. L'envoi effectif se fait par lots périodiques, pas instantanément."
      />
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Form.Item label="Hôte SMTP" validateStatus={errors.hote ? 'error' : ''} help={errors.hote?.message}>
          <Controller
            name="hote"
            control={control}
            render={({ field }) => (
              <Input {...field} disabled={!peutModifier} placeholder="smtp.example.com" style={{ maxWidth: 360 }} />
            )}
          />
        </Form.Item>
        <Form.Item label="Port" validateStatus={errors.port ? 'error' : ''} help={errors.port?.message}>
          <Controller
            name="port"
            control={control}
            render={({ field }) => <InputNumber {...field} disabled={!peutModifier} min={1} max={65535} style={{ width: 160 }} />}
          />
        </Form.Item>
        <Form.Item label="Sécurité">
          <Controller
            name="securite"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                disabled={!peutModifier}
                style={{ width: 220 }}
                options={[
                  { value: 'none', label: 'Aucune' },
                  { value: 'tls', label: 'STARTTLS' },
                  { value: 'ssl', label: 'SSL/TLS implicite' },
                ]}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Utilisateur" validateStatus={errors.utilisateur ? 'error' : ''} help={errors.utilisateur?.message}>
          <Controller
            name="utilisateur"
            control={control}
            render={({ field }) => <Input {...field} disabled={!peutModifier} style={{ maxWidth: 360 }} />}
          />
        </Form.Item>
        <Form.Item label="Mot de passe">
          <Controller
            name="motDePasse"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                disabled={!peutModifier}
                placeholder={parametres ? 'Laisser vide pour conserver le mot de passe actuel' : ''}
                style={{ maxWidth: 360 }}
              />
            )}
          />
        </Form.Item>
        <Form.Item
          label="Adresse d'expédition"
          validateStatus={errors.adresseExpediteur ? 'error' : ''}
          help={errors.adresseExpediteur?.message}
        >
          <Controller
            name="adresseExpediteur"
            control={control}
            render={({ field }) => (
              <Input {...field} disabled={!peutModifier} placeholder="notifications@example.com" style={{ maxWidth: 360 }} />
            )}
          />
        </Form.Item>
        <Form.Item label="Nom d'expéditeur">
          <Controller
            name="nomExpediteur"
            control={control}
            render={({ field }) => <Input {...field} disabled={!peutModifier} style={{ maxWidth: 360 }} />}
          />
        </Form.Item>
        <Form.Item label="Actif">
          <Controller
            name="actif"
            control={control}
            render={({ field }) => <Switch checked={field.value} onChange={field.onChange} disabled={!peutModifier} />}
          />
        </Form.Item>

        {peutModifier && (
          <Button type="primary" htmlType="submit" loading={definir.isPending} disabled={!isDirty}>
            Enregistrer
          </Button>
        )}
      </Form>
    </Card>
  );
}
