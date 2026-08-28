import { Card, Empty, theme, Typography } from 'antd';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { StatistiquesCourrierParEtat } from '../../services/courrier/statistiques';

interface Props {
  parEtat: StatistiquesCourrierParEtat | undefined;
}

// Répartition limitée aux 3 états réellement distingués par
// fn_statistiques_courrier (en cours / en retard / clôturés) — pas de
// catégorie "en attente" inventée, le modèle de workflow ne la distingue pas
// aujourd'hui (§9 du brief).
export function MailStatusDonut({ parEtat }: Props) {
  const { token } = theme.useToken();

  if (!parEtat) {
    return (
      <Card size="small" title="État des courriers" style={{ height: '100%' }}>
        <Empty description="Aucune donnée sur la période" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  const donnees = [
    { cle: 'enCours', libelle: 'En cours', valeur: parEtat.enCours, couleur: token.colorInfo },
    { cle: 'enRetard', libelle: 'En retard', valeur: parEtat.enRetard, couleur: token.colorError },
    { cle: 'clotures', libelle: 'Traités', valeur: parEtat.clotures, couleur: token.colorSuccess },
  ];
  const total = donnees.reduce((s, d) => s + d.valeur, 0);

  return (
    <Card size="small" title="État des courriers" style={{ height: '100%' }}>
      {total === 0 ? (
        <Empty description="Aucune donnée sur la période" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={donnees} dataKey="valeur" nameKey="libelle" innerRadius={45} outerRadius={70} paddingAngle={2}>
                {donnees.map((d) => (
                  <Cell key={d.cle} fill={d.couleur} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {donnees.map((d) => (
              <div key={d.cle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.couleur, display: 'inline-block' }} />
                <Typography.Text style={{ fontSize: 13 }}>
                  {d.libelle} — {d.valeur}
                </Typography.Text>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
