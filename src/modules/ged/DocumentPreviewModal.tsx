import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Descriptions, Modal, Skeleton, Space, Typography } from 'antd';
import { getUrlSigneeVersion } from '../../services/ged/documents';
import type { Document } from '../../services/ged/documents';
import { telechargerVersion, useInfosFichierDocuments } from '../../hooks/ged/useDocuments';
import { useTracerConsultation } from '../../hooks/ged/useConsultations';
import { formatTailleFichier, getInfosTypeFichier } from '../../utils/ged/typeFichier';

interface Props {
  document: Document | null;
  onClose: () => void;
}

// Consultation depuis l'explorateur Archives : PDF/image prévisualisés
// directement (iframe/img sur une URL signée, aucune dépendance ajoutée) ;
// les autres formats affichent leurs informations avec un bouton de
// téléchargement — un aperçu Office via un service tiers enverrait l'URL
// signée d'un document potentiellement confidentiel hors de l'application,
// donc volontairement écarté (cf. Refonte de la page Archives §6, repli prévu).
export function DocumentPreviewModal({ document, onClose }: Props) {
  useTracerConsultation(document?.id);
  const { infosParVersionId, isLoading: chargementInfos } = useInfosFichierDocuments(document ? [document] : []);
  const infos = document?.version_courante_id ? infosParVersionId.get(document.version_courante_id) : undefined;

  const { data: urlSignee, isLoading: chargementUrl } = useQuery({
    queryKey: ['ged-url-signee', infos?.storage_path],
    queryFn: () => getUrlSigneeVersion(infos!.storage_path),
    enabled: Boolean(infos?.storage_path),
  });

  if (!document) return null;

  const { categorie, icone: Icone, couleur, libelle } = getInfosTypeFichier(infos?.type_mime, infos?.nom_fichier);
  const chargement = chargementInfos || (Boolean(infos) && chargementUrl);

  const telecharger = () => {
    if (!infos) return;
    void telechargerVersion(document.id, infos.storage_path, infos.nom_fichier);
  };

  return (
    <Modal open onCancel={onClose} footer={null} width={800} title={document.titre}>
      {chargement ? (
        <Skeleton active />
      ) : categorie === 'pdf' && urlSignee ? (
        <iframe src={urlSignee} title={document.titre} style={{ width: '100%', height: '70vh', border: 'none' }} />
      ) : categorie === 'image' && urlSignee ? (
        <img
          src={urlSignee}
          alt={document.titre}
          style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }}
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Space align="center">
            <Icone style={{ fontSize: 40, color: couleur }} />
            <div>
              <Typography.Text strong>{infos?.nom_fichier ?? document.titre}</Typography.Text>
              <br />
              <Typography.Text type="secondary">Aperçu non disponible pour ce format ({libelle}).</Typography.Text>
            </div>
          </Space>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Type">{libelle}</Descriptions.Item>
            <Descriptions.Item label="Taille">{formatTailleFichier(infos?.taille_octets)}</Descriptions.Item>
            <Descriptions.Item label="Archivé le">
              {document.date_archivage ? new Date(document.date_archivage).toLocaleDateString('fr-FR') : '—'}
            </Descriptions.Item>
          </Descriptions>
        </Space>
      )}

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<DownloadOutlined />} onClick={telecharger} disabled={!infos}>
          Télécharger
        </Button>
      </div>
    </Modal>
  );
}
