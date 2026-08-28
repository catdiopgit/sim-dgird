import { FolderAddOutlined, MoreOutlined } from '@ant-design/icons';
import { Alert, Button, Dropdown, Skeleton, Space, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useMemo, useState } from 'react';
import { useDossiers } from '../../../hooks/ged/useDossiers';
import { DossierFormModal } from '../../ged/DossierFormModal';
import type { GedDossier } from '../../../services/ged/dossiers';

interface Props {
  organisationId: string;
  // Réservé à l'administrateur et à l'archiviste (ged/modifier) — pas
  // "administration/modifier" comme le reste du Paramétrage : cf. demande
  // explicite, la gestion du plan de classement suit les droits GED.
  peutModifier: boolean;
}

type ModalState = { mode: 'creer'; parentId: string | null } | { mode: 'modifier'; dossier: GedDossier } | null;

// Plan de classement = arbre des dossiers (ged_dossiers.parent_dossier_id,
// déjà hiérarchique dans le schéma) : c'est cette arborescence, et elle
// seule, qui alimente le classement document par document (ClassementPanel)
// et la recherche dans les Archives — pas une notion de "catégorie" séparée.
export function PlanClassementManager({ organisationId, peutModifier }: Props) {
  const { data: dossiers, isLoading } = useDossiers(organisationId);
  const [modalState, setModalState] = useState<ModalState>(null);

  const menuPour = () => [
    { key: 'ajouter-enfant', label: 'Ajouter un sous-dossier' },
    { key: 'modifier', label: 'Renommer' },
  ];

  const gererClicMenu = (dossier: GedDossier, key: string) => {
    switch (key) {
      case 'ajouter-enfant':
        setModalState({ mode: 'creer', parentId: dossier.id });
        break;
      case 'modifier':
        setModalState({ mode: 'modifier', dossier });
        break;
    }
  };

  const arbre = useMemo<DataNode[]>(() => {
    const enfantsParParent = new Map<string | null, GedDossier[]>();
    for (const d of dossiers ?? []) {
      const liste = enfantsParParent.get(d.parent_dossier_id) ?? [];
      liste.push(d);
      enfantsParParent.set(d.parent_dossier_id, liste);
    }
    for (const liste of enfantsParParent.values()) liste.sort((a, b) => a.libelle.localeCompare(b.libelle));

    const construireNoeuds = (parentId: string | null): DataNode[] =>
      (enfantsParParent.get(parentId) ?? []).map((d) => ({
        key: d.id,
        title: (
          <Space size="small">
            <span>
              {d.libelle} <Typography.Text type="secondary">({d.code})</Typography.Text>
            </span>
            {peutModifier && (
              <Dropdown
                menu={{ items: menuPour(), onClick: ({ key }) => gererClicMenu(d, key) }}
                trigger={['click']}
              >
                <Button type="text" size="small" icon={<MoreOutlined />} onClick={(ev) => ev.stopPropagation()} />
              </Dropdown>
            )}
          </Space>
        ),
        children: construireNoeuds(d.id),
      }));

    return construireNoeuds(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossiers, peutModifier]);

  if (isLoading) return <Skeleton active />;

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, maxWidth: 640 }}
        message="Plan de classement"
        description="Cet arbre de dossiers alimente le classement des documents GED (document par document) et la recherche dans les Archives. L'archiviste peut aussi créer un nouveau dossier directement au moment du classement s'il n'existe pas encore ici."
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Dossiers
        </Typography.Title>
        {peutModifier && (
          <Button icon={<FolderAddOutlined />} onClick={() => setModalState({ mode: 'creer', parentId: null })}>
            Ajouter un dossier racine
          </Button>
        )}
      </div>

      {arbre.length === 0 ? (
        <Typography.Text type="secondary">Aucun dossier pour le moment.</Typography.Text>
      ) : (
        <Tree treeData={arbre} defaultExpandAll selectable={false} />
      )}

      <DossierFormModal
        open={modalState !== null}
        organisationId={organisationId}
        dossier={modalState?.mode === 'modifier' ? modalState.dossier : null}
        parentDossierId={modalState?.mode === 'creer' ? modalState.parentId : null}
        onClose={() => setModalState(null)}
      />
    </div>
  );
}
