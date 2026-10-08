import { AlarmClock, CircleCheck, Loader } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import type { StatistiquesCourrierParEtat } from '../../services/courrier/statistiques';

interface Props {
  parEtat: StatistiquesCourrierParEtat | undefined;
  delaiMoyenJours: number | null | undefined;
  chargement: boolean;
}

// Répartition limitée aux 3 états réellement distingués par
// fn_statistiques_courrier (en cours / en retard / clôturés) — pas de
// catégorie "en attente" inventée (§9 du brief). Ordre traités | en cours |
// en retard : le bleu sépare le vert et le rouge (lisible en daltonisme).
export function MailStatusBreakdown({ parEtat, delaiMoyenJours, chargement }: Props) {
  const segments = parEtat
    ? [
        { cle: 'clotures', libelle: 'Traités', valeur: parEtat.clotures, couleur: 'var(--st-good)', Icone: CircleCheck },
        { cle: 'enCours', libelle: 'En cours', valeur: parEtat.enCours, couleur: 'var(--st-info)', Icone: Loader },
        { cle: 'enRetard', libelle: 'En retard', valeur: parEtat.enRetard, couleur: 'var(--st-crit)', Icone: AlarmClock },
      ]
    : [];
  const total = segments.reduce((s, d) => s + d.valeur, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const visibles = segments.filter((s) => s.valeur > 0);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>État des courriers</CardTitle>
          <CardDescription>Répartition des courriers de la période</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {chargement ? (
          <Skeleton className="h-40 w-full" />
        ) : total === 0 ? (
          <div className="grid flex-1 place-items-center py-10 text-[13px] text-muted-foreground">Aucune donnée sur la période</div>
        ) : (
          <>
            <div className="mb-4 mt-1">
              <div className="text-[34px] font-semibold leading-none">{pct(parEtat!.clotures)} %</div>
              <div className="mt-1.5 text-[13px] text-muted-foreground">
                traités
                {delaiMoyenJours != null && (
                  <>
                    {' '}· délai moyen{' '}
                    <span className="font-medium text-foreground">
                      {delaiMoyenJours.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} jours
                    </span>
                  </>
                )}
              </div>
            </div>
            <div
              className="mb-5 flex h-3.5 gap-[2px]"
              role="img"
              aria-label={segments.map((s) => `${s.libelle} ${s.valeur}`).join(', ')}
            >
              {visibles.map((s, i) => (
                <div
                  key={s.cle}
                  title={`${s.libelle} : ${s.valeur} (${pct(s.valeur)} %)`}
                  className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === visibles.length - 1 ? 'rounded-r-full' : ''}`}
                  style={{ width: `${(s.valeur / total) * 100}%`, minWidth: 6, background: s.couleur }}
                />
              ))}
            </div>
            <ul className="space-y-3">
              {segments.map(({ cle, libelle, valeur, couleur, Icone }) => (
                <li key={cle} className="flex items-center gap-3 text-[13px]">
                  <span
                    className="grid size-7 place-items-center rounded-md"
                    style={{ background: `color-mix(in srgb, ${couleur} 14%, transparent)`, color: couleur }}
                  >
                    <Icone className="size-3.5" />
                  </span>
                  <span className="flex-1">{libelle}</span>
                  <span className="font-semibold tabular-nums">{valeur}</span>
                  <span className="w-12 whitespace-nowrap text-right tabular-nums text-muted-foreground">{pct(valeur)} %</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
