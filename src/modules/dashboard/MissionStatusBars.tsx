import { Card, Empty, theme } from 'antd';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { StatistiquesMissionsRepartition } from '../../services/missions/statistiques';

interface Props {
  parEtape: StatistiquesMissionsRepartition[] | undefined;
}

const GRILLE = '#e1e0d9';

export function MissionStatusBars({ parEtape }: Props) {
  const { token } = theme.useToken();
  const donnees = parEtape ?? [];

  return (
    <Card size="small" title="État des missions" style={{ height: '100%' }}>
      {donnees.length === 0 ? (
        <Empty description="Aucune mission sur la période" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(140, donnees.length * 40)}>
          <BarChart data={donnees} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid horizontal={false} stroke={GRILLE} strokeDasharray="0" />
            <XAxis type="number" tick={{ fill: token.colorTextTertiary, fontSize: 12 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="libelle"
              width={110}
              tick={{ fill: token.colorTextSecondary, fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="total" fill={token.colorInfo} barSize={20} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="total" position="right" fill={token.colorTextSecondary} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
