import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ActionsLigne, BoutonModifier, BoutonSuppression } from '../../../components/form/actions-ligne';
import { Button } from '../../../components/ui/button';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Tableau } from '../../../components/ui/tableau';
import { Champ } from '../../../components/form/champ';
import { FormDialog } from '../../../components/form/form-dialog';
import { Input, Textarea } from '../../../components/ui/input';
import { ariaErreur } from '../../../lib/form';
import {
  useParametreOrganisationMutations,
  useParametresOrganisation,
} from '../../../hooks/administration/useParametrage';
import type { ParametreOrganisation } from '../../../services/administration/parametrage';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

const schema = z.object({
  cle: z.string().min(1, 'Requis'),
  valeurJson: z.string().min(1, 'Requis').refine((v) => {
    try {
      JSON.parse(v);
      return true;
    } catch {
      return false;
    }
  }, 'JSON invalide (ex. "texte", 42, true, {"a":1})'),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ParametresOrganisationManager({ organisationId, peutModifier }: Props) {
  const { data: parametres, isLoading } = useParametresOrganisation(organisationId);
  const { upsert, remove } = useParametreOrganisationMutations(organisationId);
  const [edition, setEdition] = useState<ParametreOrganisation | 'nouveau' | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cle: '', valeurJson: '', description: '' },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({ cle: '', valeurJson: '', description: '' });
    } else if (edition) {
      reset({ cle: edition.cle, valeurJson: JSON.stringify(edition.valeur), description: edition.description ?? '' });
    }
  }, [edition, reset]);

  const onSubmit = (values: FormValues) => {
    upsert.mutate(
      { cle: values.cle, valeur: JSON.parse(values.valeurJson), description: values.description || null },
      { onSuccess: () => setEdition(null) },
    );
  };

  return (
    <div>
      <EnTeteSection
        titre="Paramètres de l'organisation"
        description="Réglages techniques stockés en JSON et lus par les modules."
        actions={
          peutModifier && (
            <Button variant="outline" onClick={() => setEdition('nouveau')}>
              <Plus />
              Ajouter un paramètre
            </Button>
          )
        }
      />
      <Tableau<ParametreOrganisation>
        libelle="Paramètres de l'organisation"
        lignes={parametres}
        cleLigne={(p) => p.id}
        chargement={isLoading}
        minLargeur={560}
        vide={{ icone: SlidersHorizontal, titre: 'Aucun paramètre' }}
        colonnes={[
          { cle: 'cle', titre: 'Clé', rendu: (p) => <span className="font-mono text-[12px] font-medium">{p.cle}</span> },
          {
            cle: 'valeur',
            titre: 'Valeur',
            rendu: (p) => (
              <code className="block max-w-[280px] truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]" title={JSON.stringify(p.valeur)}>
                {JSON.stringify(p.valeur)}
              </code>
            ),
          },
          { cle: 'description', titre: 'Description', rendu: (p) => <span className="text-muted-foreground">{p.description ?? '—'}</span> },
          ...(peutModifier
            ? [
                {
                  cle: 'actions',
                  titre: <span className="sr-only">Actions</span>,
                  className: 'w-20',
                  rendu: (p: ParametreOrganisation) => (
                    <ActionsLigne>
                      <BoutonModifier libelle={`Modifier ${p.cle}`} onClick={() => setEdition(p)} />
                      <BoutonSuppression
                        libelle={`Supprimer ${p.cle}`}
                        titre="Supprimer ce paramètre ?"
                        enCours={remove.isPending}
                        onConfirmer={(fermer) => remove.mutate(p.id, { onSuccess: fermer })}
                      >
                        <p>
                          Le paramètre <code className="font-mono">{p.cle}</code> sera supprimé ; les modules qui le lisent
                          reprendront leur valeur par défaut.
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
        titre={edition === 'nouveau' ? 'Nouveau paramètre' : 'Modifier le paramètre'}
        onSubmit={handleSubmit(onSubmit)}
        enCours={upsert.isPending}
        libelleValider={edition === 'nouveau' ? 'Ajouter le paramètre' : 'Enregistrer'}
      >
        <Champ label="Clé" htmlFor="parametre-cle" requis erreur={errors.cle?.message} aide={edition !== 'nouveau' ? "La clé d'un paramètre existant n'est pas modifiable." : undefined}>
          <Input className="font-mono" autoFocus={edition === 'nouveau'} disabled={edition !== 'nouveau'} {...ariaErreur('parametre-cle', errors.cle)} {...register('cle')} />
        </Champ>
        <Champ label="Valeur (JSON)" htmlFor="parametre-valeur" requis erreur={errors.valeurJson?.message} aide={'Exemples : "texte", 42, true, {"a":1}'}>
          <Textarea className="font-mono text-[13px]" rows={3} autoFocus={edition !== 'nouveau'} {...ariaErreur('parametre-valeur', errors.valeurJson)} {...register('valeurJson')} />
        </Champ>
        <Champ label="Description" htmlFor="parametre-description">
          <Input id="parametre-description" {...register('description')} />
        </Champ>
      </FormDialog>
    </div>
  );
}
