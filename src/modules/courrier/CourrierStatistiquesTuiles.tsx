import { Card, Col, Row, Skeleton, Statistic } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { StatistiquesCourrier } from '../../services/courrier/statistiques';

interface Props {
  statistiques: StatistiquesCourrier | undefined;
  chargement: boolean;
}

// Couleurs de statut (skill dataviz — palette réservée good/critical, jamais
// réutilisée pour une série catégorielle) : clôturés = bon signal, en retard
// = signal critique. "En cours" et "Total" restent en encre neutre (ce ne
// sont pas des états problématiques).
const COULEUR_BON = '#0ca30c';
const COULEUR_CRITIQUE = '#d03b3b';

// Tuiles KPI partagées entre la page Statistiques complète et le résumé du
// tableau de bord — un seul rendu à maintenir.
export function CourrierStatistiquesTuiles({ statistiques, chargement }: Props) {
  const navigate = useNavigate();

  if (chargement || !statistiques) return <Skeleton active paragraph={{ rows: 1 }} />;

  const tuiles = [
    { titre: 'Total', valeur: statistiques.totaux.total },
    { titre: 'En cours', valeur: statistiques.parEtat.enCours },
    {
      titre: 'En retard',
      valeur: statistiques.parEtat.enRetard,
      couleur: statistiques.parEtat.enRetard > 0 ? COULEUR_CRITIQUE : undefined,
      onClick: () => navigate('/courriers?vue=en_retard'),
    },
    {
      titre: 'Clôturés',
      valeur: statistiques.parEtat.clotures,
      couleur: COULEUR_BON,
      onClick: () => navigate('/courriers?vue=archives'),
    },
    {
      titre: 'Délai moyen de traitement',
      valeur: statistiques.delaiMoyenJours ?? '—',
      suffixe: statistiques.delaiMoyenJours !== null ? ' j' : '',
    },
  ];

  return (
    <Row gutter={16}>
      {tuiles.map((t) => (
        <Col key={t.titre} xs={12} sm={8} md={4} flex="1 1 160px">
          <Card size="small" hoverable={Boolean(t.onClick)} onClick={t.onClick} style={{ cursor: t.onClick ? 'pointer' : 'default' }}>
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
