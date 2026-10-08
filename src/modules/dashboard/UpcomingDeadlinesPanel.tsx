import { fr } from '../../utils/dateFr';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';
import type { EcheanceProchaine } from '../../services/dashboard/echeances';

interface Props {
  echeances: EcheanceProchaine[] | undefined;
  chargement: boolean;
}

export function UpcomingDeadlinesPanel({ echeances, chargement }: Props) {
  const navigate = useNavigate();
  const liste = [...(echeances ?? [])].sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance)).slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Prochaines échéances</CardTitle>
        <span className="text-[12px] text-muted-foreground">30 jours</span>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {chargement ? (
          <div className="space-y-3 px-3 py-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : liste.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-muted-foreground">Aucune échéance prochaine</div>
        ) : (
          <ul>
            {liste.map((e) => (
              <li key={`${e.type}-${e.id}`}>
                <button
                  type="button"
                  onClick={() => navigate(e.type === 'livrable' ? `/projets/${e.lienId}` : `/missions/${e.lienId}`)}
                  className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                >
                  <span
                    className={cn(
                      'w-12 shrink-0 rounded-md border py-1 text-center',
                      e.enRetard ? 'border-crit/40 bg-crit/8 text-crit-text' : 'border-border text-muted-foreground',
                    )}
                  >
                    <span className="block text-[15px] font-semibold leading-none tabular-nums">{fr(e.dateEcheance).format('D')}</span>
                    <span className="mt-0.5 block text-[10px] uppercase">{fr(e.dateEcheance).format('MMM').replace('.', '')}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium leading-snug">{e.libelle}</span>
                    <span className="block text-[12px] text-muted-foreground">
                      {e.reference}
                      {e.enRetard && <span className="font-medium text-crit-text"> · Dépassée</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
