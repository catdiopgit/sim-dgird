import { AppstoreOutlined, SearchOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Breadcrumb, Input, Segmented, Select, Space } from 'antd';
import { useMemo } from 'react';
import { CLE_NON_CLASSES } from '../../hooks/ged/useDossiers';
import type { GedDossier } from '../../services/ged/dossiers';

export type VueArchives = 'grille' | 'liste';
export type TriArchives = 'nom' | 'date' | 'taille' | 'type';

interface Props {
  dossiers: GedDossier[];
  dossierSelectionneId: string | null;
  onNaviguer: (id: string | null) => void;
  texteRecherche: string;
  onChangeRecherche: (texte: string) => void;
  vue: VueArchives;
  onChangeVue: (vue: VueArchives) => void;
  tri: TriArchives;
  onChangeTri: (tri: TriArchives) => void;
}

export function ArchivesToolbar({
  dossiers,
  dossierSelectionneId,
  onNaviguer,
  texteRecherche,
  onChangeRecherche,
  vue,
  onChangeVue,
  tri,
  onChangeTri,
}: Props) {
  const dossierParId = useMemo(() => new Map(dossiers.map((d) => [d.id, d])), [dossiers]);

  const fil = useMemo(() => {
    const items: { id: string | null; libelle: string }[] = [{ id: null, libelle: 'Archives' }];
    if (dossierSelectionneId === CLE_NON_CLASSES) {
      items.push({ id: CLE_NON_CLASSES, libelle: 'Non classés' });
      return items;
    }
    const chemin: GedDossier[] = [];
    let curseur = dossierSelectionneId ? dossierParId.get(dossierSelectionneId) : undefined;
    while (curseur) {
      chemin.unshift(curseur);
      curseur = curseur.parent_dossier_id ? dossierParId.get(curseur.parent_dossier_id) : undefined;
    }
    for (const d of chemin) items.push({ id: d.id, libelle: d.libelle });
    return items;
  }, [dossierSelectionneId, dossierParId]);

  const enRecherche = texteRecherche.trim().length > 0;

  return (
    <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }} size={10}>
      {enRecherche ? (
        <Breadcrumb items={[{ title: 'Résultats de recherche' }]} />
      ) : (
        <Breadcrumb
          items={fil.map((item, idx) =>
            idx === fil.length - 1
              ? { title: item.libelle }
              : {
                  title: (
                    <a onClick={() => onNaviguer(item.id)}>{item.libelle}</a>
                  ),
                },
          )}
        />
      )}

      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Input.Search
          placeholder="Rechercher dans les archives…"
          allowClear
          style={{ width: 320 }}
          prefix={<SearchOutlined />}
          value={texteRecherche}
          onChange={(e) => onChangeRecherche(e.target.value)}
        />
        <Space>
          <Select
            style={{ width: 170 }}
            value={tri}
            onChange={onChangeTri}
            options={[
              { value: 'nom', label: 'Trier par nom' },
              { value: 'date', label: "Trier par date d'archivage" },
              { value: 'taille', label: 'Trier par taille' },
              { value: 'type', label: 'Trier par type' },
            ]}
          />
          <Segmented
            value={vue}
            onChange={(v) => onChangeVue(v as VueArchives)}
            options={[
              { value: 'grille', icon: <AppstoreOutlined />, label: 'Grille' },
              { value: 'liste', icon: <UnorderedListOutlined />, label: 'Liste' },
            ]}
          />
        </Space>
      </Space>
    </Space>
  );
}
