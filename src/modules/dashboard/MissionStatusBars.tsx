import type { StatistiquesMissionsRepartition } from '../../services/missions/statistiques';
import { HorizontalBars } from './HorizontalBars';

interface Props {
  parEtape: StatistiquesMissionsRepartition[] | undefined;
}

export function MissionStatusBars({ parEtape }: Props) {
  return (
    <HorizontalBars
      titre="Missions par étape"
      lien={{ vers: '/missions', libelle: 'Voir les missions' }}
      vide="Aucune mission sur la période"
      barres={(parEtape ?? []).map((d, i) => ({ cle: d.code ?? d.id ?? String(i), libelle: d.libelle, total: d.total }))}
    />
  );
}
