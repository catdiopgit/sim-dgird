import { Badge } from '../../components/ui/badge';
import type { Marche } from '../../services/marches/marches';
import type { StatutCalculePhase } from '../../services/marches/phasesMarche';
import { LIBELLES_STATUT_PHASE } from './statutPhase';

// Pastille de couleur par statut calculé de phase (§13) : couleurs de statut
// de la charte (jamais la couleur seule, toujours avec le libellé).
const COULEUR_STATUT_PHASE: Record<StatutCalculePhase, string> = {
  a_venir: 'var(--st-neutral)',
  en_cours: 'var(--st-info)',
  en_retard: 'var(--st-crit)',
  realisee_a_temps: 'var(--st-good)',
  realisee_avance: 'var(--st-good)',
  realisee_retard: 'var(--st-warn)',
};

export function BadgeStatutPhase({ statut }: { statut: StatutCalculePhase }) {
  return (
    <Badge shape="pill">
      <span className="size-2 rounded-full" style={{ background: COULEUR_STATUT_PHASE[statut] }} />
      {LIBELLES_STATUT_PHASE[statut]}
    </Badge>
  );
}

export function BadgeStatutMarche({ statut }: { statut: Marche['statut_cloture'] }) {
  return statut === 'cloture' ? (
    <Badge variant="success" shape="pill">
      Clôturé
    </Badge>
  ) : (
    <Badge shape="pill">
      <span className="size-2 rounded-full" style={{ background: 'var(--st-info)' }} />
      En cours
    </Badge>
  );
}
