import { FolderOutlined, InboxOutlined } from '@ant-design/icons';
import { Button, Skeleton, Space, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useEffect, useMemo, useState } from 'react';
import { CLE_NON_CLASSES, useCompteurDocumentsParDossier, useDossiers } from '../../hooks/ged/useDossiers';
import type { GedDossier } from '../../services/ged/dossiers';

interface Props {
  organisationId: string;
  dossierSelectionneId: string | null;
  onSelectionner: (id: string | null) => void;
}

// Panneau gauche de l'explorateur Archives : navigation en lecture seule dans
// le plan de classement (ged_dossiers). Aucune création/renommage ici — cette
// gestion reste réservée à Administration > Paramétrage et au panneau
// Classement (cf. project_ged_plan_classement).
export function ArchivesTreePanel({ organisationId, dossierSelectionneId, onSelectionner }: Props) {
  const { data: dossiers, isLoading } = useDossiers(organisationId);
  const { compteurs } = useCompteurDocumentsParDossier(organisationId);

  const { arbre, cheminVersSelection } = useMemo(() => {
    const enfantsParParent = new Map<string | null, GedDossier[]>();
    for (const d of dossiers ?? []) {
      const liste = enfantsParParent.get(d.parent_dossier_id) ?? [];
      liste.push(d);
      enfantsParParent.set(d.parent_dossier_id, liste);
    }
    for (const liste of enfantsParParent.values()) liste.sort((a, b) => a.libelle.localeCompare(b.libelle));

    const parentParId = new Map((dossiers ?? []).map((d) => [d.id, d.parent_dossier_id]));

    const titreNoeud = (libelle: string, nb: number) => (
      <Space size={6}>
        <span>{libelle}</span>
        {nb > 0 && <Typography.Text type="secondary">({nb})</Typography.Text>}
      </Space>
    );

    const construireNoeuds = (parentId: string | null): DataNode[] =>
      (enfantsParParent.get(parentId) ?? []).map((d) => ({
        key: d.id,
        icon: <FolderOutlined />,
        title: titreNoeud(d.libelle, compteurs.get(d.id) ?? 0),
        children: construireNoeuds(d.id),
      }));

    const noeuds = construireNoeuds(null);
    const nbNonClasses = compteurs.get(CLE_NON_CLASSES) ?? 0;
    if (nbNonClasses > 0) {
      noeuds.push({
        key: CLE_NON_CLASSES,
        icon: <InboxOutlined />,
        title: titreNoeud('Non classés', nbNonClasses),
        isLeaf: true,
      });
    }

    const chemin: string[] = [];
    let curseur = dossierSelectionneId;
    while (curseur && curseur !== CLE_NON_CLASSES) {
      chemin.unshift(curseur);
      curseur = parentParId.get(curseur) ?? null;
    }

    return { arbre: noeuds, cheminVersSelection: chemin };
  }, [dossiers, compteurs, dossierSelectionneId]);

  // Expansion librement pilotée par l'utilisateur (onExpand) ; on y fusionne
  // simplement le chemin vers la sélection courante quand elle change, sans
  // écraser ce que l'utilisateur a ouvert/fermé ailleurs dans l'arbre.
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  useEffect(() => {
    if (cheminVersSelection.length === 0) return;
    setExpandedKeys((precedent) => Array.from(new Set([...precedent, ...cheminVersSelection])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierSelectionneId]);

  if (isLoading) return <Skeleton active />;

  return (
    <div>
      <Button
        type={dossierSelectionneId === null ? 'primary' : 'text'}
        icon={<FolderOutlined />}
        block
        style={{ textAlign: 'left', marginBottom: 8 }}
        onClick={() => onSelectionner(null)}
      >
        Archives
      </Button>

      {arbre.length === 0 ? (
        <Typography.Text type="secondary">Aucun dossier pour le moment.</Typography.Text>
      ) : (
        <Tree
          treeData={arbre}
          showIcon
          selectedKeys={dossierSelectionneId ? [dossierSelectionneId] : []}
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys as string[])}
          onSelect={(keys) => onSelectionner(keys.length > 0 ? (keys[0] as string) : null)}
        />
      )}
    </div>
  );
}
