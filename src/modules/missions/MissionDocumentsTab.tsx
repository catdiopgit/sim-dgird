import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Skeleton, Space, Typography, Upload, message } from 'antd';
import { useAjouterDocumentMission } from '../../hooks/missions/useDocumentsMission';
import { getDocumentParId, getUrlTelechargementDocument } from '../../services/missions/documents';
import type { RoleDocumentMission } from '../../services/missions/documents';

interface EmplacementProps {
  label: string;
  role: RoleDocumentMission;
  documentId: string | null;
  missionId: string;
  peutModifier: boolean;
}

// Contrairement à l'espace documentaire libre des Projets, une mission n'a
// que 3 emplacements fixes (ordre de mission, compte-rendu, PV) — chacun
// pointé directement par une colonne dédiée sur missions (0011).
function EmplacementDocument({ label, role, documentId, missionId, peutModifier }: EmplacementProps) {
  const { data: document, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => getDocumentParId(documentId!),
    enabled: Boolean(documentId),
  });
  const ajouter = useAjouterDocumentMission(missionId);

  const telecharger = async () => {
    if (!document) return;
    const url = await getUrlTelechargementDocument(document);
    if (!url) {
      message.error('Aucun fichier disponible pour ce document.');
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
      <div>
        <Typography.Text strong>{label}</Typography.Text>
        {isLoading && <Skeleton.Input size="small" active style={{ marginLeft: 12, width: 160 }} />}
        {!isLoading && !documentId && (
          <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
            Non déposé
          </Typography.Text>
        )}
      </div>
      <Space>
        {documentId && (
          <Button size="small" icon={<DownloadOutlined />} onClick={() => void telecharger()}>
            Télécharger
          </Button>
        )}
        {peutModifier && (
          <Upload
            showUploadList={false}
            beforeUpload={(fichier) => {
              ajouter.mutate({ payload: { p_mission_id: missionId, p_titre: label, p_role: role }, fichier });
              return false;
            }}
          >
            <Button size="small" icon={<UploadOutlined />} loading={ajouter.isPending}>
              {documentId ? 'Remplacer' : 'Téléverser'}
            </Button>
          </Upload>
        )}
      </Space>
    </div>
  );
}

interface Props {
  missionId: string;
  peutModifier: boolean;
  ordreMissionDocumentId: string | null;
  compteRenduDocumentId: string | null;
  pvDocumentId: string | null;
}

export function MissionDocumentsTab({
  missionId,
  peutModifier,
  ordreMissionDocumentId,
  compteRenduDocumentId,
  pvDocumentId,
}: Props) {
  return (
    <Card title="Documents">
      <EmplacementDocument
        label="Ordre de mission"
        role="ordre_mission"
        documentId={ordreMissionDocumentId}
        missionId={missionId}
        peutModifier={peutModifier}
      />
      <EmplacementDocument
        label="Compte-rendu"
        role="compte_rendu"
        documentId={compteRenduDocumentId}
        missionId={missionId}
        peutModifier={peutModifier}
      />
      <EmplacementDocument
        label="Procès-verbal (PV)"
        role="pv"
        documentId={pvDocumentId}
        missionId={missionId}
        peutModifier={peutModifier}
      />
    </Card>
  );
}
