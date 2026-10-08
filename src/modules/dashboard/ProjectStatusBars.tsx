import type { StatistiquesProjetsRepartition } from '../../services/projets/statistiques';
import { couleurReferentiel } from '../../utils/couleurReferentiel';
import { HorizontalBars } from './HorizontalBars';

interface Props {
  parEtat: StatistiquesProjetsRepartition[] | undefined;
}

// La couleur de chaque état vient du référentiel (listes de valeurs) quand
// elle est paramétrée, comme avant la refonte.
export function ProjectStatusBars({ parEtat }: Props) {
  return (
    <HorizontalBars
      titre="Projets par état"
      lien={{ vers: '/projets', libelle: 'Voir les projets' }}
      vide="Aucun projet sur la période"
      barres={(parEtat ?? []).map((d) => ({ cle: d.id, libelle: d.libelle, total: d.total, couleur: couleurReferentiel(d.couleur) }))}
    />
  );
}
