import { CompassOutlined, FileSearchOutlined, FolderOpenOutlined, MailOutlined, ProjectOutlined } from '@ant-design/icons';
import { Button, Card, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';

// Raccourcis vers les pages où vivent déjà les actions de création (§20 du
// brief : visibles mais peu encombrantes) — pas de duplication des formulaires
// de création ici, chaque page conserve sa seule source de vérité pour ça.
export function QuickActions() {
  const navigate = useNavigate();
  const { can } = useProfile();

  const actions = [
    { cle: 'courrier', libelle: 'Nouveau courrier', icone: <MailOutlined />, cible: '/courriers', visible: can('courrier', 'creer') },
    { cle: 'ged', libelle: 'Ajouter un document', icone: <FolderOpenOutlined />, cible: '/ged', visible: can('ged', 'creer') },
    { cle: 'projet', libelle: 'Nouveau projet', icone: <ProjectOutlined />, cible: '/projets', visible: can('projets', 'creer') },
    { cle: 'mission', libelle: 'Nouvelle mission', icone: <CompassOutlined />, cible: '/missions', visible: can('missions', 'creer') },
    { cle: 'recherche', libelle: 'Rechercher un document', icone: <FileSearchOutlined />, cible: '/ged/archives', visible: true },
  ].filter((a) => a.visible);

  if (actions.length === 0) return null;

  return (
    <Card size="small" title="Accès rapides">
      <Space wrap>
        {actions.map((a) => (
          <Button key={a.cle} icon={a.icone} onClick={() => navigate(a.cible)}>
            {a.libelle}
          </Button>
        ))}
      </Space>
    </Card>
  );
}
