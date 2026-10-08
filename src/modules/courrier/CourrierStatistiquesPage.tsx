import dayjs, { type Dayjs } from 'dayjs';
import { Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EvolutionBarres } from '../../components/stats/EvolutionBarres';
import { BarresRepartition, ChartCard, PeriodeFiltre, StatTile, StatTiles, type PresetPeriode } from '../../components/stats/stats';
import { Button } from '../../components/ui/button';
import { PageHeader } from '../../components/ui/page-header';
import { useEnteteDocument } from '../../hooks/administration/useEnteteDocument';
import { useOrganisation } from '../../hooks/administration/useOrganisation';
import { useStatistiquesCourrier } from '../../hooks/courrier/useStatistiquesCourrier';
import { useProfile } from '../../hooks/useProfile';
import { serieEvolution } from '../../utils/serieEvolution';
import { EnteteDocumentImprime } from './EnteteDocumentImprime';

// Ordre catégoriel fixe (jamais recalculé/cyclé) pour entrant/sortant/interne —
// trois premiers créneaux de la palette validée (daltonisme), libellés toujours
// affichés à côté de la barre.
const COULEURS_SENS = { entrant: '#2a78d6', sortant: '#eb6834', interne: '#1baf7a' } as const;

const PRESETS: PresetPeriode[] = [
  { libelle: '7 derniers jours', periode: () => [dayjs().subtract(6, 'day').startOf('day'), dayjs().startOf('day')] },
  { libelle: '30 derniers jours', periode: () => [dayjs().subtract(29, 'day').startOf('day'), dayjs().startOf('day')] },
  { libelle: '12 derniers mois', periode: () => [dayjs().subtract(1, 'year').startOf('day'), dayjs().startOf('day')] },
];

// Page Statistiques du module Courrier (plan V6) : indicateurs agrégés
// côté serveur (public.fn_statistiques_courrier), bornés à ce que
// l'utilisateur courant peut voir (app.can_view_courrier — même périmètre
// que les bannettes). Une seule fonction serveur, un seul appel réseau.
export function CourrierStatistiquesPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: organisation } = useOrganisation(organisationId);
  const entete = useEnteteDocument(organisationId);
  const [periode, setPeriode] = useState<[Dayjs, Dayjs]>(PRESETS[1].periode);

  const dateDebut = periode[0].format('YYYY-MM-DD');
  const dateFin = periode[1].format('YYYY-MM-DD');
  const { data: statistiques, isLoading } = useStatistiquesCourrier(dateDebut, dateFin);

  const { granularite, serie } = useMemo(
    () => serieEvolution(statistiques?.evolution ?? [], periode[0].startOf('day'), periode[1].endOf('day')),
    [statistiques, periode],
  );
  const totalEvolution = serie.reduce((s, p) => s + p.total, 0);

  const t = statistiques;

  return (
    <div className="space-y-5">
      <PageHeader
        retour={{ vers: '/courriers', libelle: 'Courriers' }}
        titre="Statistiques courrier"
        description="Volumes, états et délais de traitement sur la période choisie"
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="text-muted-foreground" />
            Imprimer
          </Button>
        }
      />

      <PeriodeFiltre
        periode={periode}
        onChange={(p) => p && setPeriode(p)}
        presets={PRESETS}
      />

      <div className="zone-imprimable space-y-5">
        {/* En-tête + repère de période uniquement visibles à l'impression :
            l'en-tête interactif ci-dessus (boutons, sélecteur de période)
            est hors de .zone-imprimable. */}
        <div className="titre-impression" style={{ display: 'none' }}>
          <EnteteDocumentImprime organisation={organisation} entete={entete} titre="STATISTIQUES COURRIER" />
          <p className="-mt-2 text-center">
            Période du {periode[0].format('DD/MM/YYYY')} au {periode[1].format('DD/MM/YYYY')}
          </p>
        </div>

        <StatTiles>
          <StatTile titre="Total" valeur={t?.totaux.total ?? 0} chargement={isLoading} />
          <StatTile titre="En cours" valeur={t?.parEtat.enCours ?? 0} chargement={isLoading} />
          <StatTile
            titre="En retard"
            valeur={t?.parEtat.enRetard ?? 0}
            ton={(t?.parEtat.enRetard ?? 0) > 0 ? 'critique' : undefined}
            onClick={() => navigate('/courriers?vue=en_retard')}
            chargement={isLoading}
          />
          <StatTile
            titre="Clôturés"
            valeur={t?.parEtat.clotures ?? 0}
            ton="succes"
            onClick={() => navigate('/courriers?vue=archives')}
            chargement={isLoading}
          />
          <StatTile
            titre="Délai moyen de traitement"
            valeur={t?.delaiMoyenJours != null ? t.delaiMoyenJours.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—'}
            suffixe={t?.delaiMoyenJours != null ? ' j' : undefined}
            chargement={isLoading}
          />
          <StatTile
            titre="Entrants / sortants"
            valeur={`${t?.totaux.entrant ?? 0} / ${t?.totaux.sortant ?? 0}`}
            detail={`${t?.totaux.interne ?? 0} interne${(t?.totaux.interne ?? 0) > 1 ? 's' : ''}`}
            chargement={isLoading}
          />
        </StatTiles>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <ChartCard
            className="xl:col-span-2"
            titre="Évolution"
            description="Courriers enregistrés sur la période"
            chargement={isLoading}
            vide={totalEvolution === 0}
          >
            <EvolutionBarres serie={serie} granularite={granularite} unite={['courrier', 'courriers']} />
          </ChartCard>
          <ChartCard titre="Répartition par sens" chargement={isLoading} vide={!t?.totaux.total}>
            <BarresRepartition
              largeurLibelle={80}
              donnees={[
                { libelle: 'Entrant', total: t?.totaux.entrant ?? 0, couleur: COULEURS_SENS.entrant },
                { libelle: 'Sortant', total: t?.totaux.sortant ?? 0, couleur: COULEURS_SENS.sortant },
                { libelle: 'Interne', total: t?.totaux.interne ?? 0, couleur: COULEURS_SENS.interne },
              ]}
            />
          </ChartCard>
          <ChartCard titre="Charge par entité" chargement={isLoading} vide={!t?.parEntite.length}>
            <BarresRepartition donnees={t?.parEntite ?? []} />
          </ChartCard>
          <ChartCard titre="Répartition par type" chargement={isLoading} vide={!t?.parType.length}>
            <BarresRepartition donnees={t?.parType ?? []} />
          </ChartCard>
          <ChartCard titre="Répartition par priorité" chargement={isLoading} vide={!t?.parPriorite.length}>
            <BarresRepartition donnees={t?.parPriorite ?? []} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
