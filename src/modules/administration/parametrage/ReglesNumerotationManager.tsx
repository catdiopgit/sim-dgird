import { zodResolver } from '@hookform/resolvers/zod';
import { Hash, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ActionsLigne, BoutonModifier, BoutonSuppression } from '../../../components/form/actions-ligne';
import { Button } from '../../../components/ui/button';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Tableau } from '../../../components/ui/tableau';
import { Champ } from '../../../components/form/champ';
import { FormDialog } from '../../../components/form/form-dialog';
import { Input } from '../../../components/ui/input';
import { NativeSelect } from '../../../components/ui/native-select';
import { ariaErreur } from '../../../lib/form';
import { useEntites } from '../../../hooks/administration/useEntites';
import {
  useRegleNumerotationMutations,
  useReglesNumerotation,
} from '../../../hooks/administration/useParametrage';
import { useModulesActions } from '../../../hooks/administration/useRolesAdmin';
import type { RegleNumerotation } from '../../../services/administration/parametrage';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

const schema = z.object({
  moduleId: z.string().min(1, 'Requis'),
  entiteId: z.string().optional(),
  format: z.string().min(1, 'Requis'),
  reinitialisation: z.enum(['annuelle', 'mensuelle', 'jamais']),
  niveauRacineChemin: z.number().nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

const LIBELLE_REINITIALISATION: Record<string, string> = { annuelle: 'Annuelle', mensuelle: 'Mensuelle', jamais: 'Jamais' };

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-card px-1 py-0.5 font-mono text-[12px] text-foreground">{children}</code>;
}

export function ReglesNumerotationManager({ organisationId, peutModifier }: Props) {
  const { data: regles, isLoading } = useReglesNumerotation(organisationId);
  const { modules } = useModulesActions();
  const { data: entites } = useEntites(organisationId);
  const { create, update, remove } = useRegleNumerotationMutations(organisationId);
  const [edition, setEdition] = useState<RegleNumerotation | 'nouveau' | null>(null);

  const moduleParId = useMemo(() => new Map((modules.data ?? []).map((m) => [m.id, m.libelle])), [modules.data]);
  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { moduleId: '', entiteId: '', format: '', reinitialisation: 'annuelle', niveauRacineChemin: null },
  });

  useEffect(() => {
    if (edition === 'nouveau') {
      reset({ moduleId: '', entiteId: '', format: '', reinitialisation: 'annuelle', niveauRacineChemin: null });
    } else if (edition) {
      reset({
        moduleId: edition.module_id,
        entiteId: edition.entite_id ?? '',
        format: edition.format,
        reinitialisation: edition.reinitialisation,
        niveauRacineChemin: edition.niveau_racine_chemin,
      });
    }
  }, [edition, reset]);

  const onSubmit = (values: FormValues) => {
    const patch = {
      module_id: values.moduleId,
      entite_id: values.entiteId || null,
      format: values.format,
      reinitialisation: values.reinitialisation,
      niveau_racine_chemin: values.niveauRacineChemin ?? null,
    };
    if (edition === 'nouveau') {
      create.mutate({ organisation_id: organisationId, ...patch }, { onSuccess: () => setEdition(null) });
    } else if (edition) {
      update.mutate({ id: edition.id, patch }, { onSuccess: () => setEdition(null) });
    }
  };

  return (
    <div>
      <EnTeteSection
        titre="Règles de numérotation"
        actions={
          peutModifier && (
            <Button variant="outline" onClick={() => setEdition('nouveau')}>
              <Plus />
              Ajouter une règle
            </Button>
          )
        }
      />
      <div className="mb-4 rounded-lg border border-border bg-muted/40 p-4 text-[13px] leading-relaxed text-muted-foreground">
        <p>
          Gabarit composé de repères : <Code>{'{ANNEE}'}</Code> <Code>{'{MOIS}'}</Code> <Code>{'{SEQ}'}</Code>{' '}
          <Code>{'{SEQ:n}'}</Code> (séquence complétée par des zéros sur n chiffres), <Code>{'{ORGANISATION}'}</Code>,{' '}
          <Code>{'{ENTITE}'}</Code> (sigle de l'entité, ou son code à défaut) et <Code>{'{CHEMIN_ENTITE}'}</Code> (sigles
          des entités depuis la racine de l'organigramme, séparés par « / » — laisser « Niveau racine » vide).
        </p>
        <p className="mt-2">
          Exemple : <Code>{'{ANNEE}/{ORGANISATION}/{CHEMIN_ENTITE}/{SEQ:5}'}</Code> → <Code>2026/DGDDI/DG/DIM/00002</Code>
        </p>
      </div>
      <Tableau<RegleNumerotation>
        libelle="Règles de numérotation"
        lignes={regles}
        cleLigne={(r) => r.id}
        chargement={isLoading}
        minLargeur={720}
        vide={{ icone: Hash, titre: 'Aucune règle', description: 'Sans règle, les numéros suivent le format par défaut du module.' }}
        colonnes={[
          { cle: 'module', titre: 'Module', rendu: (r) => <span className="font-medium">{moduleParId.get(r.module_id) ?? '—'}</span> },
          {
            cle: 'entite',
            titre: 'Entité',
            rendu: (r) =>
              r.entite_id ? entiteParId.get(r.entite_id) : <span className="text-muted-foreground">Organisation entière</span>,
          },
          { cle: 'format', titre: 'Format', rendu: (r) => <span className="font-mono text-[12px]">{r.format}</span> },
          {
            cle: 'sequence',
            titre: 'Séquence',
            className: 'w-24 text-right tabular-nums',
            rendu: (r) => r.sequence_courante,
          },
          {
            cle: 'reinitialisation',
            titre: 'Remise à zéro',
            className: 'w-32',
            rendu: (r) => LIBELLE_REINITIALISATION[r.reinitialisation] ?? r.reinitialisation,
          },
          ...(peutModifier
            ? [
                {
                  cle: 'actions',
                  titre: <span className="sr-only">Actions</span>,
                  className: 'w-20',
                  rendu: (r: RegleNumerotation) => (
                    <ActionsLigne>
                      <BoutonModifier libelle={`Modifier la règle ${r.format}`} onClick={() => setEdition(r)} />
                      <BoutonSuppression
                        libelle={`Supprimer la règle ${r.format}`}
                        titre="Supprimer cette règle ?"
                        enCours={remove.isPending}
                        onConfirmer={(fermer) => remove.mutate(r.id, { onSuccess: fermer })}
                      >
                        <p>
                          Les prochains numéros de ce module ne suivront plus le format <Code>{r.format}</Code>.
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
        titre={edition === 'nouveau' ? 'Nouvelle règle de numérotation' : 'Modifier la règle'}
        onSubmit={handleSubmit(onSubmit)}
        enCours={create.isPending || update.isPending}
        libelleValider={edition === 'nouveau' ? 'Créer la règle' : 'Enregistrer'}
        largeur="lg"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Module" htmlFor="regle-module" requis erreur={errors.moduleId?.message}>
            <NativeSelect autoFocus {...ariaErreur('regle-module', errors.moduleId)} {...register('moduleId')}>
              <option value="">Sélectionner un module</option>
              {(modules.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.libelle}
                </option>
              ))}
            </NativeSelect>
          </Champ>
          <Champ label="Entité" htmlFor="regle-entite" aide="Vide = règle par défaut de l'organisation.">
            <NativeSelect id="regle-entite" {...register('entiteId')}>
              <option value="">Organisation entière</option>
              {(entites ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.libelle}
                </option>
              ))}
            </NativeSelect>
          </Champ>
        </div>
        <Champ
          label="Format"
          htmlFor="regle-format"
          requis
          erreur={errors.format?.message}
          aide="Repères : {ANNEE}, {MOIS}, {SEQ}, {SEQ:n}, {ORGANISATION}, {ENTITE}, {CHEMIN_ENTITE}"
        >
          <Input className="font-mono" placeholder="{ANNEE}/{ORGANISATION}/{CHEMIN_ENTITE}/{SEQ:5}" {...ariaErreur('regle-format', errors.format)} {...register('format')} />
        </Champ>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Niveau racine du chemin d'entité" htmlFor="regle-niveau" aide="Utilisé par {CHEMIN_ENTITE}. Vide = depuis la racine." erreur={errors.niveauRacineChemin?.message}>
            <Input
              type="number"
              min={0}
              step={1}
              placeholder="Depuis la racine"
              {...ariaErreur('regle-niveau', errors.niveauRacineChemin)}
              {...register('niveauRacineChemin', { setValueAs: (v) => (v === '' || v === null ? null : Number(v)) })}
            />
          </Champ>
          <Champ label="Réinitialisation" htmlFor="regle-reinitialisation">
            <NativeSelect id="regle-reinitialisation" {...register('reinitialisation')}>
              <option value="annuelle">Annuelle</option>
              <option value="mensuelle">Mensuelle</option>
              <option value="jamais">Jamais</option>
            </NativeSelect>
          </Champ>
        </div>
      </FormDialog>
    </div>
  );
}
