import { DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import { Button, Checkbox, List, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';

export interface PieceJointeStagee {
  id: string;
  file: File;
  estScan: boolean;
}

interface Props {
  fichiers: PieceJointeStagee[];
  onChange: (fichiers: PieceJointeStagee[]) => void;
}

function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

// Contrairement à CourrierPiecesJointes.tsx (persistance immédiate), ce
// composant garde les fichiers en mémoire côté client tant que le courrier
// n'existe pas encore (le courrier n'est inséré qu'à la validation finale de
// l'assistant — cf. plan V3 §E). L'upload réel réutilise le même service
// (uploadPieceJointe) une fois le courrier créé.
export function PiecesJointesStagingList({ fichiers, onChange }: Props) {
  const uploadProps: UploadProps = {
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      onChange([...fichiers, { id: crypto.randomUUID(), file, estScan: fichiers.length === 0 }]);
      return false;
    },
  };

  return (
    <div>
      <Upload.Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Cliquez ou glissez-déposez le document principal et les pièces jointes</p>
        <p className="ant-upload-hint">Plusieurs fichiers possibles. Rien n'est envoyé avant la validation finale.</p>
      </Upload.Dragger>

      {fichiers.length > 0 && (
        <List
          style={{ marginTop: 16 }}
          size="small"
          bordered
          dataSource={fichiers}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Checkbox
                  key="scan"
                  checked={item.estScan}
                  onChange={(e) =>
                    onChange(fichiers.map((f) => ({ ...f, estScan: f.id === item.id ? e.target.checked : false })))
                  }
                >
                  Scan du courrier
                </Checkbox>,
                <Button
                  key="suppr"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onChange(fichiers.filter((f) => f.id !== item.id))}
                />,
              ]}
            >
              <Typography.Text>{item.file.name}</Typography.Text>{' '}
              <Typography.Text type="secondary">({formatTaille(item.file.size)})</Typography.Text>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
