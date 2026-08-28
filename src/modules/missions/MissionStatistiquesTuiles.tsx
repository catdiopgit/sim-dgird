import { Card, Col, Row, Skeleton, Statistic } from 'antd';
import type { StatistiquesMissions } from '../../services/missions/statistiques';

interface Props {
  statistiques: StatistiquesMissions | undefined;
  chargement: boolean;
}

// Couleurs de statut (skill dataviz — palette réservée good/critical, jamais
// réutilisée pour une série catégorielle), même patron que
// ProjetStatistiquesTuiles.
const COULEUR_BON = '#0ca30c';
const COULEUR_CRITIQUE = '#d03b3b';

// Tuiles KPI partagées entre la page Statistiques complète et le résumé du
// tableau de bord.
export function MissionStatistiquesTuiles({ statistiques, chargement }: Props) {
  if (chargement || !statistiques) return <Skeleton active paragraph={{ rows: 1 }} />;

  const tuiles = [
    { titre: 'Total missions', valeur: statistiques.totaux.total },
    { titre: 'En cours', valeur: statistiques.totaux.enCours },
    {
      titre: 'En retard',
      valeur: statistiques.totaux.enRetard,
      couleur: statistiques.totaux.enRetard > 0 ? COULEUR_CRITIQUE : undefined,
    },
    { titre: 'Clôturées', valeur: statistiques.totaux.clotures, couleur: COULEUR_BON },
    { titre: 'Durée moyenne', valeur: statistiques.dureeMoyenneJours ?? 0, suffixe: 'j' },
    { titre: '% budget réalisé', valeur: statistiques.financier.pourcentageRealise, suffixe: '%' },
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
