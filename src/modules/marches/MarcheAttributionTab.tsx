import { zodResolver } from '@hookform/resolvers/zod';
import { Award, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Encart } from '../../components/ui/encart';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { EtatVide } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { useMarcheAttribution, useMarcheAttributionMutation } from '../../hooks/marches/useMarcheAttribution';
import { useMarcheCandidats } from '../../hooks/marches/useMarcheCandidats';
import { ariaErreur, nombreOuVide, versChampDate } from '../../lib/form';
import { formatMontant } from '../../utils/format';
import { dateCourte } from './format';

const schema = z.object({
  candidatAttributaireId: z.string().min(1, 'Requis'),
  montantAttribue: z.number().min(0, 'Montant invalide').optional(),
  dateAttribution: z.string().optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  marcheId: string;
  peutModifier: boolean;
}

const VIDE: FormValues = { candidatAttributaireId: '', montantAttribue: undefined, dateAttribution: '', observations: '' };

function Ligne({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[14px]">{children ?? '—'}</dd>
    </div>
  );
}

// §16 Attribution du marché — l'attributaire est sélectionné parmi les
// entreprises/consultants déjà enregistrés pour ce marché (server/marches/
// marche-attributions.service.ts le vérifie explicitement).
export function MarcheAttributionTab({ marcheId, peutModifier }: Props) {
  const { data: attribution, isLoading } = useMarcheAttribution(marcheId);
  const { data: candidats } = useMarcheCandidats(marcheId);
  const enregistrer = useMarcheAttributionMutation(marcheId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  });

  useEffect(() => {
    reset(
      attribution
        ? {
            candidatAttributaireId: attribution.candidat_attributaire_id,
            montantAttribue: attribution.montant_attribue ?? undefined,
            dateAttribution: versChampDate(attribution.date_attribution),
            observations: attribution.observations ?? '',
          }
        : VIDE,
    );
  }, [attribution, reset]);

  const candidatParId = useMemo(() => new Map((candidats ?? []).map((c) => [c.id, c.nom])), [candidats]);

  const onSubmit = (values: FormValues) => {
    enregistrer.mutate({
      candidat_attributaire_id: values.candidatAttributaireId,
      montant_attribue: values.montantAttribue ?? null,
      date_attribution: values.dateAttribution || null,
      observations: values.observations || null,
    });
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!peutModifier) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attribution</CardTitle>
        </CardHeader>
        <CardContent>
          {attribution ? (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Ligne label="Attributaire">{candidatParId.get(attribution.candidat_attributaire_id) ?? '—'}</Ligne>
              <Ligne label="Montant attribué">{formatMontant(attribution.montant_attribue)}</Ligne>
              <Ligne label="Date d'attribution">{dateCourte(attribution.date_attribution)}</Ligne>
              <Ligne label="Observations">{attribution.observations ?? '—'}</Ligne>
            </dl>
          ) : (
            <EtatVide icone={Award} titre="Aucune attribution enregistrée" />
          )}
        </CardContent>
      </Card>
    );
  }

  if (!candidats || candidats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attribution</CardTitle>
        </CardHeader>
        <CardContent>
          <EtatVide
            icone={Award}
            titre="Aucun candidat"
            description="Ajoutez au moins un candidat (onglet Entreprises et consultants) avant d'enregistrer l'attribution."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attribution du marché</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-4">
          <Champ label="Entreprise / consultant attributaire" htmlFor="attribution-candidat" requis erreur={errors.candidatAttributaireId?.message}>
            <NativeSelect {...ariaErreur('attribution-candidat', errors.candidatAttributaireId)} {...register('candidatAttributaireId')}>
              <option value="">Sélectionner un candidat</option>
              {candidats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </NativeSelect>
          </Champ>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Champ label="Montant attribué (FCFA)" htmlFor="attribution-montant" erreur={errors.montantAttribue?.message}>
              <Input
                type="number"
                min={0}
                step="any"
                {...ariaErreur('attribution-montant', errors.montantAttribue)}
                {...register('montantAttribue', { setValueAs: nombreOuVide })}
              />
            </Champ>
            <Champ label="Date d'attribution" htmlFor="attribution-date">
              <Input id="attribution-date" type="date" {...register('dateAttribution')} />
            </Champ>
          </div>
          <Champ label="Observations" htmlFor="attribution-observations">
            <Textarea id="attribution-observations" rows={2} {...register('observations')} />
          </Champ>
          <Button type="submit" disabled={enregistrer.isPending}>
            {enregistrer.isPending && <LoaderCircle className="animate-spin" />}
            Enregistrer l'attribution
          </Button>
        </form>
        <Encart titre="Avis d'attribution" className="mt-5 max-w-2xl">
          Les avis d'attribution provisoire et définitive s'ajoutent depuis l'onglet Documents (joindre un document de type approprié,
          rattaché directement au marché).
        </Encart>
      </CardContent>
    </Card>
  );
}
