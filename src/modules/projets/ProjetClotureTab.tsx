import { CheckCircleFilled, WarningFilled } from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Input, List, Modal, Popconfirm, Space, Tag } from 'antd';
import { useState } from 'react';
import { useClotureMutations, useVerifierCloture } from '../../hooks/projets/useClotureProjet';
import type { Projet } from '../../services/projets/projets';

interface Props {
  projet: Projet;
  peutDemander: boolean;
  utilisateurParId: Map<string, string>;
}

const LIBELLES_STATUT: Record<Projet['cloture_statut'], { label: string; color: string }> = {
  aucune: { label: 'Aucune demande', color: 'default' },
  demandee: { label: 'Demande en attente de confirmation', color: 'gold' },
  confirmee: { label: 'Clôturé', color: 'green' },
  rejetee: { label: 'Demande rejetée', color: 'red' },
};

// §8/§9 : checklist en direct (fn_verifier_cloture_projet) + workflow à deux
// niveaux. Les boutons Confirmer/Rejeter restent affichés dès qu'une demande
// est en attente — c'est le serveur (responsable hiérarchique ou permission
// projets/valider) qui tranche en dernier ressort, l'UI n'est qu'une aide.
export function ProjetClotureTab({ projet, peutDemander, utilisateurParId }: Props) {
  const { data: controles, isLoading } = useVerifierCloture(projet.id);
  const { demander, confirmer, rejeter } = useClotureMutations(projet.id);
  const [motifModalOuvert, setMotifModalOuvert] = useState(false);
  const [motif, setMotif] = useState('');

  const blocages = (controles ?? []).filter((c) => c.bloquant);
  const statutInfo = LIBELLES_STATUT[projet.cloture_statut];

  return (
    <Card title="Clôture du projet">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Statut de clôture">
            <Tag color={statutInfo.color}>{statutInfo.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Demandée par">
            {projet.cloture_demandee_par ? (utilisateurParId.get(projet.cloture_demandee_par) ?? '—') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Confirmée par">
            {projet.cloture_confirmee_par ? (utilisateurParId.get(projet.cloture_confirmee_par) ?? '—') : '—'}
          </Descriptions.Item>
          {projet.cloture_motif_rejet && (
            <Descriptions.Item label="Motif du rejet" span={2}>
              {projet.cloture_motif_rejet}
            </Descriptions.Item>
          )}
        </Descriptions>

        {projet.cloture_statut === 'confirmee' && (
          <Alert type="success" showIcon message="Ce projet est clôturé : toute modification normale est bloquée." />
        )}

        <List
          header="Contrôles avant clôture"
          loading={isLoading}
          dataSource={controles ?? []}
          renderItem={(c) => (
            <List.Item>
              {c.bloquant ? (
                <WarningFilled style={{ color: '#faad14', marginRight: 8 }} />
              ) : (
                <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} />
              )}
              {c.message}
            </List.Item>
          )}
        />

        {peutDemander && projet.cloture_statut !== 'demandee' && projet.cloture_statut !== 'confirmee' && (
          <Popconfirm
            title="Demander la clôture du projet ?"
            description={blocages.length > 0 ? `${blocages.length} contrôle(s) bloquant(s) subsistent.` : undefined}
            onConfirm={() => demander.mutate()}
          >
            <Button type="primary" loading={demander.isPending}>
              Demander la clôture
            </Button>
          </Popconfirm>
        )}

        {projet.cloture_statut === 'demandee' && (
          <Space>
            <Popconfirm title="Confirmer la clôture du projet ?" onConfirm={() => confirmer.mutate(undefined)}>
              <Button type="primary" loading={confirmer.isPending}>
                Confirmer la clôture
              </Button>
            </Popconfirm>
            <Button danger onClick={() => setMotifModalOuvert(true)}>
              Rejeter
            </Button>
          </Space>
        )}
      </Space>

      <Modal
        open={motifModalOuvert}
        title="Rejeter la demande de clôture"
        onCancel={() => setMotifModalOuvert(false)}
        onOk={() => {
          rejeter.mutate(motif, {
            onSuccess: () => {
              setMotifModalOuvert(false);
              setMotif('');
            },
          });
        }}
        confirmLoading={rejeter.isPending}
        okButtonProps={{ danger: true, disabled: motif.trim().length === 0 }}
      >
        <Input.TextArea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif du rejet (obligatoire)" />
      </Modal>
    </Card>
  );
}
