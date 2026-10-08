import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../../components/form/champ';
import { Button } from '../../../components/ui/button';
import { Encart } from '../../../components/ui/encart';
import { Input } from '../../../components/ui/input';
import { NativeSelect } from '../../../components/ui/native-select';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { Switch } from '../../../components/ui/switch';
import { useDefinirParametresSmtp, useParametresSmtp } from '../../../hooks/administration/useSmtp';
import { ariaErreur } from '../../../lib/form';

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
    register,
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

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="max-w-2xl">
      <EnTeteSection titre="Notifications par email (SMTP)" />
      <Encart titre="Compte utilisé pour l'envoi des notifications" className="mb-5">
        Chaque notification générée par l'application (traitement, imputation, décharge, retard…) est aussi envoyée par
        email via ce compte. L'envoi se fait par lots périodiques, pas instantanément.
      </Encart>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <fieldset disabled={!peutModifier} className="space-y-4">
          <legend className="sr-only">Serveur SMTP</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px_180px]">
            <Champ label="Hôte SMTP" htmlFor="smtp-hote" requis erreur={errors.hote?.message}>
              <Input placeholder="smtp.example.com" {...ariaErreur('smtp-hote', errors.hote)} {...register('hote')} />
            </Champ>
            <Champ label="Port" htmlFor="smtp-port" requis erreur={errors.port?.message}>
              <Input type="number" min={1} max={65535} className="tabular-nums" {...ariaErreur('smtp-port', errors.port)} {...register('port')} />
            </Champ>
            <Champ label="Sécurité" htmlFor="smtp-securite">
              <NativeSelect id="smtp-securite" {...register('securite')}>
                <option value="none">Aucune</option>
                <option value="tls">STARTTLS</option>
                <option value="ssl">SSL/TLS implicite</option>
              </NativeSelect>
            </Champ>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Champ label="Utilisateur" htmlFor="smtp-utilisateur" requis erreur={errors.utilisateur?.message}>
              <Input autoComplete="off" {...ariaErreur('smtp-utilisateur', errors.utilisateur)} {...register('utilisateur')} />
            </Champ>
            <Champ
              label="Mot de passe"
              htmlFor="smtp-mot-de-passe"
              aide={parametres ? 'Laisser vide pour conserver le mot de passe actuel.' : undefined}
            >
              <Input
                id="smtp-mot-de-passe"
                type="password"
                autoComplete="new-password"
                placeholder={parametres ? '••••••••' : ''}
                {...register('motDePasse')}
              />
            </Champ>
            <Champ label="Adresse d'expédition" htmlFor="smtp-adresse" requis erreur={errors.adresseExpediteur?.message}>
              <Input
                type="email"
                placeholder="notifications@example.com"
                {...ariaErreur('smtp-adresse', errors.adresseExpediteur)}
                {...register('adresseExpediteur')}
              />
            </Champ>
            <Champ label="Nom d'expéditeur" htmlFor="smtp-nom">
              <Input id="smtp-nom" {...register('nomExpediteur')} />
            </Champ>
          </div>
          <Controller
            name="actif"
            control={control}
            render={({ field }) => (
              <label htmlFor="smtp-actif" className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <span>
                  <span className="block text-[14px] font-medium">Envoi des emails activé</span>
                  <span className="block text-[12px] text-muted-foreground">Désactivé, seules les notifications dans l'application sont produites.</span>
                </span>
                <Switch id="smtp-actif" checked={field.value} onCheckedChange={field.onChange} disabled={!peutModifier} />
              </label>
            )}
          />
        </fieldset>

        {peutModifier && (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!isDirty || definir.isPending}>
              {definir.isPending && <LoaderCircle className="animate-spin" />}
              Enregistrer
            </Button>
            {isDirty && <span className="text-[13px] text-muted-foreground">Modifications non enregistrées</span>}
          </div>
        )}
      </form>
    </div>
  );
}
