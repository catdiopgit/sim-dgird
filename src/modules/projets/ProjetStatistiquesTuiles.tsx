import { Card, Col, Row, Skeleton, Statistic } from 'antd';
import type { StatistiquesProjets } from '../../services/projets/statistiques';

interface Props {
  statistiques: StatistiquesProjets | undefined;
  chargement: boolean;
}

// Couleurs de statut (skill dataviz — palette réservée good/critical, jamais
// réutilisée pour une série catégorielle), même patron que
// CourrierStatistiquesTuiles.
const COULEUR_BON = '#0ca30c';
const COULEUR_CRITIQUE = '#d03b3b';

// Tuiles KPI partagées entre la page Statistiques complète et le résumé du
// tableau de bord.
export function ProjetStatistiquesTuiles({ statistiques, chargement }: Props) {
  if (chargement || !statistiques) return <Skeleton active paragraph={{ rows: 1 }} />;

  const tuiles = [
    { titre: 'Total projets', valeur: statistiques.totaux.total },
    { titre: 'En cours', valeur: statistiques.totaux.enCours },
    {
      titre: 'En retard',
      valeur: statistiques.totaux.enRetard,
      couleur: statistiques.totaux.enRetard > 0 ? COULEUR_CRITIQUE : undefined,
    },
    { titre: 'Clôturés', valeur: statistiques.totaux.clotures, couleur: COULEUR_BON },
    { titre: 'Avancement moyen', valeur: statistiques.avancementMoyen ?? 0, suffixe: '%' },
    { titre: '% financier décaissé', valeur: statistiques.financier.pourcentageDecaisse, suffixe: '%' },
  ];

  return (
    <Row gutter={16}>
      {tuiles.map((t) => (
        <Col key={t.titre} xs={12} sm={8} md={4} flex="1 1 160px">
          <Card size="small">
            <Statistic
              title={t.titre}
              value={t.valeur}
              suffix={'suffixe' in t ? t.suffixe : undefined}
              valueStyle={t.couleur ? { color: t.couleur } : undefined}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
