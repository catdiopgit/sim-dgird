import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../../components/form/champ';
import { ChampImage } from '../../../components/form/champ-image';
import { Button } from '../../../components/ui/button';
import { Input, Textarea } from '../../../components/ui/input';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { useProfile } from '../../../hooks/useProfile';
import {
  useOrganisation,
  useUpdateOrganisation,
  useUploadOrganisationImage,
} from '../../../hooks/administration/useOrganisation';
import { ariaErreur } from '../../../lib/form';
import { DEFAULT_BRAND_COLOR } from '../../../theme/couleurMarque';
import { EntitesTree } from './EntitesTree';
import { FonctionsManager } from './FonctionsManager';
import { TypeEntitesManager } from './TypeEntitesManager';

const schema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  logo_url: z.string().url('URL invalide').optional().or(z.literal('')),
  couleur_primaire: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format #RRGGBB)'),
});

type FormValues = z.infer<typeof schema>;

export function OrganisationTab() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: organisation, isLoading } = useOrganisation(organisationId);
  const updateMutation = useUpdateOrganisation(organisationId);
  const uploadImage = useUploadOrganisationImage(organisationId);
  const peutModifier = can('administration', 'modifier');

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', nom: '', description: '', logo_url: '', couleur_primaire: DEFAULT_BRAND_COLOR },
  });
  const logoUrl = watch('logo_url');

  useEffect(() => {
    if (organisation) {
      reset({
        code: organisation.code,
        nom: organisation.nom,
        description: organisation.description ?? '',
        logo_url: organisation.logo_url ?? '',
        couleur_primaire: organisation.couleur_primaire ?? DEFAULT_BRAND_COLOR,
      });
    }
  }, [organisation, reset]);

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate({
      code: values.code,
      nom: values.nom,
      description: values.description || null,
      logo_url: values.logo_url || null,
      couleur_primaire: values.couleur_primaire,
    });
  };

  if (isLoading || !organisationId) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-10">
      <section className="max-w-2xl">
        <EnTeteSection titre="Informations générales" description="Identité de l'organisation, reprise sur la page de connexion et les documents imprimés." />
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <fieldset disabled={!peutModifier} className="space-y-4">
            <legend className="sr-only">Informations générales</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
              <Champ label="Code" htmlFor="organisation-code" requis erreur={errors.code?.message}>
                <Input className="font-mono" {...ariaErreur('organisation-code', errors.code)} {...register('code')} />
              </Champ>
              <Champ label="Nom" htmlFor="organisation-nom" requis erreur={errors.nom?.message}>
                <Input {...ariaErreur('organisation-nom', errors.nom)} {...register('nom')} />
              </Champ>
            </div>
            <Champ label="Description" htmlFor="organisation-description">
              <Textarea id="organisation-description" rows={3} {...register('description')} />
            </Champ>
            <Champ label="Logo" htmlFor="organisation-logo" erreur={errors.logo_url?.message}>
              <ChampImage
                id="organisation-logo"
                url={logoUrl || null}
                desactive={!peutModifier}
                enCours={uploadImage.isPending}
                onFichier={(file) =>
                  uploadImage.mutate(file, {
                    onSuccess: (url) => setValue('logo_url', url, { shouldDirty: true }),
                  })
                }
              />
            </Champ>
            <Champ
              label="Couleur principale"
              htmlFor="organisation-couleur"
              erreur={errors.couleur_primaire?.message}
              aide="Couleur institutionnelle appliquée à toute l'application, y compris la page de connexion."
            >
              <Controller
                name="couleur_primaire"
                control={control}
                render={({ field }) => {
                  const valide = /^#[0-9a-fA-F]{6}$/.test(field.value);
                  return (
                    <div className="flex items-center gap-2">
                      <label
                        className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border"
                        style={{ background: valide ? field.value : 'transparent' }}
                        title="Choisir une couleur"
                      >
                        <input
                          type="color"
                          aria-label="Sélecteur de couleur"
                          className="absolute inset-0 cursor-pointer opacity-0"
                          value={valide ? field.value : DEFAULT_BRAND_COLOR}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </label>
                      <Input
                        className="w-32 font-mono uppercase"
                        maxLength={7}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        {...ariaErreur('organisation-couleur', errors.couleur_primaire)}
                      />
                    </div>
                  );
                }}
              />
            </Champ>
          </fieldset>

          {peutModifier && (
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
                {updateMutation.isPending && <LoaderCircle className="animate-spin" />}
                Enregistrer
              </Button>
              {isDirty && <span className="text-[13px] text-muted-foreground">Modifications non enregistrées</span>}
            </div>
          )}
        </form>
      </section>

      <section className="border-t border-border pt-8">
        <TypeEntitesManager organisationId={organisationId} peutModifier={peutModifier} />
      </section>

      <section className="border-t border-border pt-8">
        <EntitesTree organisationId={organisationId} peutModifier={peutModifier} />
      </section>

      <section className="border-t border-border pt-8">
        <FonctionsManager organisationId={organisationId} peutModifier={peutModifier} />
      </section>
    </div>
  );
}
