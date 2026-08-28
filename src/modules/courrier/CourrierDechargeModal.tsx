import { InboxOutlined } from '@ant-design/icons';
import { Alert, Modal, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';
import { useAjouterDecharge } from '../../hooks/courrier/useDecharge';

interface Props {
  courrierId: string;
  open: boolean;
  onClose: () => void;
}

// Ajout d'une décharge (plan V4 §9/§10) : pièce justificative de dépôt d'un
// courrier départ. Verrouille définitivement le courrier dès la validation
// (public.fn_ajouter_decharge_courrier) — d'où l'avertissement explicite
// avant de confirmer.
export function CourrierDechargeModal({ courrierId, open, onClose }: Props) {
  const [fichier, setFichier] = useState<File | null>(null);
  const ajouter = useAjouterDecharge(courrierId);

  const uploadProps: UploadProps = {
    multiple: false,
    fileList: fichier ? [{ uid: '1', name: fichier.name, status: 'done' }] : [],
    beforeUpload: (file) => {
      setFichier(file);
      return false;
    },
    onRemove: () => setFichier(null),
  };

  const fermer = () => {
    setFichier(null);
    onClose();
  };

  const valider = () => {
    if (!fichier) return;
    ajouter.mutate(fichier, { onSuccess: fermer });
  };

  return (
    <Modal
      open={open}
      title="Ajouter une décharge"
      onCancel={fermer}
      onOk={valider}
      okButtonProps={{ disabled: !fichier, loading: ajouter.isPending }}
      okText="Valider la décharge"
      destroyOnHidden
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Verrouillage définitif"
        description="Une fois la décharge validée, ce courrier devient définitivement immodifiable (informations, destinataires, pièces jointes) pour les utilisateurs. Seul un administrateur habilité pourra le déverrouiller, à titre exceptionnel et journalisé."
      />
      <Upload.Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Cliquez ou glissez-déposez le document de décharge</p>
      </Upload.Dragger>
      {fichier && (
        <Typography.Paragraph style={{ marginTop: 8 }}>
          Fichier sélectionné : <strong>{fichier.name}</strong>
        </Typography.Paragraph>
      )}
    </Modal>
  );
}
