import { Card, Skeleton, Timeline, Typography } from 'antd';
import { useMemo } from 'react';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useAuditCourrier } from '../../hooks/courrier/useAudit';

interface Props {
  courrierId: string;
  organisationId: string;
}

const LABEL_ACTION: Record<string, string> = {
  creer: 'Création',
  modifier: 'Modification',
  supprimer: 'Suppression',
};

// Historique d'audit du courrier (plan V4 §10) : regroupe les entrées de
// public.fn_journal_audit_courrier par événement (created_at+action) — une
// création affiche un simple résumé, une modification liste les champs
// réellement changés (avant → après).
export function CourrierAuditCard({ courrierId, organisationId }: Props) {
  const { data: entrees, isLoading } = useAuditCourrier(courrierId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);

  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  const evenements = useMemo(() => {
    const groupes = new Map<string, { action: string; created_at: string; utilisateur_id: string | null; champs: typeof entrees }>();
    for (const e of entrees ?? []) {
      const cle = `${e.created_at}-${e.action}`;
      const groupe = groupes.get(cle);
      if (groupe) {
        groupe.champs!.push(e);
      } else {
        groupes.set(cle, { action: e.action, created_at: e.created_at, utilisateur_id: e.utilisateur_id, champs: [e] });
      }
    }
    return Array.from(groupes.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [entrees]);

  if (isLoading) return <Skeleton active />;

  return (
    <Card title="Historique / Audit" style={{ marginTop: 16 }}>
      {evenements.length === 0 ? (
        <Typography.Text type="secondary">Aucune modification enregistrée.</Typography.Text>
      ) : (
        <Timeline
          items={evenements.map((ev) => ({
            content: (
              <div>
                <div>
                  <strong>{LABEL_ACTION[ev.action] ?? ev.action}</strong>
                  {ev.utilisateur_id && ` — ${utilisateurParId.get(ev.utilisateur_id) ?? ev.utilisateur_id}`}
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {new Date(ev.created_at).toLocaleString('fr-FR')}
                </Typography.Text>
                {ev.action === 'modifier' && (
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {ev.champs!.map((c, i) => (
                      <li key={i} style={{ fontSize: 13 }}>
                        <strong>{c.champ}</strong> : {c.ancienne_valeur ?? '—'} → {c.nouvelle_valeur ?? '—'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          }))}
        />
      )}
    </Card>
  );
}
