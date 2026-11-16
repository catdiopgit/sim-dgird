import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import type { ValeurListe } from '../../services/administration/parametrage';
import type { Projet } from '../../services/projets/projets';
import { couleurReferentiel } from '../../utils/couleurReferentiel';

// Badge d'une valeur de référentiel (statut, priorité…) : pastille à la
// couleur paramétrée + libellé (jamais la couleur seule).
export function BadgeValeur({ valeur }: { valeur: Pick<ValeurListe, 'libelle' | 'couleur'> | null | undefined }) {
  if (!valeur) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge shape="pill">
      <span className="size-2 rounded-full" style={{ background: couleurReferentiel(valeur.couleur) ?? 'var(--st-neutral)' }} />
      {valeur.libelle}
    </Badge>
  );
}

export function BadgeCloture({ statut }: { statut: Projet['cloture_statut'] }) {
  if (statut === 'confirmee') return <Badge variant="success" shape="pill">Clôturé</Badge>;
  if (statut === 'demandee') return <Badge variant="warning" shape="pill">Clôture en attente</Badge>;
  if (statut === 'rejetee') return <Badge variant="critical" shape="pill">Clôture rejetée</Badge>;
  return null;
}

export function BarreAvancement({ pct, className }: { pct: number; className?: string }) {
  const valeur = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={valeur}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avancement"
      >
        <div className={cn('h-full rounded-full', valeur >= 100 ? 'bg-good' : 'bg-primary')} style={{ width: `${valeur}%` }} />
      </div>
      <span className="w-11 shrink-0 whitespace-nowrap text-right text-[12px] font-medium tabular-nums">{valeur} %</span>
    </div>
  );
}

// Évolution A (recette 2026-11) : le retard est calculé, plus seulement saisi.
// - Projet : date de fin prévue dépassée, sans clôture confirmée, et statut ni
//   terminé, ni suspendu, ni annulé.
// - Livrable : date prévue dépassée et livrable ni réalisé, ni validé, ni annulé.
// Un statut « en-retard » choisi à la main compte aussi. Même règle côté
// serveur (StatistiquesService) pour les tableaux de bord.
const STATUTS_PROJET_HORS_RETARD = new Set(['termine', 'suspendu', 'annule']);
const STATUTS_LIVRABLE_HORS_RETARD = new Set(['realise', 'valide', 'annule']);

function dateDepassee(date: string | null | undefined): boolean {
  if (!date) return false;
  const aujourdhui = new Date();
  const jour = `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}-${String(aujourdhui.getDate()).padStart(2, '0')}`;
  return date.slice(0, 10) < jour;
}

export function projetEnRetard(
  p: Pick<Projet, 'date_fin_prevue' | 'cloture_statut'>,
  codeStatut: string | null | undefined,
): boolean {
  if (p.cloture_statut === 'confirmee') return false;
  if (codeStatut === 'en-retard') return true;
  if (codeStatut && STATUTS_PROJET_HORS_RETARD.has(codeStatut)) return false;
  return dateDepassee(p.date_fin_prevue);
}

export function livrableEnRetard(
  l: { date_prevue: string | null },
  codeStatut: string | null | undefined,
): boolean {
  if (codeStatut === 'en-retard') return true;
  if (codeStatut && STATUTS_LIVRABLE_HORS_RETARD.has(codeStatut)) return false;
  return dateDepassee(l.date_prevue);
}

// Pastille « En retard » affichée à côté du statut quand le retard est calculé
// (inutile si le statut saisi est déjà « en-retard »).
export function BadgeRetard({ enRetard, codeStatut }: { enRetard: boolean; codeStatut: string | null | undefined }) {
  if (!enRetard || codeStatut === 'en-retard') return null;
  return (
    <Badge variant="critical" shape="pill">
      En retard
    </Badge>
  );
}
