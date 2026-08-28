import { CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Popconfirm, Space, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useContactsExecution } from '../../hooks/projets/useContactsExecution';
import { useDocumentsProjet } from '../../hooks/projets/useDocumentsProjet';
import { useCloturerLivrable, useLivrableMutations, useLivrables } from '../../hooks/projets/useLivrables';
import type { Livrable } from '../../services/projets/livrables';
import type { ProjetsReferentiel } from '../../services/projets/referentiel';
import { LivrableClotureModal } from './LivrableClotureModal';
import { LivrableFormModal } from './LivrableFormModal';

interface Props {
  projetId: string;
  organisationId: string;
  peutModifier: boolean;
  referentiel: ProjetsReferentiel | undefined;
  utilisateurParId: Map<string, string>;
  cloture: boolean;
}

const STATUTS_TERMINAUX = new Set(['realise', 'valide', 'annule']);

// §2 Le projet est désormais constitué uniquement de livrables (plus de
// phase/activité intermédiaire) — chacun porte son poids (quote-part) dans
// l'avancement global, recalculé automatiquement côté serveur dès qu'un
// livrable change (trigger app.trg_livrables_recalcule_avancement, 0073).
export function ProjetLivrablesTab({
  projetId,
  organisationId,
  peutModifier,
  referentiel,
  utilisateurParId,
  cloture,
}: Props) {
  const { data: livrables, isLoading } = useLivrables(projetId);
  const { data: contacts } = useContactsExecution(projetId);
  const { data: documents } = useDocumentsProjet(projetId);
  const cloturer = useCloturerLivrable(projetId);
  const { remove: supprimerLivrable } = useLivrableMutations(projetId);
  const [livrableEnEdition, setLivrableEnEdition] = useState<Livrable | 'nouveau' | null>(null);
  const [livrableAClore, setLivrableAClore] = useState<Livrable | null>(null);

  const statutParId = useMemo(() => new Map((referentiel?.statutsLivrable ?? []).map((v) => [v.id, v])), [referentiel]);
  const contactParId = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, c.nom])), [contacts]);
  const livrablesAvecJustificatif = useMemo(
    () => new Set((documents ?? []).filter((d) => d.livrable_id).map((d) => d.livrable_id as string)),
    [documents],
  );

  const poidsTotal = useMemo(() => (livrables ?? []).reduce((somme, l) => somme + l.poids_pct, 0), [livrables]);

  const nomResponsable = (l: Livrable) => {
    if (l.responsable_utilisateur_id) return utilisateurParId.get(l.responsable_utilisateur_id) ?? '—';
    if (l.responsable_contact_id) return contactParId.get(l.responsable_contact_id) ?? '—';
    return '—';
  };

  return (
    <Card
      title="Livrables"
      extra={
        peutModifier &&
        !cloture && (
          <Button icon={<PlusOutlined />} onClick={() => setLivrableEnEdition('nouveau')}>
            Ajouter un livrable
          </Button>
        )
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {livrables && livrables.length > 0 && poidsTotal !== 100 && (
          <Alert
            type="warning"
            showIcon
            message={`La somme des quote-parts des livrables est de ${poidsTotal}% (devrait être 100%).`}
          />
        )}

        <Table<Livrable>
          rowKey="id"
          size="small"
          loading={isLoading}
          dataSource={livrables}
          pagination={false}
          columns={[
            { title: 'Livrable', dataIndex: 'nom' },
            { title: 'Responsable', width: 180, render: (_, l) => nomResponsable(l) },
            { title: 'Poids', width: 90, render: (_, l) => `${l.poids_pct}%` },
            {
              title: 'Échéance',
              width: 110,
              render: (_, l) => (l.date_prevue ? new Date(l.date_prevue).toLocaleDateString('fr-FR') : '—'),
            },
            {
              title: 'Statut',
              width: 130,
              render: (_, l) => {
                const s = l.statut_valeur_id ? statutParId.get(l.statut_valeur_id) : null;
                return s ? <Tag color={s.couleur ?? undefined}>{s.libelle}</Tag> : '—';
              },
            },
            ...(peutModifier && !cloture
              ? [
                  {
                    title: 'Actions',
                    key: 'actions',
                    width: 220,
                    render: (_: unknown, l: Livrable) => {
                      const statutCode = l.statut_valeur_id ? statutParId.get(l.statut_valeur_id)?.code : null;
                      const termine = Boolean(statutCode && STATUTS_TERMINAUX.has(statutCode));
                      return (
                        <span>
                          <Button type="link" size="small" onClick={() => setLivrableEnEdition(l)}>
                            Modifier
                          </Button>
                          {!termine && (livrablesAvecJustificatif.has(l.id) ? (
                            <Popconfirm title="Clôturer ce livrable ?" onConfirm={() => cloturer.mutate({ id: l.id })}>
                              <Button type="link" size="small" icon={<CheckCircleOutlined />} loading={cloturer.isPending}>
                                Clôturer
                              </Button>
                            </Popconfirm>
                          ) : (
                            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => setLivrableAClore(l)}>
                              Clôturer
                            </Button>
                          ))}
                          <Popconfirm title="Supprimer ce livrable ?" onConfirm={() => supprimerLivrable.mutate(l.id)}>
                            <Button type="link" size="small" danger>
                              Supprimer
                            </Button>
                          </Popconfirm>
                        </span>
                      );
                    },
                  },
                ]
              : []),
          ]}
        />
      </Space>

      <LivrableFormModal
        open={livrableEnEdition !== null}
        organisationId={organisationId}
        projetId={projetId}
        livrable={livrableEnEdition === 'nouveau' ? null : livrableEnEdition}
        onClose={() => setLivrableEnEdition(null)}
      />
      <LivrableClotureModal
        open={livrableAClore !== null}
        projetId={projetId}
        livrable={livrableAClore}
        onClose={() => setLivrableAClore(null)}
      />
    </Card>
  );
}
