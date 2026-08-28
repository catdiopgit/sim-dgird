import { ArrowLeftOutlined, InboxOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Skeleton, Space, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDossiers } from '../../hooks/ged/useDossiers';
import { useProfile } from '../../hooks/useProfile';
import type { Document } from '../../services/ged/documents';
import { ArchivesContent } from './ArchivesContent';
import { ArchivesToolbar, type TriArchives, type VueArchives } from './ArchivesToolbar';
import { ArchivesTreePanel } from './ArchivesTreePanel';
import { DocumentPreviewModal } from './DocumentPreviewModal';

// Explorateur documentaire "Archives" (GED V2, refonte inspirée de Google
// Drive) : plan de classement à gauche (navigation seule, aucune gestion —
// cf. Administration > Paramétrage et le panneau Classement), contenu du
// dossier sélectionné à droite (sous-dossiers puis documents en cartes),
// recherche globale, prévisualisation et téléchargement tracés.
export function ArchivesPage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const { data: dossiers } = useDossiers(organisationId);

  const [dossierSelectionneId, setDossierSelectionneId] = useState<string | null>(null);
  const [texteRecherche, setTexteRecherche] = useState('');
  const [vue, setVue] = useState<VueArchives>('grille');
  const [tri, setTri] = useState<TriArchives>('nom');
  const [documentAffiche, setDocumentAffiche] = useState<Document | null>(null);

  if (!organisationId) return <Skeleton active />;

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/ged')}>
          Retour
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Archives
        </Typography.Title>
        {can('ged', 'consulter') && (
          <Button icon={<InboxOutlined />} onClick={() => navigate('/ged/archivage')}>
            Archivage
          </Button>
        )}
      </Space>

      <Row gutter={16}>
        <Col xs={24} md={7} lg={6}>
          <Card size="small">
            <ArchivesTreePanel
              organisationId={organisationId}
              dossierSelectionneId={dossierSelectionneId}
              onSelectionner={(id) => {
                setDossierSelectionneId(id);
                setTexteRecherche('');
              }}
            />
          </Card>
        </Col>
        <Col xs={24} md={17} lg={18}>
          <ArchivesToolbar
            dossiers={dossiers ?? []}
            dossierSelectionneId={dossierSelectionneId}
            onNaviguer={(id) => {
              setDossierSelectionneId(id);
              setTexteRecherche('');
            }}
            texteRecherche={texteRecherche}
            onChangeRecherche={setTexteRecherche}
            vue={vue}
            onChangeVue={setVue}
            tri={tri}
            onChangeTri={setTri}
          />

          <ArchivesContent
            organisationId={organisationId}
            dossierSelectionneId={dossierSelectionneId}
            onNaviguerDossier={(id) => setDossierSelectionneId(id)}
            texteRecherche={texteRecherche}
            vue={vue}
            tri={tri}
            onOuvrirDocument={setDocumentAffiche}
          />
        </Col>
      </Row>

      <DocumentPreviewModal document={documentAffiche} onClose={() => setDocumentAffiche(null)} />
    </div>
  );
}
