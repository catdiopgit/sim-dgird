import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ, ChampFichier } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useDecaissementMutations } from '../../hooks/projets/useDecaissements';
import { ariaErreur, nombreOuVide } from '../../lib/form';
import type { Avenant } from '../../services/projets/avenants';
import { formatMontant } from '../../utils/format';

const schema = z.object({
  origine: z.string(),
  pourcentage: z.number({ message: 'Requis' }).min(0.01, 'Requis').max(100, 'Au plus 100 %'),
  montant: z.number({ message: 'Requis' }).min(0.01, 'Requis'),
  dateDecaissement: z.string().min(1, 'Requis'),
  observations: z.string().optional(),
  titreJustificatif: z.string().min(1, 'Requis'),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  projetId: string;
  budgetPrevu: number | null;
  avenants: Avenant[] | undefined;
  onClose: () => void;
}

const ORIGINE_CONTRAT = 'contrat';

const vide = (): FormValues => ({
  origine: ORIGINE_CONTRAT,
  pourcentage: 0,
  montant: 0,
  dateDecaissement: dayjs().format('YYYY-MM-DD'),
  observations: '',
  titreJustificatif: '',
});

const arrondi2 = (v: number) => Math.round(v * 100) / 100;

// §2/§4 Gestion des décaissements : origine (contrat d'origine ou un
// avenant précis, pour un suivi séparé des cumuls — app.fn_verifier_decaissement,
// 0075) et calcul automatique montant <-> pourcentage à partir du montant de
// cette origine (budget_prevu du projet, ou montant de l'avenant choisi).
export function DecaissementFormModal({ open, projetId, budgetPrevu, avenants, onClose }: Props) {
  const { create } = useDecaissementMutations(projetId);
  const [fichier, setFichier] = useState<File | null>(null);
  const [tentative, setTentative] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: vide(),
  });

  const origine = watch('origine');

  const montantBase = useMemo(() => {
    if (origine === ORIGINE_CONTRAT) return budgetPrevu;
    const avenant = (avenants ?? []).find((a) => a.id === origine);
    return avenant?.montant ?? null;
  }, [origine, budgetPrevu, avenants]);

  useEffect(() => {
    if (open) {
      reset(vide());
      setFichier(null);
      setTentative(false);
    }
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    if (!fichier) return;
    create.mutate(
      {
        insert: {
          projet_id: projetId,
          avenant_id: values.origine === ORIGINE_CONTRAT ? null : values.origine,
          pourcentage: values.pourcentage,
          montant: values.montant,
          date_decaissement: values.dateDecaissement,
          observations: values.observations || null,
        },
        fichier,
        titreDocument: values.titreJustificatif,
      },
      { onSuccess: () => onClose() },
    );
  };

  const champPourcentage = register('pourcentage', { setValueAs: nombreOuVide });
  const champMontant = register('montant', { setValueAs: nombreOuVide });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre="Ajouter un décaissement"
      description="Montant et pourcentage se calculent l'un l'autre à partir du montant de l'origine choisie."
      onSubmit={(e) => {
        setTentative(true);
        void handleSubmit(onSubmit)(e);
      }}
      enCours={create.isPending}
      libelleValider="Ajouter le décaissement"
    >
      <Champ
        label="Origine"
        htmlFor="decaissement-origine"
        aide={montantBase != null ? `Montant de référence : ${formatMontant(montantBase)}` : undefined}
      >
        <NativeSelect id="decaissement-origine" {...register('origine')}>
          <option value={ORIGINE_CONTRAT}>Contrat d'origine</option>
          {(avenants ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.reference} — {a.objet}
            </option>
          ))}
        </NativeSelect>
      </Champ>

      {montantBase == null && (
        <div className="flex gap-2.5 rounded-lg bg-info/10 p-3 text-[13px]">
          <Info className="mt-0.5 size-4 shrink-0 text-info" />
          Aucun montant de référence pour cette origine : montant et pourcentage restent indépendants.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ label="Pourcentage (%)" htmlFor="decaissement-pct" requis erreur={errors.pourcentage?.message}>
          <Input
            type="number"
            min={0}
            max={100}
            step="any"
            {...ariaErreur('decaissement-pct', errors.pourcentage)}
            {...champPourcentage}
            onChange={(e) => {
              void champPourcentage.onChange(e);
              const pct = Number(e.target.value) || 0;
              if (montantBase != null) setValue('montant', arrondi2((pct / 100) * montantBase));
            }}
          />
        </Champ>
        <Champ label="Montant (FCFA)" htmlFor="decaissement-montant" requis erreur={errors.montant?.message}>
          <Input
            type="number"
            min={0}
            step="any"
            {...ariaErreur('decaissement-montant', errors.montant)}
            {...champMontant}
            onChange={(e) => {
              void champMontant.onChange(e);
              const montant = Number(e.target.value) || 0;
              if (montantBase) setValue('pourcentage', arrondi2((montant / montantBase) * 100));
            }}
          />
        </Champ>
        <Champ label="Date du décaissement" htmlFor="decaissement-date" requis erreur={errors.dateDecaissement?.message}>
          <Input type="date" {...ariaErreur('decaissement-date', errors.dateDecaissement)} {...register('dateDecaissement')} />
        </Champ>
      </div>

      <Champ label="Observations" htmlFor="decaissement-observations">
        <Textarea id="decaissement-observations" rows={2} {...register('observations')} />
      </Champ>

      <div className="rounded-lg border border-border p-4">
        <div className="mb-3 text-[13px] font-semibold">Justificatif</div>
        <div className="space-y-4">
          <Champ label="Titre du justificatif" htmlFor="decaissement-titre" requis erreur={errors.titreJustificatif?.message}>
            <Input placeholder="Ex. Facture n° 2026-045" {...ariaErreur('decaissement-titre', errors.titreJustificatif)} {...register('titreJustificatif')} />
          </Champ>
          <Champ label="Fichier" htmlFor="decaissement-fichier" requis erreur={tentative && !fichier ? 'Un justificatif est requis' : undefined}>
            <ChampFichier id="decaissement-fichier" fichier={fichier} onChange={setFichier} invalide={tentative && !fichier} />
          </Champ>
        </div>
      </div>
    </FormDialog>
  );
}
