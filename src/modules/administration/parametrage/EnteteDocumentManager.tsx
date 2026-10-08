import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../../components/form/champ';
import { ChampImage } from '../../../components/form/champ-image';
import { Button } from '../../../components/ui/button';
import { Encart } from '../../../components/ui/encart';
import { Input } from '../../../components/ui/input';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { CLE_ENTETE_DOCUMENT, useEnteteDocument, type EnteteDocument } from '../../../hooks/administration/useEnteteDocument';
import { useUploadOrganisationImage } from '../../../hooks/administration/useOrganisation';
import {
  useParametreOrganisationMutations,
  useParametresOrganisation,
} from '../../../hooks/administration/useParametrage';
import type { Json } from '../../../types/database';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

const schema = z.object({
  lignes: z.array(z.object({ valeur: z.string() })),
  logoDroitUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  piedDePage: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function versFormValues(entete: EnteteDocument): FormValues {
  return {
    lignes: entete.lignesEnTete.map((valeur) => ({ valeur })),
    logoDroitUrl: entete.logoDroitUrl ?? '',
    piedDePage: entete.piedDePage ?? '',
  };
}

// En-tête des documents imprimés (fiche d'exploitation, etc.) : lignes de
// texte affichées au-dessus du nom de l'organisation (ex. "REPUBLIQUE DU
// TCHAD" / "Unité - Travail - Progrès") et logo/sceau affiché à droite —
// organisation.logo_url (Administration > Organisation) reste le logo de
// gauche, inchangé. Générique, pas de contenu figé propre à une organisation.
export function EnteteDocumentManager({ organisationId, peutModifier }: Props) {
  const { isLoading } = useParametresOrganisation(organisationId);
  const { upsert } = useParametreOrganisationMutations(organisationId);
  const uploadImage = useUploadOrganisationImage(organisationId);
  const entete = useEnteteDocument(organisationId);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: versFormValues({ lignesEnTete: [], logoDroitUrl: null, piedDePage: null }),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lignes' });
  const logoDroitUrl = watch('logoDroitUrl');

  useEffect(() => {
    reset(versFormValues(entete));
  }, [entete, reset]);

  const onSubmit = (values: FormValues) => {
    const nouvelleValeur: EnteteDocument = {
      lignesEnTete: values.lignes.map((l) => l.valeur.trim()).filter((v) => v.length > 0),
      logoDroitUrl: values.logoDroitUrl || null,
      piedDePage: values.piedDePage?.trim() || null,
    };
    upsert.mutate({
      cle: CLE_ENTETE_DOCUMENT,
      valeur: nouvelleValeur as unknown as Json,
      description: "En-tête des documents imprimés (lignes au-dessus du nom, logo droit, pied de page).",
    });
  };

  if (isLoading) return <Skeleton className="h-80 w-full" />;

  return (
    <div className="max-w-2xl">
      <EnTeteSection titre="En-tête des documents" />
      <Encart titre="Utilisé par les documents imprimés (fiche d'exploitation, ordre de mission, statistiques)" className="mb-5">
        Le logo de gauche est celui de l'organisation (onglet Organisation). Les lignes ci-dessous s'affichent au-dessus du
        nom de l'organisation (mention institutionnelle) et le logo droit en vis-à-vis (sceau, armoiries).
      </Encart>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <fieldset disabled={!peutModifier} className="space-y-5">
          <legend className="sr-only">En-tête</legend>
          <div>
            <div className="mb-1.5 text-[13px] font-medium" id="entete-lignes-libelle">
              Lignes d'en-tête (au-dessus du nom de l'organisation)
            </div>
            <div className="space-y-2" role="group" aria-labelledby="entete-lignes-libelle">
              {fields.length === 0 && <p className="text-[13px] text-muted-foreground">Aucune ligne.</p>}
              {fields.map((f, index) => (
                <div key={f.id} className="flex gap-2">
                  <Input aria-label={`Ligne ${index + 1}`} {...register(`lignes.${index}.valeur`)} />
                  {peutModifier && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-crit-text"
                      onClick={() => remove(index)}
                      aria-label={`Retirer la ligne ${index + 1}`}
                      title="Retirer"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ))}
              {peutModifier && (
                <Button type="button" variant="outline" size="sm" onClick={() => append({ valeur: '' })}>
                  <Plus />
                  Ajouter une ligne
                </Button>
              )}
            </div>
          </div>

          <Champ label="Logo droit (sceau, armoiries)" htmlFor="entete-logo-droit" erreur={errors.logoDroitUrl?.message}>
            <ChampImage
              id="entete-logo-droit"
              url={logoDroitUrl || null}
              desactive={!peutModifier}
              enCours={uploadImage.isPending}
              onFichier={(file) =>
                uploadImage.mutate(file, {
                  onSuccess: (url) => setValue('logoDroitUrl', url, { shouldDirty: true }),
                })
              }
            />
          </Champ>

          <Champ label="Pied de page" htmlFor="entete-pied" aide="Laisser vide pour utiliser le code de l'organisation.">
            <Input id="entete-pied" {...register('piedDePage')} />
          </Champ>
        </fieldset>

        {peutModifier && (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!isDirty || upsert.isPending}>
              {upsert.isPending && <LoaderCircle className="animate-spin" />}
              Enregistrer
            </Button>
            {isDirty && <span className="text-[13px] text-muted-foreground">Modifications non enregistrées</span>}
          </div>
        )}
      </form>
    </div>
  );
}
