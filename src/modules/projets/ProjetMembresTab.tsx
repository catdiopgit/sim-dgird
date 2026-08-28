import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Popconfirm, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useMembreMutations, useMembresProjet } from '../../hooks/projets/useMembresProjet';
import type { ProjetsReferentiel } from '../../services/projets/referentiel';
import type { ProjetMembre } from '../../services/projets/membres';
import { MembreFormModal } from './MembreFormModal';

interface Props {
  projetId: string;
  organisationId: string;
  peutModifier: boolean;
  referentiel: ProjetsReferentiel | undefined;
  utilisateurParId: Map<string, string>;
}

export function ProjetMembresTab({ projetId, organisationId, peutModifier, referentiel, utilisateurParId }: Props) {
  const { data: membres, isLoading } = useMembresProjet(projetId);
  const { retirer } = useMembreMutations(projetId);
  const [formOuvert, setFormOuvert] = useState(false);

  const roleEquipeParId = useMemo(() => new Map((referentiel?.rolesEquipe ?? []).map((v) => [v.id, v])), [referentiel]);

  return (
    <Card
      title="Équipe"
      extra={
        peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setFormOuvert(true)}>
            Ajouter un membre
          </Button>
        )
      }
    >
      <Table<ProjetMembre>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={membres}
        pagination={false}
        columns={[
          { title: 'Membre', render: (_, m) => utilisateurParId.get(m.utilisateur_id) ?? '—' },
          {
            title: 'Rôle',
            render: (_, m) => {
              const r = m.role_equipe_valeur_id ? roleEquipeParId.get(m.role_equipe_valeur_id) : null;
              return r ? <Tag color={r.couleur ?? undefined}>{r.libelle}</Tag> : '—';
            },
          },
          {
            title: 'Droit d\'écriture',
            width: 130,
            render: (_, m) => (m.peut_modifier ? <Tag color="green">Contributeur</Tag> : <Tag>Lecture seule</Tag>),
          },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 100,
                  render: (_: unknown, m: ProjetMembre) => (
                    <Popconfirm title="Retirer ce membre ?" onConfirm={() => retirer.mutate(m.id)}>
                      <Button type="link" size="small" danger>
                        Retirer
                      </Button>
                    </Popconfirm>
                  ),
                },
              ]
            : []),
        ]}
      />
      <MembreFormModal
        open={formOuvert}
        organisationId={organisationId}
        projetId={projetId}
        onClose={() => setFormOuvert(false)}
      />
    </Card>
  );
}
