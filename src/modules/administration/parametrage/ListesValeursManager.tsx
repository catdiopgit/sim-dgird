import { zodResolver } from '@hookform/resolvers/zod';
import { ListChecks, MousePointerClick, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ActionsLigne, BoutonModifier, BoutonSuppression } from '../../../components/form/actions-ligne';
import { Champ } from '../../../components/form/champ';
import { ChampCouleur } from '../../../components/form/champ-couleur';
import { FormDialog } from '../../../components/form/form-dialog';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { NativeSelect } from '../../../components/ui/native-select';
import { EnTeteSection, EtatVide } from '../../../components/ui/page-header';
import { Switch as Interrupteur } from '../../../components/ui/switch';
import { Tableau } from '../../../components/ui/tableau';
import { ariaErreur } from '../../../lib/form';
import { useModulesActions } from '../../../hooks/administration/useRolesAdmin';
import {
  useListeValeursMutations,
  useListesValeurs,
  useValeurListeMutations,
  useValeursListes,
} from '../../../hooks/administration/useParametrage';
import type { ListeValeurs, ValeurListe } from '../../../services/administration/parametrage';
import { couleurReferentiel } from '../../../utils/couleurReferentiel';
import { slugifier } from '../../../utils/slug';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

const schemaListe = z.object({
  libelle: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  moduleId: z.string().optional(),
});
type FormListe = z.infer<typeof schemaListe>;

const schemaValeur = z.object({
  code: z.string().min(1, 'Requis'),
  libelle: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  couleur: z.string().optional(),
  ordre: z.number().int(),
  valeur_defaut: z.boolean(),
  actif: z.boolean(),
});
type FormValeur = z.infer<typeof schemaValeur>;

export function ListesValeursManager({ organisationId, peutModifier }: Props) {
  const { data: listes, isLoading } = useListesValeurs(organisationId);
  const { modules } = useModulesActions();
  const listeMutations = useListeValeursMutations(organisationId);
  const [listeSelectionnee, setListeSelectionnee] = useState<ListeValeurs | null>(null);
  const [editionListe, setEditionListe] = useState<ListeValeurs | 'nouveau' | null>(null);

  const { data: valeurs, isLoading: chargementValeurs } = useValeursListes(listeSelectionnee?.id);
  const valeurMutations = useValeurListeMutations(listeSelectionnee?.id);
  const [editionValeur, setEditionValeur] = useState<ValeurListe | 'nouveau' | null>(null);

  const {
    register: registerListe,
    handleSubmit: submitListe,
    reset: resetListe,
    setValue: setValeurListe,
    watch: watchListe,
    formState: { errors: errorsListe },
  } = useForm<FormListe>({ resolver: zodResolver(schemaListe), defaultValues: { libelle: '', code: '', moduleId: '' } });

  useEffect(() => {
    if (editionListe === 'nouveau') resetListe({ libelle: '', code: '', moduleId: '' });
    else if (editionListe) resetListe({ libelle: editionListe.libelle, code: editionListe.code, moduleId: editionListe.module_id ?? '' });
  }, [editionListe, resetListe]);

  const libelleListe = watchListe('libelle');
  useEffect(() => {
    if (editionListe === 'nouveau' && libelleListe) setValeurListe('code', slugifier(libelleListe));
  }, [libelleListe, editionListe, setValeurListe]);

  const onSubmitListe = (values: FormListe) => {
    if (editionListe === 'nouveau') {
      listeMutations.create.mutate(
        { organisation_id: organisationId, code: values.code, libelle: values.libelle, module_id: values.moduleId || null },
        { onSuccess: () => setEditionListe(null) },
      );
    } else if (editionListe) {
      listeMutations.update.mutate(
        { id: editionListe.id, patch: { code: values.code, libelle: values.libelle, module_id: values.moduleId || null } },
        { onSuccess: () => setEditionListe(null) },
      );
    }
  };

  const {
    control: controlValeur,
    register: registerValeur,
    handleSubmit: submitValeur,
    reset: resetValeur,
    setValue: setValeurValeur,
    watch: watchValeur,
    formState: { errors: errorsValeur },
  } = useForm<FormValeur>({
      resolver: zodResolver(schemaValeur),
      defaultValues: { code: '', libelle: '', description: '', couleur: '', ordre: 0, valeur_defaut: false, actif: true },
    });

  useEffect(() => {
    if (editionValeur === 'nouveau') {
      resetValeur({ code: '', libelle: '', description: '', couleur: '', ordre: (valeurs?.length ?? 0) + 1, valeur_defaut: false, actif: true });
    } else if (editionValeur) {
      resetValeur({
        code: editionValeur.code,
        libelle: editionValeur.libelle,
        description: editionValeur.description ?? '',
        couleur: editionValeur.couleur ?? '',
        ordre: editionValeur.ordre,
        valeur_defaut: editionValeur.valeur_defaut,
        actif: editionValeur.actif,
      });
    }
  }, [editionValeur, resetValeur, valeurs]);

  const libelleValeur = watchValeur('libelle');
  useEffect(() => {
    if (editionValeur === 'nouveau' && libelleValeur) setValeurValeur('code', slugifier(libelleValeur));
  }, [libelleValeur, editionValeur, setValeurValeur]);

  const onSubmitValeur = (values: FormValeur) => {
    if (!listeSelectionnee) return;
    const patch = {
      code: values.code,
      libelle: values.libelle,
      description: values.description || null,
      couleur: values.couleur || null,
      ordre: values.ordre,
      valeur_defaut: values.valeur_defaut,
      actif: values.actif,
    };
    if (editionValeur === 'nouveau') {
      valeurMutations.create.mutate({ liste_id: listeSelectionnee.id, ...patch }, { onSuccess: () => setEditionValeur(null) });
    } else if (editionValeur) {
      valeurMutations.update.mutate({ id: editionValeur.id, patch }, { onSuccess: () => setEditionValeur(null) });
    }
  };

  const moduleParId = new Map((modules.data ?? []).map((m) => [m.id, m.libelle]));

  return (
    <div>
      <EnTeteSection
        titre="Listes de valeurs"
        description="Remplacent les statuts, priorités et types codés en dur : chaque liste regroupe des valeurs réutilisables par un ou plusieurs modules."
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="min-w-0">
          <CardHeader className="items-center">
            <CardTitle>Listes</CardTitle>
            {peutModifier && (
              <Button variant="outline" size="sm" onClick={() => setEditionListe('nouveau')}>
                <Plus />
                Nouvelle liste
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Tableau<ListeValeurs>
              libelle="Listes de valeurs"
              lignes={listes}
              cleLigne={(l) => l.id}
              chargement={isLoading}
              minLargeur={320}
              onLigneClic={setListeSelectionnee}
              estActive={(l) => l.id === listeSelectionnee?.id}
              vide={{ icone: ListChecks, titre: 'Aucune liste' }}
              colonnes={[
                { cle: 'libelle', titre: 'Libellé', rendu: (l) => <span className="font-medium">{l.libelle}</span> },
                {
                  cle: 'module',
                  titre: 'Module',
                  rendu: (l) =>
                    l.module_id ? moduleParId.get(l.module_id) : <span className="text-muted-foreground">Partagée</span>,
                },
                ...(peutModifier
                  ? [
                      {
                        cle: 'actions',
                        titre: <span className="sr-only">Actions</span>,
                        className: 'w-20',
                        rendu: (l: ListeValeurs) => (
                          <ActionsLigne>
                            <BoutonModifier libelle={`Modifier la liste ${l.libelle}`} onClick={() => setEditionListe(l)} />
                            <BoutonSuppression
                              libelle={`Supprimer la liste ${l.libelle}`}
                              titre="Supprimer cette liste ?"
                              enCours={listeMutations.remove.isPending}
                              onConfirmer={(fermer) =>
                                listeMutations.remove.mutate(l.id, {
                                  onSuccess: () => {
                                    if (listeSelectionnee?.id === l.id) setListeSelectionnee(null);
                                    fermer();
                                  },
                                })
                              }
                            >
                              <p>
                                La liste <strong>{l.libelle}</strong> et ses valeurs seront supprimées.
                              </p>
                            </BoutonSuppression>
                          </ActionsLigne>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="items-center">
            <CardTitle className="min-w-0 truncate">
              {listeSelectionnee ? `Valeurs — ${listeSelectionnee.libelle}` : 'Valeurs'}
            </CardTitle>
            {peutModifier && listeSelectionnee && (
              <Button variant="outline" size="sm" onClick={() => setEditionValeur('nouveau')}>
                <Plus />
                Ajouter une valeur
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!listeSelectionnee ? (
              <div className="rounded-lg border border-dashed border-border">
                <EtatVide
                  icone={MousePointerClick}
                  titre="Aucune liste sélectionnée"
                  description="Choisissez une liste pour afficher et modifier ses valeurs."
                />
              </div>
            ) : (
              <Tableau<ValeurListe>
                libelle={`Valeurs de la liste ${listeSelectionnee.libelle}`}
                lignes={valeurs}
                cleLigne={(v) => v.id}
                chargement={chargementValeurs}
                minLargeur={480}
                vide={{ icone: ListChecks, titre: 'Aucune valeur', description: 'Ajoutez la première valeur de cette liste.' }}
                colonnes={[
                  {
                    cle: 'libelle',
                    titre: 'Libellé',
                    rendu: (v) => (
                      <span className="flex items-center gap-2 font-medium">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full border border-border"
                          style={{ background: couleurReferentiel(v.couleur) ?? 'transparent' }}
                        />
                        {v.libelle}
                        {v.valeur_defaut && (
                          <Badge variant="muted" shape="pill">
                            par défaut
                          </Badge>
                        )}
                      </span>
                    ),
                  },
                  { cle: 'code', titre: 'Code', rendu: (v) => <span className="font-mono text-[12px] text-muted-foreground">{v.code}</span> },
                  {
                    cle: 'actif',
                    titre: 'Active',
                    className: 'w-20',
                    rendu: (v) => (
                      <Interrupteur
                        aria-label={`Valeur ${v.libelle} active`}
                        checked={v.actif}
                        disabled={!peutModifier}
                        onCheckedChange={(checked) => valeurMutations.update.mutate({ id: v.id, patch: { actif: checked } })}
                      />
                    ),
                  },
                  ...(peutModifier
                    ? [
                        {
                          cle: 'actions',
                          titre: <span className="sr-only">Actions</span>,
                          className: 'w-20',
                          rendu: (v: ValeurListe) => (
                            <ActionsLigne>
                              <BoutonModifier libelle={`Modifier la valeur ${v.libelle}`} onClick={() => setEditionValeur(v)} />
                              <BoutonSuppression
                                libelle={`Supprimer la valeur ${v.libelle}`}
                                titre="Supprimer cette valeur ?"
                                enCours={valeurMutations.remove.isPending}
                                onConfirmer={(fermer) => valeurMutations.remove.mutate(v.id, { onSuccess: fermer })}
                              >
                                <p>
                                  La valeur <strong>{v.libelle}</strong> sera supprimée. Pour la garder sur les dossiers
                                  existants, désactivez-la plutôt.
                                </p>
                              </BoutonSuppression>
                            </ActionsLigne>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <FormDialog
        open={editionListe !== null}
        onClose={() => setEditionListe(null)}
        titre={editionListe === 'nouveau' ? 'Nouvelle liste' : 'Modifier la liste'}
        onSubmit={submitListe(onSubmitListe)}
        enCours={listeMutations.create.isPending || listeMutations.update.isPending}
        libelleValider={editionListe === 'nouveau' ? 'Créer la liste' : 'Enregistrer'}
      >
        <Champ label="Libellé" htmlFor="liste-libelle" requis erreur={errorsListe.libelle?.message}>
          <Input autoFocus {...ariaErreur('liste-libelle', errorsListe.libelle)} {...registerListe('libelle')} />
        </Champ>
        <Champ label="Code" htmlFor="liste-code" requis aide={editionListe === 'nouveau' ? 'Proposé à partir du libellé.' : undefined} erreur={errorsListe.code?.message}>
          <Input className="font-mono" {...ariaErreur('liste-code', errorsListe.code)} {...registerListe('code')} />
        </Champ>
        <Champ label="Module" htmlFor="liste-module">
          <NativeSelect id="liste-module" {...registerListe('moduleId')}>
            <option value="">Partagée entre modules</option>
            {(modules.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.libelle}
              </option>
            ))}
          </NativeSelect>
        </Champ>
      </FormDialog>

      <FormDialog
        open={editionValeur !== null}
        onClose={() => setEditionValeur(null)}
        titre={editionValeur === 'nouveau' ? 'Nouvelle valeur' : 'Modifier la valeur'}
        description={listeSelectionnee ? `Liste « ${listeSelectionnee.libelle} »` : undefined}
        onSubmit={submitValeur(onSubmitValeur)}
        enCours={valeurMutations.create.isPending || valeurMutations.update.isPending}
        libelleValider={editionValeur === 'nouveau' ? 'Ajouter la valeur' : 'Enregistrer'}
      >
        <Champ label="Libellé" htmlFor="valeur-libelle" requis erreur={errorsValeur.libelle?.message}>
          <Input autoFocus {...ariaErreur('valeur-libelle', errorsValeur.libelle)} {...registerValeur('libelle')} />
        </Champ>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
          <Champ label="Code" htmlFor="valeur-code" requis aide={editionValeur === 'nouveau' ? 'Proposé à partir du libellé.' : undefined} erreur={errorsValeur.code?.message}>
            <Input className="font-mono" {...ariaErreur('valeur-code', errorsValeur.code)} {...registerValeur('code')} />
          </Champ>
          <Champ label="Ordre" htmlFor="valeur-ordre" erreur={errorsValeur.ordre?.message}>
            <Input type="number" step={1} {...ariaErreur('valeur-ordre', errorsValeur.ordre)} {...registerValeur('ordre', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })} />
          </Champ>
        </div>
        <Champ label="Description" htmlFor="valeur-description">
          <Input id="valeur-description" {...registerValeur('description')} />
        </Champ>
        <Champ label="Couleur" htmlFor="valeur-couleur">
          <Controller
            name="couleur"
            control={controlValeur}
            render={({ field }) => <ChampCouleur id="valeur-couleur" value={field.value} onChange={field.onChange} />}
          />
        </Champ>
        <div className="divide-y divide-border rounded-lg border border-border">
          <Controller
            name="valeur_defaut"
            control={controlValeur}
            render={({ field }) => (
              <label htmlFor="valeur-defaut" className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                <span>
                  <span className="block text-[14px] font-medium">Valeur par défaut</span>
                  <span className="block text-[12px] text-muted-foreground">Proposée d'office dans les formulaires.</span>
                </span>
                <Interrupteur id="valeur-defaut" checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
          <Controller
            name="actif"
            control={controlValeur}
            render={({ field }) => (
              <label htmlFor="valeur-actif" className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                <span>
                  <span className="block text-[14px] font-medium">Active</span>
                  <span className="block text-[12px] text-muted-foreground">Une valeur inactive n'est plus proposée.</span>
                </span>
                <Interrupteur id="valeur-actif" checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        </div>
      </FormDialog>
    </div>
  );
}
