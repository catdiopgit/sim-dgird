import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import type { StatistiquesProjets } from '../../services/projets/statistiques';
import { montantCourt } from '../../utils/format';

interface Props {
  projets: StatistiquesProjets | undefined;
  chargement: boolean;
}

export function ProjetsFinancierCard({ projets, chargement }: Props) {
  const f = projets?.financier;
  const l = projets?.livrables;
  const pct = f ? Math.round(f.pourcentageDecaisse) : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Exécution financière des projets</CardTitle>
          <CardDescription>Montant contractuel, avenants inclus</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {chargement ? (
          <Skeleton className="h-36 w-full" />
        ) : !f || f.montantContractuel === 0 ? (
          <div className="grid flex-1 place-items-center py-10 text-[13px] text-muted-foreground">Aucun montant sur la période</div>
        ) : (
          <>
            <div className="text-[34px] font-semibold leading-none">{pct} %</div>
            <div className="mt-1.5 text-[13px] text-muted-foreground">
              décaissés · <span className="font-medium tabular-nums text-foreground">{montantCourt(f.montantDecaisse)}</span> sur{' '}
              <span className="tabular-nums">{montantCourt(f.montantContractuel)} FCFA</span>
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Part décaissée"
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <dl className="mt-auto grid grid-cols-2 gap-3 pt-5 text-[13px]">
              <div className="rounded-lg bg-muted/70 p-3">
                <dt className="text-[12px] text-muted-foreground">Reste à décaisser</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{montantCourt(f.resteADecaisser)} FCFA</dd>
              </div>
              <div className="rounded-lg bg-muted/70 p-3">
                <dt className="text-[12px] text-muted-foreground">Livrables réalisés</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {l ? `${l.realises} / ${l.total} · ${Math.round(l.tauxRealisation)} %` : '—'}
                </dd>
              </div>
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
}
