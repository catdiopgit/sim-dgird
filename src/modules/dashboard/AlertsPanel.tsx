import { ExclamationCircleFilled } from '@ant-design/icons';
import { Card, Empty, Skeleton, theme, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import type { EcheanceProchaine } from '../../services/dashboard/echeances';

interface Props {
  echeances: EcheanceProchaine[] | undefined;
  chargement: boolean;
}

// Faute d'un modèle de données "alertes" persistant (aucune table dédiée
// n'existe aujourd'hui, cf. audit — seuls les e-mails SMTP de notification
// existent), les alertes affichées sont dérivées des échéances réellement
// dépassées plutôt que d'inventer un flux d'alertes fictif (§9 du brief).
export function AlertsPanel({ echeances, chargement }: Props) {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  if (chargement) {
    return (
      <Card size="small" title="Alertes" style={{ height: '100%' }}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  const alertes = (echeances ?? [])
    .filter((e) => e.enRetard)
    .sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance))
    .slice(0, 6);

  return (
    <Card size="small" title="Alertes" style={{ height: '100%' }}>
      {alertes.length === 0 ? (
        <Empty description="Aucune alerte active" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {alertes.map((a) => (
            <div
              key={`${a.type}-${a.id}`}
              onClick={() => navigate(a.type === 'livrable' ? `/projets/${a.lienId}` : `/missions/${a.lienId}`)}
              style={{ display: 'flex', gap: 10, cursor: 'pointer' }}
            >
              <ExclamationCircleFilled style={{ color: token.colorError, fontSize: 16, marginTop: 2 }} />
              <div>
                <Typography.Text strong style={{ fontSize: 13, display: 'block' }}>
                  Échéance dépassée
                </Typography.Text>
                <Typography.Text style={{ fontSize: 13, display: 'block' }}>
                  {a.libelle} — {a.reference}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Depuis le {dayjs(a.dateEcheance).format('DD/MM/YYYY')}
                </Typography.Text>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
