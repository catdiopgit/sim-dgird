import { CalendarClock, Compass, KanbanSquare, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EcheanceProchaine } from '../../services/dashboard/echeances';
import type { StatistiquesCourrier } from '../../services/courrier/statistiques';
import type { StatistiquesMissions } from '../../services/missions/statistiques';
import type { StatistiquesProjets } from '../../services/projets/statistiques';
import { KpiCard, type KpiEvolution } from './KpiCard';
import { serieEvolution } from '../../utils/serieEvolution';
import { usePeriodeStore } from './usePeriodeStore';

interface BlocDonnees<T> {
  data?: T;
  loading: boolean;
}

interface Props {
  courrier: BlocDonnees<StatistiquesCourrier> & { dataPrecedente?: StatistiquesCourrier };
  projets: BlocDonnees<StatistiquesProjets> & { dataPrecedente?: StatistiquesProjets };
  missions: BlocDonnees<StatistiquesMissions> & { dataPrecedente?: StatistiquesMissions };
  echeances: BlocDonnees<EcheanceProchaine[]>;
}

// Aucune évolution "% infinie" affichée quand la période précédente est à
// zéro (division par zéro) : on masque l'évolution plutôt que d'inventer un
// chiffre (§9/§10 du brief).
function evolution(actuel: number | undefined, precedent: number | undefined, sensPositif: (delta: number) => boolean | null): KpiEvolution | null {
  if (actuel === undefined || precedent === undefined || precedent === 0) return null;
  const pourcentage = ((actuel - precedent) / precedent) * 100;
  return { pourcentage, sensPositif: sensPositif(pourcentage) };
}

export function KpiGrid({ courrier, projets, missions, echeances }: Props) {
  const navigate = useNavigate();
  const periode = usePeriodeStore((s) => s.periode);

  const echeancesDepassees = echeances.data?.filter((e) => e.enRetard).length;
  const echeancesProches = echeances.data ? echeances.data.length - (echeancesDepassees ?? 0) : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icone={<Mail />}
        titre="Courriers"
        valeur={courrier.data?.totaux.total ?? null}
        chargement={courrier.loading}
        onClick={() => navigate('/courriers')}
        tendance={courrier.data ? serieEvolution(courrier.data.evolution, periode.debut, periode.fin).serie.map((p) => p.total) : undefined}
        evolution={evolution(courrier.data?.totaux.total, courrier.dataPrecedente?.totaux.total, () => null)}
        sousValeurs={
          courrier.data
            ? [
                { libelle: 'À traiter', valeur: courrier.data.parEtat.enCours, onClick: () => navigate('/courriers?vue=a_traiter') },
                {
                  libelle: 'En retard',
                  valeur: courrier.data.parEtat.enRetard,
                  ton: 'critique',
                  onClick: () => navigate('/courriers?vue=en_retard'),
                },
              ]
            : undefined
        }
      />
      <KpiCard
        icone={<KanbanSquare />}
        titre="Projets"
        valeur={projets.data?.totaux.total ?? null}
        chargement={projets.loading}
        onClick={() => navigate('/projets')}
        evolution={evolution(projets.data?.totaux.total, projets.dataPrecedente?.totaux.total, () => null)}
        sousValeurs={
          projets.data
            ? [
                { libelle: 'Actifs', valeur: projets.data.totaux.enCours },
                { libelle: 'Terminés', valeur: projets.data.totaux.clotures, ton: 'succes' },
                { libelle: 'En retard', valeur: projets.data.totaux.enRetard, ton: 'critique' },
              ]
            : undefined
        }
      />
      <KpiCard
        icone={<Compass />}
        titre="Missions"
        valeur={missions.data?.totaux.total ?? null}
        chargement={missions.loading}
        onClick={() => navigate('/missions')}
        evolution={evolution(missions.data?.totaux.total, missions.dataPrecedente?.totaux.total, () => null)}
        sousValeurs={
          missions.data
            ? [
                { libelle: 'En cours', valeur: missions.data.totaux.enCours },
                { libelle: 'Terminées', valeur: missions.data.totaux.clotures, ton: 'succes' },
                { libelle: 'En retard', valeur: missions.data.totaux.enRetard, ton: 'critique' },
              ]
            : undefined
        }
      />
      <KpiCard
        icone={<CalendarClock />}
        titre="Échéances à 30 jours"
        valeur={echeances.data ? echeances.data.length : null}
        chargement={echeances.loading}
        sousValeurs={
          echeances.data !== undefined
            ? [
                { libelle: 'Proches', valeur: echeancesProches ?? 0 },
                { libelle: 'Dépassées', valeur: echeancesDepassees ?? 0, ton: 'critique' },
              ]
            : undefined
        }
      />
    </div>
  );
}
