import { Badge } from '../../components/ui/badge';
import type { GedVersement } from '../../services/ged/versements';

export function StatutVersement({ versement }: { versement: Pick<GedVersement, 'brouillon' | 'etape_libelle'> }) {
  if (versement.brouillon) {
    return (
      <Badge variant="outline" shape="pill">
        Brouillon
      </Badge>
    );
  }
  return versement.etape_libelle ? (
    <Badge variant="muted" shape="pill">
      {versement.etape_libelle}
    </Badge>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}
