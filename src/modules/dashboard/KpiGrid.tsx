import { CalendarOutlined, CompassOutlined, MailOutlined, ProjectOutlined } from '@ant-design/icons';
import { Col, Row, theme } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { EcheanceProchaine } from '../../services/dashboard/echeances';
import type { StatistiquesCourrier } from '../../services/courrier/statistiques';
import type { StatistiquesMissions } from '../../services/missions/statistiques';
import type { StatistiquesProjets } from '../../services/projets/statistiques';
import { KpiCard, type KpiEvolution } from './KpiCard';

interface BlocDonnees<T> {
  data?: T;
  loading: boolean;
}

interface Props {
  courrier: BlocDonnees<StatistiquesCourrier> & { dataPrecedente?: StatistiquesCourrier };
  projets: BlocDonnees<StatistiquesProjets>;
  missions: BlocDonnees<StatistiquesMissions>;
  echeances: BlocDonnees<EcheanceProchaine[]>;
}

// Aucune évolution "% infinie" affichée quand la période précédente est à
// zéro (division par zéro) : on masque l'évolution plutôt que d'inventer un
// chiffre (§9/§10 du brief).
function evolution(actuel: number | undefined, precedent: number | undefined, sensPositif: (delta: number) => boolean): KpiEvolution | null {
  if (actuel === undefined || precedent === undefined || precedent === 0) return null;
  const pourcentage = ((actuel - precedent) / precedent) * 100;
  return { pourcentage, sensPositif: sensPositif(pourcentage) };
}

export function KpiGrid({ courrier, projets, missions, echeances }: Props) {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const echeancesDepassees = echeances.data?.filter((e) => e.enRetard).length;
  const echeancesProches = echeances.data ? echeances.data.length - (echeancesDepassees ?? 0) : undefined;

  const cards = [
    {
      key: 'courrier',
      icone: <MailOutlined />,
      titre: 'Courriers',
      valeur: courrier.data?.totaux.total ?? null,
      chargement: courrier.loading,
      onClick: () => navigate('/courriers'),
      sousValeurs: courrier.data
        ? [
            { libelle: 'À traiter', valeur: courrier.data.parEtat.enCours, onClick: () => navigate('/courriers?vue=en_cours') },
            {
              libelle: 'En retard',
              valeur: courrier.data.parEtat.enRetard,
              couleur: courrier.data.parEtat.enRetard > 0 ? token.colorError : undefined,
              onClick: () => navigate('/courriers?vue=en_retard'),
            },
          ]
        : undefined,
      evolution: evolution(courrier.data?.totaux.total, courrier.dataPrecedente?.totaux.total, () => true),
    },
    {
      key: 'projets',
      icone: <ProjectOutlined />,
      titre: 'Projets',
      valeur: projets.data?.totaux.total ?? null,
      chargement: projets.loading,
      onClick: () => navigate('/projets'),
      sousValeurs: projets.data
        ? [
            { libelle: 'Actifs', valeur: projets.data.totaux.enCours },
            { libelle: 'Terminés', valeur: projets.data.totaux.clotures, couleur: token.colorSuccess },
            {
              libelle: 'En retard',
              valeur: projets.data.totaux.enRetard,
              couleur: projets.data.totaux.enRetard > 0 ? token.colorError : undefined,
            },
          ]
        : undefined,
    },
    {
      key: 'missions',
      icone: <CompassOutlined />,
      titre: 'Missions',
      valeur: missions.data?.totaux.total ?? null,
      chargement: missions.loading,
      onClick: () => navigate('/missions'),
      sousValeurs: missions.data
        ? [
            { libelle: 'En cours', valeur: missions.data.totaux.enCours },
            { libelle: 'Terminées', valeur: missions.data.totaux.clotures, couleur: token.colorSuccess },
            {
              libelle: 'En retard',
              valeur: missions.data.totaux.enRetard,
              couleur: missions.data.totaux.enRetard > 0 ? token.colorError : undefined,
            },
          ]
        : undefined,
    },
    {
      key: 'echeances',
      icone: <CalendarOutlined />,
      titre: 'Échéances',
      valeur: echeances.data ? echeances.data.length : null,
      chargement: echeances.loading,
      sousValeurs:
        echeances.data !== undefined
          ? [
              { libelle: 'Proches', valeur: echeancesProches ?? 0 },
              {
                libelle: 'Dépassées',
                valeur: echeancesDepassees ?? 0,
                couleur: (echeancesDepassees ?? 0) > 0 ? token.colorError : undefined,
              },
            ]
          : undefined,
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((c) => (
        <Col key={c.key} xs={24} sm={12} lg={6}>
          <KpiCard
            icone={c.icone}
            titre={c.titre}
            valeur={c.valeur}
            chargement={c.chargement}
            onClick={c.onClick}
            sousValeurs={c.sousValeurs}
            evolution={'evolution' in c ? c.evolution : undefined}
          />
        </Col>
      ))}
    </Row>
  );
}
