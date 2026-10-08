import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BarresRepartition } from '../../components/stats/stats';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export interface Barre {
  cle: string;
  libelle: string;
  total: number;
  couleur?: string;
}

interface Props {
  titre: string;
  lien?: { vers: string; libelle: string };
  barres: Barre[];
  vide: ReactNode;
}

// Équivalent léger d'un BarChart horizontal Recharts : quelques catégories,
// libellés et valeurs toujours visibles (pas d'information portée par la
// seule couleur), infobulle native au survol.
export function HorizontalBars({ titre, lien, barres, vide }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titre}</CardTitle>
        {lien && (
          <Link to={lien.vers} className="shrink-0 text-[12px] font-medium text-primary hover:underline">
            {lien.libelle}
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {barres.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-muted-foreground">{vide}</div>
        ) : (
          <BarresRepartition donnees={barres} largeurLibelle={132} />
        )}
      </CardContent>
    </Card>
  );
}
