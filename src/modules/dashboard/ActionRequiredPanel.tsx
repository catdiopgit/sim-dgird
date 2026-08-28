import { Card, Empty, theme, Typography } from 'antd';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EcheanceProchaine } from '../../services/dashboard/echeances';
import type { StatistiquesCourrier } from '../../services/courrier/statistiques';
import type { StatistiquesMissions } from '../../services/missions/statistiques';
import type { StatistiquesProjets } from '../../services/projets/statistiques';

interface Props {
  courrier: StatistiquesCourrier | undefined;
  projets: StatistiquesProjets | undefined;
  missions: StatistiquesMissions | undefined;
  echeances: EcheanceProchaine[] | undefined;
}

type Niveau = 'critique' | 'important';

interface ElementATraiter {
  cle: string;
  libelle: string;
  niveau: Niveau;
  onClick: () => void;
}

// §16 du brief : le rouge reste réservé aux situations nécessitant vraiment
// une intervention (retards, échéances dépassées) ; le reste (à traiter, en
// attente) reste en orange.
export function ActionRequiredPanel({ courrier, projets, missions, echeances }: Props) {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const elements = useMemo<ElementATraiter[]>(() => {
    const items: ElementATraiter[] = [];

    if (courrier && courrier.parEtat.enRetard > 0) {
      items.push({
        cle: 'courrier-retard',
        libelle: `${courrier.parEtat.enRetard} courrier${courrier.parEtat.enRetard > 1 ? 's' : ''} en retard`,
        niveau: 'critique',
        onClick: () => navigate('/courriers?vue=en_retard'),
      });
    }
    if (courrier && courrier.parEtat.enCours > 0) {
      items.push({
        cle: 'courrier-a-traiter',
        libelle: `${courrier.parEtat.enCours} courrier${courrier.parEtat.enCours > 1 ? 's' : ''} à traiter`,
        niveau: 'important',
        onClick: () => navigate('/courriers?vue=en_cours'),
      });
    }
    if (projets && projets.totaux.enRetard > 0) {
      items.push({
        cle: 'projets-retard',
        libelle: `${projets.totaux.enRetard} projet${projets.totaux.enRetard > 1 ? 's' : ''} avec échéance dépassée`,
        niveau: 'critique',
        onClick: () => navigate('/projets'),
      });
    }
    if (missions && missions.totaux.enRetard > 0) {
      items.push({
        cle: 'missions-retard',
        libelle: `${missions.totaux.enRetard} mission${missions.totaux.enRetard > 1 ? 's' : ''} en retard`,
        niveau: 'critique',
        onClick: () => navigate('/missions'),
      });
    }

    const echeancesDepassees = (echeances ?? []).filter((e) => e.enRetard);
    if (echeancesDepassees.length > 0) {
      items.push({
        cle: 'echeances-depassees',
        libelle: `${echeancesDepassees.length} échéance${echeancesDepassees.length > 1 ? 's' : ''} dépassée${echeancesDepassees.length > 1 ? 's' : ''}`,
        niveau: 'critique',
        onClick: () => {
          const premiere = echeancesDepassees[0];
          navigate(premiere.type === 'livrable' ? `/projets/${premiere.lienId}` : `/missions/${premiere.lienId}`);
        },
      });
    }

    return items;
  }, [courrier, projets, missions, echeances, navigate]);

  return (
    <Card size="small" title="À traiter" style={{ height: '100%' }}>
      {elements.length === 0 ? (
        <Empty description="Rien à traiter" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {elements.map((e) => (
            <div
              key={e.cle}
              onClick={e.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: e.niveau === 'critique' ? token.colorError : token.colorWarning,
                  flexShrink: 0,
                }}
              />
              <Typography.Text>{e.libelle}</Typography.Text>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
