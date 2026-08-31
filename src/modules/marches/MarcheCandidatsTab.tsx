import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, Popconfirm, Table, Tag } from 'antd';
import { useState } from 'react';
import { useMarcheCandidatMutations, useMarcheCandidats } from '../../hooks/marches/useMarcheCandidats';
import type { MarcheCandidat } from '../../services/marches/candidats';
import { DocumentMarcheAjouterModal } from './DocumentMarcheAjouterModal';
import { MarcheCandidatFormModal } from './MarcheCandidatFormModal';

interface Props {
  marcheId: string;
  peutModifier: boolean;
}

// §15 Entreprises et consultants (fonctionnalité optionnelle) — les offres
// technique/financière se joignent via « Ajouter une offre », qui dépose un
// document rattaché au candidat (marche_candidat_id).
export function MarcheCandidatsTab({ marcheId, peutModifier }: Props) {
  const { data: candidats, isLoading } = useMarcheCandidats(marcheId);
  const { remove } = useMarcheCandidatMutations(marcheId);
  const [candidatEnEdition, setCandidatEnEdition] = useState<MarcheCandidat | 'nouveau' | null>(null);
  const [candidatPourOffre, setCandidatPourOffre] = useState<MarcheCandidat | null>(null);

  return (
    <Card
      title="Entreprises et consultants"
      extra={
        peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setCandidatEnEdition('nouveau')}>
            Ajouter un candidat
          </Button>
        )
      }
    >
      <Table<MarcheCandidat>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={candidats}
        pagination={false}
        columns={[
          { title: 'Nom / raison sociale', dataIndex: 'nom' },
          {
            title: 'Type',
            width: 130,
            render: (_, c) => <Tag>{c.type === 'entreprise' ? 'Entreprise' : 'Consultant'}</Tag>,
          },
          { title: 'Coordonnées', dataIndex: 'coordonnees', render: (v) => v ?? '—' },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 260,
                  render: (_: unknown, c: MarcheCandidat) => (
                    <span>
                      <Button type="link" size="small" icon={<UploadOutlined />} onClick={() => setCandidatPourOffre(c)}>
                        Ajouter une offre
                      </Button>
                      <Button type="link" size="small" onClick={() => setCandidatEnEdition(c)}>
                        Modifier
                      </Button>
                      <Popconfirm title="Supprimer ce candidat ?" onConfirm={() => remove.mutate(c.id)}>
                        <Button type="link" size="small" danger>
                          Supprimer
                        </Button>
                      </Popconfirm>
                    </span>
                  ),
                },
              ]
            : []),
        ]}
      />

      <MarcheCandidatFormModal
        open={candidatEnEdition !== null}
        marcheId={marcheId}
        candidat={candidatEnEdition === 'nouveau' ? null : candidatEnEdition}
        onClose={() => setCandidatEnEdition(null)}
      />
      <DocumentMarcheAjouterModal
        open={candidatPourOffre !== null}
        marcheId={marcheId}
        candidatIdFixe={candidatPourOffre?.id}
        onClose={() => setCandidatPourOffre(null)}
      />
    </Card>
  );
}
