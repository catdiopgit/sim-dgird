import { Card, Empty, Skeleton, theme, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import type { EcheanceProchaine } from '../../services/dashboard/echeances';

interface Props {
  echeances: EcheanceProchaine[] | undefined;
  chargement: boolean;
}

export function UpcomingDeadlinesPanel({ echeances, chargement }: Props) {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  if (chargement) {
    return (
      <Card size="small" title="Prochaines échéances" style={{ height: '100%' }}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  const liste = (echeances ?? []).slice(0, 8);

  return (
    <Card size="small" title="Prochaines échéances" style={{ height: '100%' }}>
      {liste.length === 0 ? (
        <Empty description="Aucune échéance prochaine" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {liste.map((e) => (
            <div
              key={`${e.type}-${e.id}`}
              onClick={() => navigate(e.type === 'livrable' ? `/projets/${e.lienId}` : `/missions/${e.lienId}`)}
              style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}
            >
              <div
                style={{
                  minWidth: 52,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: e.enRetard ? token.colorError : token.colorTextSecondary,
                  textTransform: 'uppercase',
                }}
              >
                {dayjs(e.dateEcheance).format('DD MMM')}
              </div>
              <div>
                <Typography.Text style={{ display: 'block', fontSize: 13 }}>{e.libelle}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {e.reference}
                  {e.enRetard ? ' · Dépassée' : ''}
                </Typography.Text>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
