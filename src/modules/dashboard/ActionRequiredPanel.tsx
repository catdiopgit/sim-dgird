import { AlarmClock, ChevronRight, CircleCheck, CircleDot } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import type { EcheanceProchaine } from '../../services/dashboard/echeances';
import type { StatistiquesCourrier } from '../../services/courrier/statistiques';
import type { StatistiquesMissions } from '../../services/missions/statistiques';
import type { StatistiquesProjets } from '../../services/projets/statistiques';

interface Props {
  courrier: StatistiquesCourrier | undefined;
  projets: StatistiquesProjets | undefined;
  missions: StatistiquesMissions | undefined;
  echeances: EcheanceProchaine[] | undefined;
}

type Niveau = 'critique' | 'important';

interface ElementATraiter {
  cle: string;
  libelle: string;
  detail?: string;
  niveau: Niveau;
  onClick: () => void;
}

const pluriel = (n: number, s = 's') => (n > 1 ? s : '');

// §16 du brief : le rouge reste réservé aux situations nécessitant vraiment
// une intervention (retards, échéances dépassées) ; le reste (à traiter, en
// attente) reste en orange. Les échéances dépassées (ex-AlertsPanel) sont
// regroupées ici avec leur première occurrence en détail.
export function ActionRequiredPanel({ courrier, projets, missions, echeances }: Props) {
  const navigate = useNavigate();

  const elements = useMemo<ElementATraiter[]>(() => {
    const items: ElementATraiter[] = [];

    if (courrier && courrier.parEtat.enRetard > 0) {
      const n = courrier.parEtat.enRetard;
      items.push({ cle: 'courrier-retard', libelle: `${n} courrier${pluriel(n)} en retard`, niveau: 'critique', onClick: () => navigate('/courriers?vue=en_retard') });
    }
    if (projets && projets.totaux.enRetard > 0) {
      const n = projets.totaux.enRetard;
      items.push({ cle: 'projets-retard', libelle: `${n} projet${pluriel(n)} avec échéance dépassée`, niveau: 'critique', onClick: () => navigate('/projets') });
    }
    if (missions && missions.totaux.enRetard > 0) {
      const n = missions.totaux.enRetard;
      items.push({ cle: 'missions-retard', libelle: `${n} mission${pluriel(n)} en retard`, niveau: 'critique', onClick: () => navigate('/missions') });
    }

    const depassees = (echeances ?? []).filter((e) => e.enRetard).sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance));
    if (depassees.length > 0) {
      const premiere = depassees[0];
      items.push({
        cle: 'echeances-depassees',
        libelle: `${depassees.length} échéance${pluriel(depassees.length)} dépassée${pluriel(depassees.length)}`,
        detail: `${premiere.libelle} — ${premiere.reference}`,
        niveau: 'critique',
        onClick: () => navigate(premiere.type === 'livrable' ? `/projets/${premiere.lienId}` : `/missions/${premiere.lienId}`),
      });
    }

    if (courrier && courrier.parEtat.enCours > 0) {
      const n = courrier.parEtat.enCours;
      items.push({ cle: 'courrier-a-traiter', libelle: `${n} courrier${pluriel(n)} à traiter`, niveau: 'important', onClick: () => navigate('/courriers?vue=a_traiter') });
    }

    return items;
  }, [courrier, projets, missions, echeances, navigate]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>À traiter</CardTitle>
        {elements.length > 0 && <span className="text-[12px] text-muted-foreground">{elements.length} point{pluriel(elements.length)}</span>}
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {elements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-[13px] text-muted-foreground">
            <CircleCheck className="size-6 text-good" />
            Rien à traiter
          </div>
        ) : (
          <ul>
            {elements.map((e) => (
              <li key={e.cle}>
                <button
                  type="button"
                  onClick={e.onClick}
                  className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                >
                  <span
                    className={cn(
                      'mt-0.5 grid size-6 shrink-0 place-items-center rounded-md',
                      e.niveau === 'critique' ? 'bg-crit/12 text-crit-text' : 'bg-warn/20 text-warn-text',
                    )}
                  >
                    {e.niveau === 'critique' ? <AlarmClock className="size-3.5" /> : <CircleDot className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{e.libelle}</span>
                    {e.detail && <span className="block truncate text-[12px] text-muted-foreground">{e.detail}</span>}
                  </span>
                  <ChevronRight className="mt-1 size-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
