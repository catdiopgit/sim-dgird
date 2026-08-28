import { UploadOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, List, Popconfirm, Space, Tag, Upload, message } from 'antd';
import { useState } from 'react';
import { usePieceJointeMutations, usePiecesJointes } from '../../hooks/courrier/usePiecesJointes';
import { getUrlSignee } from '../../services/courrier/piecesJointes';
import type { PieceJointe } from '../../services/courrier/piecesJointes';

interface Props {
  courrierId: string;
  peutModifier: boolean;
}

export function CourrierPiecesJointes({ courrierId, peutModifier }: Props) {
  const { data: pieces, isLoading } = usePiecesJointes(courrierId);
  const { upload, supprimer } = usePieceJointeMutations(courrierId);
  const [estScan, setEstScan] = useState(false);

  const onTelecharger = async (piece: PieceJointe) => {
    if (!piece.storage_path) return;
    try {
      const url = await getUrlSignee(piece.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Échec du téléchargement.');
    }
  };

  return (
    <Card title="Pièces jointes" style={{ marginTop: 16 }}>
      {peutModifier && (
        <Space style={{ marginBottom: 12 }}>
          <Checkbox checked={estScan} onChange={(e) => setEstScan(e.target.checked)}>
            Ceci est le scan du courrier
          </Checkbox>
          <Upload
            beforeUpload={(file) => {
              upload.mutate({ file, estScan });
              return false;
            }}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} loading={upload.isPending}>
              Ajouter un fichier
            </Button>
          </Upload>
        </Space>
      )}
      <List
        loading={isLoading}
        dataSource={pieces}
        locale={{ emptyText: 'Aucune pièce jointe.' }}
        renderItem={(p) => (
          <List.Item
            actions={[
              <Button key="dl" type="link" disabled={!p.storage_path} onClick={() => onTelecharger(p)}>
                Télécharger
              </Button>,
              ...(peutModifier && p.storage_path
                ? [
                    <Popconfirm
                      key="del"
                      title="Supprimer ce fichier ?"
                      onConfirm={() => supprimer.mutate({ id: p.id, storagePath: p.storage_path! })}
                    >
                      <Button type="link" danger>
                        Supprimer
                      </Button>
                    </Popconfirm>,
                  ]
                : []),
            ]}
          >
            <List.Item.Meta title={p.nom_fichier} description={p.est_scan ? <Tag>Scan</Tag> : undefined} />
          </List.Item>
        )}
      />
    </Card>
  );
}
