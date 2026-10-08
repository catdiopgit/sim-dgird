import { zodResolver } from '@hookform/resolvers/zod';
import { BriefcaseBusiness, Plus } from 'lucide-react';
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
import { useFonctionMutations, useFonctions } from '../../../hooks/administration/useFonctions';
import type { Fonction } from '../../../services/administration/fonctions';
import { slugifier } from '../../../utils/slug';

const schema = z.object({
  code: z.string().min(1, 'Requis'),
  libelle: z.string().min(1, 'Requis'),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

export function FonctionsManager({ organisationId, peutModifier }: Props) {
  const { data: fonctions, isLoading } = useFonctions(organisationId);
  const { create, update, remove } = useFonctionMutations(organisationId);
  const [edition, setEdition] = useState<Fonction | 'nouveau' | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', libelle: '' },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({ code: '', libelle: '' });
    } else if (edition) {
      reset({ code: edition.code, libelle: edition.libelle });
    }
  }, [edition, reset]);

  const libelle = watch('libelle');
  useEffect(() => {
    if (edition === 'nouveau' && libelle) {
      setValue('code', slugifier(libelle));
    }
  }, [libelle, edition, setValue]);

  const onSubmit = (values: FormValues) => {
    if (edition === 'nouveau') {
      create.mutate(
        { organisation_id: organisationId, code: values.code, libelle: values.libelle },
        { onSuccess: () => setEdition(null) },
      );
    } else if (edition) {
      update.mutate(
        { id: edition.id, patch: { code: values.code, libelle: values.libelle } },
        { onSuccess: () => setEdition(null) },
      );
    }
  };

  return (
    <div>
      <EnTeteSection
        titre="Fonctions"
        description="Postes occupés par les utilisateurs (directeur, chef de service, agent…)."
        actions={
          peutModifier && (
            <Button variant="outline" onClick={() => setEdition('nouveau')}>
              <Plus />
              Ajouter une fonction
            </Button>
          )
        }
      />
      <Tableau<Fonction>
        libelle="Fonctions"
        lignes={fonctions}
        cleLigne={(f) => f.id}
        chargement={isLoading}
        minLargeur={480}
        vide={{ icone: BriefcaseBusiness, titre: 'Aucune fonction' }}
        colonnes={[
          { cle: 'libelle', titre: 'Libellé', rendu: (f) => <span className="font-medium">{f.libelle}</span> },
          { cle: 'code', titre: 'Code', rendu: (f) => <span className="font-mono text-[12px] text-muted-foreground">{f.code}</span> },
          {
            cle: 'actif',
            titre: 'Active',
            className: 'w-20',
            rendu: (f) => (
              <Interrupteur
                aria-label={`Fonction ${f.libelle} active`}
                checked={f.actif}
                disabled={!peutModifier}
                onCheckedChange={(checked) => update.mutate({ id: f.id, patch: { actif: checked } })}
              />
            ),
          },
          ...(peutModifier
            ? [
                {
                  cle: 'actions',
                  titre: <span className="sr-only">Actions</span>,
                  className: 'w-24',
                  rendu: (f: Fonction) => (
                    <ActionsLigne>
                      <BoutonModifier libelle={`Modifier ${f.libelle}`} onClick={() => setEdition(f)} />
                      <BoutonSuppression
                        libelle={`Supprimer ${f.libelle}`}
                        titre="Supprimer cette fonction ?"
                        enCours={remove.isPending}
                        onConfirmer={(fermer) => remove.mutate(f.id, { onSuccess: fermer })}
                      >
                        <p>
                          La fonction <strong>{f.libelle}</strong> sera supprimée. Pour la conserver dans l'historique, désactivez-la plutôt.
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
        titre={edition === 'nouveau' ? 'Nouvelle fonction' : 'Modifier la fonction'}
        onSubmit={handleSubmit(onSubmit)}
        enCours={create.isPending || update.isPending}
        libelleValider={edition === 'nouveau' ? 'Créer la fonction' : 'Enregistrer'}
      >
        <Champ label="Libellé" htmlFor="fonction-libelle" requis erreur={errors.libelle?.message}>
          <Input autoFocus {...ariaErreur('fonction-libelle', errors.libelle)} {...register('libelle')} />
        </Champ>
        <Champ label="Code" htmlFor="fonction-code" requis aide={edition === 'nouveau' ? 'Proposé à partir du libellé.' : undefined} erreur={errors.code?.message}>
          <Input className="font-mono" {...ariaErreur('fonction-code', errors.code)} {...register('code')} />
        </Champ>
      </FormDialog>
    </div>
  );
}
