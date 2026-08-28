import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, List, Skeleton, Typography, Upload } from 'antd';
import { telechargerVersion, useVerserVersion, useVersionsDocument } from '../../hooks/ged/useDocuments';

interface Props {
  documentId: string;
}

function formatTaille(octets: number | null): string {
  if (!octets) return '—';
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export function DocumentVersionsPanel({ documentId }: Props) {
  const { data: versions, isLoading } = useVersionsDocument(documentId);
  const verser = useVerserVersion(documentId);

  if (isLoading) return <Skeleton active />;

  return (
    <Card
      title="Versions"
      style={{ marginTop: 16 }}
      extra={
        <Upload
          showUploadList={false}
          disabled={verser.isPending}
          beforeUpload={(fichier) => {
            verser.mutate({ fichier });
            return false;
          }}
        >
          <Button icon={<UploadOutlined />} loading={verser.isPending}>
            Verser une nouvelle version
          </Button>
        </Upload>
      }
    >
      <List
        dataSource={versions ?? []}
        renderItem={(v) => (
          <List.Item
            actions={[
              <Button
                key="telecharger"
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => telechargerVersion(documentId, v.storage_path, v.nom_fichier)}
              >
                Télécharger
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={`Version ${v.version_majeure}.${v.version_mineure} — ${v.nom_fichier}`}
              description={
                <>
                  {formatTaille(v.taille_octets)} — {new Date(v.created_at).toLocaleString('fr-FR')}
                  {v.commentaire && <div>{v.commentaire}</div>}
                </>
              }
            />
          </List.Item>
        )}
      />
      {(versions ?? []).length === 0 && <Typography.Text type="secondary">Aucune version.</Typography.Text>}
    </Card>
  );
}
