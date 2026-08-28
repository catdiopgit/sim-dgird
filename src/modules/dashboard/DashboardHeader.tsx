import { Typography } from 'antd';
import { PeriodSelector } from './PeriodSelector';
import type { Periode } from './periode';

interface Props {
  periode: Periode;
  onChangePeriode: (periode: Periode) => void;
}

// La cloche de notifications et le profil utilisateur existent déjà dans le
// header global de l'application (AppShell) : pas de duplication ici, juste
// le titre et le sélecteur de période propres au tableau de bord.
export function DashboardHeader({ periode, onChangePeriode }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Tableau de bord
        </Typography.Title>
        <Typography.Text type="secondary">Vue synthétique de l'activité du SIM</Typography.Text>
      </div>
      <PeriodSelector periode={periode} onChange={onChangePeriode} />
    </div>
  );
}
