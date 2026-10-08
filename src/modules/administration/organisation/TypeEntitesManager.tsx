import { zodResolver } from '@hookform/resolvers/zod';
import { Network, Plus } from 'lucide-react';
import { Champ } from '../../../components/form/champ';
import { FormDialog } from '../../../components/form/form-dialog';
import { Input } from '../../../components/ui/input';
import { ariaErreur } from '../../../lib/form';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ActionsLigne, BoutonModifier, BoutonSuppression } from '../../../components/form/actions-ligne';
import { Button } from '../../../components/ui/button';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Switch as Interrupteur } from '../../../components/ui/switch';
import { Tableau } from '../../../components/ui/tableau';
import {
  useTypeEntiteMutations,
  useTypeEntites,
} from '../../../hooks/administration/useTypeEntites';
import type { TypeEntite } from '../../../services/administration/typeEntites';
import { slugifier } from '../../../utils/slug';

const schema = z.object({
  code: z.string().min(1, 'Requis'),
  libelle: z.string().min(1, 'Requis'),
  ordre: z.number().int(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

export function TypeEntitesManager({ organisationId, peutModifier }: Props) {
  const { data: typeEntites, isLoading } = useTypeEntites(organisationId);
  const { create, update, remove } = useTypeEntiteMutations(organisationId);
  const [edition, setEdition] = useState<TypeEntite | 'nouveau' | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', libelle: '', ordre: 0 },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({ code: '', libelle: '', ordre: (typeEntites?.length ?? 0) + 1 });
    } else if (edition) {
      reset({ code: edition.code, libelle: edition.libelle, ordre: edition.ordre });
    }
  }, [edition, reset, typeEntites]);

  const libelle = watch('libelle');
  useEffect(() => {
    if (edition === 'nouveau' && libelle) {
      setValue('code', slugifier(libelle));
    }
  }, [libelle, edition, setValue]);

  const onSubmit = (values: FormValues) => {
    if (edition === 'nouveau') {
      create.mutate(
        { organisation_id: organisationId, code: values.code, libelle: values.libelle, ordre: values.ordre },
        { onSuccess: () => setEdition(null) },
      );
    } else if (edition) {
      update.mutate(
        { id: edition.id, patch: { code: values.code, libelle: values.libelle, ordre: values.ordre } },
        { onSuccess: () => setEdition(null) },
      );
    }
  };

  return (
    <div>
      <EnTeteSection
        titre="Types d'entités"
        description="Niveaux de l'organigramme (direction, service, bureau…), dans leur ordre hiérarchique."
        actions={
          peutModifier && (
            <Button variant="outline" onClick={() => setEdition('nouveau')}>
              <Plus />
              Ajouter un type
            </Button>
          )
        }
      />
      <Tableau<TypeEntite>
        libelle="Types d'entités"
        lignes={typeEntites}
        cleLigne={(t) => t.id}
        chargement={isLoading}
        minLargeur={480}
        vide={{ icone: Network, titre: "Aucun type d'entité" }}
        colonnes={[
          { cle: 'ordre', titre: 'Ordre', className: 'w-16 tabular-nums text-muted-foreground', rendu: (t) => t.ordre },
          { cle: 'libelle', titre: 'Libellé', rendu: (t) => <span className="font-medium">{t.libelle}</span> },
          { cle: 'code', titre: 'Code', rendu: (t) => <span className="font-mono text-[12px] text-muted-foreground">{t.code}</span> },
          {
            cle: 'actif',
            titre: 'Actif',
            className: 'w-20',
            rendu: (t) => (
              <Interrupteur
                aria-label={`Type ${t.libelle} actif`}
                checked={t.actif}
                disabled={!peutModifier}
                onCheckedChange={(checked) => update.mutate({ id: t.id, patch: { actif: checked } })}
              />
            ),
          },
          ...(peutModifier
            ? [
                {
                  cle: 'actions',
                  titre: <span className="sr-only">Actions</span>,
                  className: 'w-24',
                  rendu: (t: TypeEntite) => (
                    <ActionsLigne>
                      <BoutonModifier libelle={`Modifier ${t.libelle}`} onClick={() => setEdition(t)} />
                      <BoutonSuppression
                        libelle={`Supprimer ${t.libelle}`}
                        titre="Supprimer ce type d'entité ?"
                        enCours={remove.isPending}
                        onConfirmer={(fermer) => remove.mutate(t.id, { onSuccess: fermer })}
                      >
                        <p>
                          Le type <strong>{t.libelle}</strong> sera supprimé. Pour le conserver dans l'historique, désactivez-le plutôt.
                        </p>
                      </BoutonSuppression>
                    </ActionsLigne>
                  ),
                },
              ]
            : []),
        ]}
      />

      <FormDialog
        open={edition !== null}
        onClose={() => setEdition(null)}
        titre={edition === 'nouveau' ? "Nouveau type d'entité" : "Modifier le type d'entité"}
        onSubmit={handleSubmit(onSubmit)}
        enCours={create.isPending || update.isPending}
        libelleValider={edition === 'nouveau' ? 'Créer le type' : 'Enregistrer'}
      >
        <Champ label="Libellé" htmlFor="type-entite-libelle" requis erreur={errors.libelle?.message}>
          <Input autoFocus {...ariaErreur('type-entite-libelle', errors.libelle)} {...register('libelle')} />
        </Champ>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
          <Champ label="Code" htmlFor="type-entite-code" requis aide={edition === 'nouveau' ? 'Proposé à partir du libellé.' : undefined} erreur={errors.code?.message}>
            <Input className="font-mono" {...ariaErreur('type-entite-code', errors.code)} {...register('code')} />
          </Champ>
          <Champ label="Ordre" htmlFor="type-entite-ordre" erreur={errors.ordre?.message}>
            <Input type="number" step={1} {...ariaErreur('type-entite-ordre', errors.ordre)} {...register('ordre', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })} />
          </Champ>
        </div>
      </FormDialog>
    </div>
  );
}
