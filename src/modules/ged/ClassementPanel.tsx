import { CheckOutlined, FolderAddOutlined } from '@ant-design/icons';
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useOptionsDossiersGed } from '../../hooks/ged/useDossiers';
import { useClasserDocument } from '../../hooks/ged/useDocuments';
import type { Document } from '../../services/ged/documents';
import type { GedDossier } from '../../services/ged/dossiers';
import { DossierFormModal } from './DossierFormModal';

interface Props {
  organisationId: string;
  documents: Document[];
  dossierCibleId: string | null;
  dossierCibleLibelle: string | null;
}

interface LigneEdition {
  titre: string;
  dossierId: string;
  motsCles: string;
}

// Classement documentaire (étape de l'archiviste, GED V2 §9) : renommage,
// dossier définitif (plan de classement, ged_dossiers) et mots-clés
// d'indexation, document par document — le dossier cible du versement n'est
// qu'une proposition par défaut, ajustable ici pour chaque document. Si le
// dossier voulu n'existe pas encore, l'archiviste peut le créer à la volée.
export function ClassementPanel({ organisationId, documents, dossierCibleId, dossierCibleLibelle }: Props) {
  const optionsDossiers = useOptionsDossiersGed(organisationId);
  const classer = useClasserDocument();
  const [editions, setEditions] = useState<Record<string, LigneEdition>>({});
  const [nouveauDossierPour, setNouveauDossierPour] = useState<string | null>(null);

  const ligneDe = (d: Document): LigneEdition =>
    editions[d.id] ?? {
      titre: d.titre,
      dossierId: d.dossier_id ?? dossierCibleId ?? '',
      motsCles: (d.mots_cles ?? []).join(', '),
    };

  const majLigne = (documentId: string, patch: Partial<LigneEdition>, document: Document) => {
    setEditions((prev) => ({ ...prev, [documentId]: { ...ligneDe(document), ...prev[documentId], ...patch } }));
  };

  return (
    <Card title="Classement documentaire" style={{ marginTop: 16 }}>
      <Typography.Paragraph type="secondary">
        Dossier proposé par le versement : <Tag>{dossierCibleLibelle ?? 'Non défini'}</Tag> — repris par défaut,
        ajustable pour chaque document ci-dessous.
      </Typography.Paragraph>
      <Table<Document>
        rowKey="id"
        dataSource={documents}
        pagination={false}
        columns={[
          {
            title: 'Titre',
            render: (_, d) => (
              <Input
                value={ligneDe(d).titre}
                onChange={(e) => majLigne(d.id, { titre: e.target.value }, d)}
                size="small"
              />
            ),
          },
          {
            title: 'Dossier (plan de classement)',
            width: 260,
            render: (_, d) => (
              <Space.Compact style={{ width: '100%' }}>
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  value={ligneDe(d).dossierId || undefined}
                  onChange={(v) => majLigne(d.id, { dossierId: v }, d)}
                  options={optionsDossiers}
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                />
                <Button
                  size="small"
                  icon={<FolderAddOutlined />}
                  title="Créer un nouveau dossier"
                  onClick={() => setNouveauDossierPour(d.id)}
                />
              </Space.Compact>
            ),
          },
          {
            title: 'Mots-clés',
            render: (_, d) => (
              <Input
                value={ligneDe(d).motsCles}
                onChange={(e) => majLigne(d.id, { motsCles: e.target.value }, d)}
                placeholder="séparés par des virgules"
                size="small"
              />
            ),
          },
          {
            title: '',
            width: 100,
            render: (_, d) => (
              <Button
                size="small"
                icon={<CheckOutlined />}
                loading={classer.isPending}
                onClick={() => {
                  const ligne = ligneDe(d);
                  classer.mutate({
                    p_document_id: d.id,
                    p_titre: ligne.titre || null,
                    p_dossier_id: ligne.dossierId || null,
                    p_mots_cles: ligne.motsCles
                      .split(',')
                      .map((m) => m.trim())
                      .filter((m) => m.length > 0),
                  });
                }}
              >
                Classer
              </Button>
            ),
          },
        ]}
      />
      <Space style={{ marginTop: 8 }}>
        <Typography.Text type="secondary">
          Chaque document doit être classé individuellement avant d'archiver le versement.
        </Typography.Text>
      </Space>

      <DossierFormModal
        open={nouveauDossierPour !== null}
        organisationId={organisationId}
        parentDossierId={dossierCibleId}
        onClose={() => setNouveauDossierPour(null)}
        onCree={(nouveauDossier: GedDossier) => {
          const documentId = nouveauDossierPour;
          if (documentId) {
            const document = documents.find((d) => d.id === documentId);
            if (document) majLigne(documentId, { dossierId: nouveauDossier.id }, document);
          }
        }}
      />
    </Card>
  );
}
