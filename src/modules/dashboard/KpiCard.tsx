import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Card, Skeleton, theme, Typography } from 'antd';
import type { ReactNode } from 'react';

export interface KpiEvolution {
  pourcentage: number;
  // Le sens métier n'est jamais déduit automatiquement du signe (§10 du
  // brief) : c'est l'appelant qui sait si une hausse est bonne ou mauvaise
  // pour cet indicateur précis (ex: hausse des retards = négatif).
  sensPositif: boolean;
}

export interface KpiSousValeur {
  libelle: string;
  valeur: number;
  couleur?: string;
  onClick?: () => void;
}

interface Props {
  icone: ReactNode;
  titre: string;
  valeur: number | string | null;
  suffixe?: string;
  sousValeurs?: KpiSousValeur[];
  evolution?: KpiEvolution | null;
  onClick?: () => void;
  chargement?: boolean;
}

export function KpiCard({ icone, titre, valeur, suffixe, sousValeurs, evolution, onClick, chargement }: Props) {
  const { token } = theme.useToken();

  if (chargement) {
    return (
      <Card size="small" style={{ height: '100%' }}>
        <Skeleton active paragraph={{ rows: 2 }} title={false} />
      </Card>
    );
  }

  const indisponible = valeur === null;

  return (
    <Card
      size="small"
      hoverable={Boolean(onClick)}
      onClick={onClick}
      style={{ height: '100%', cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: token.colorTextSecondary, marginBottom: 10 }}>
        <span style={{ fontSize: 18, color: token.colorInfo }}>{icone}</span>
        <Typography.Text strong style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.3 }}>
          {titre}
        </Typography.Text>
      </div>

      {indisponible ? (
        <div>
          <Typography.Title level={3} style={{ margin: 0, color: token.colorTextTertiary }}>
            —
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Données indisponibles
          </Typography.Text>
        </div>
      ) : (
        <Typography.Title level={3} style={{ margin: 0 }}>
          {valeur}
          {suffixe}
        </Typography.Title>
      )}

      {sousValeurs && sousValeurs.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          {sousValeurs.map((sv) => (
            <span
              key={sv.libelle}
              onClick={(e) => {
                if (sv.onClick) {
                  e.stopPropagation();
                  sv.onClick();
                }
              }}
              style={{
                fontSize: 12,
                color: sv.couleur ?? token.colorTextSecondary,
                cursor: sv.onClick ? 'pointer' : 'default',
                textDecoration: sv.onClick ? 'underline' : 'none',
                textUnderlineOffset: 2,
              }}
            >
              {sv.libelle}: {sv.valeur}
            </span>
          ))}
        </div>
      )}

      {evolution && !indisponible && (
        <div style={{ marginTop: 10, fontSize: 12, color: evolution.sensPositif ? token.colorSuccess : token.colorError }}>
          {evolution.pourcentage >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{' '}
          {Math.abs(evolution.pourcentage).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %{' '}
          <span style={{ color: token.colorTextTertiary }}>vs période précédente</span>
        </div>
      )}
    </Card>
  );
}
