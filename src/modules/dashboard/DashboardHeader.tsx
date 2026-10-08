import { fr } from '../../utils/dateFr';
import { useProfile } from '../../hooks/useProfile';
import { PRESETS_LABEL, type Periode } from './periode';
import { QuickActions } from './QuickActions';

interface Props {
  periode: Periode;
}

// La cloche, le profil et le sélecteur de période vivent dans le header
// global (AppShell) : ici, uniquement l'accueil, le rappel de la période et
// les accès rapides.
export function DashboardHeader({ periode }: Props) {
  const { profile } = useProfile();
  const libelle = periode.preset === 'personnalise' ? 'Période personnalisée' : PRESETS_LABEL[periode.preset];
  const bornes = periode.debut.isSame(periode.fin, 'day')
    ? fr(periode.debut).format('D MMMM YYYY')
    : `du ${fr(periode.debut).format('D MMMM')} au ${fr(periode.fin).format('D MMMM YYYY')}`;

  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="min-w-0">
        <p className="mb-1 text-[13px] text-muted-foreground first-letter:uppercase">{fr().format('dddd D MMMM YYYY')}</p>
        <h1 className="font-serif-title text-[28px] font-semibold leading-tight">
          {profile ? `Bonjour, ${profile.prenom} ${profile.nom}` : 'Tableau de bord'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {libelle} · activité {bornes}
        </p>
      </div>
      <QuickActions />
    </div>
  );
}
