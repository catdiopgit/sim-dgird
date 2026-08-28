import { PlusOutlined } from '@ant-design/icons';
import { Button, Input, Select, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useEntites } from '../../../hooks/administration/useEntites';
import { useFonctions } from '../../../hooks/administration/useFonctions';
import { useRoles, useUtilisateurs } from '../../../hooks/administration/useUtilisateurs';
import { useProfile } from '../../../hooks/useProfile';
import type { Utilisateur } from '../../../services/administration/utilisateurs';
import { UtilisateurFormModal } from './UtilisateurFormModal';
import { UtilisateurRolesDrawer } from './UtilisateurRolesDrawer';

const COULEUR_STATUT: Record<string, string> = {
  actif: 'green',
  inactif: 'default',
  suspendu: 'red',
};

export function UtilisateursTab() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: utilisateurs, isLoading } = useUtilisateurs(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: fonctions } = useFonctions(organisationId);
  const { data: roles } = useRoles(organisationId);

  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<string | undefined>();
  const [filtreEntite, setFiltreEntite] = useState<string | undefined>();
  const [utilisateurEnEdition, setUtilisateurEnEdition] = useState<Utilisateur | 'nouveau' | null>(null);
  const [utilisateurRoles, setUtilisateurRoles] = useState<Utilisateur | null>(null);

  const peutCreer = can('utilisateurs', 'creer');
  const peutModifier = can('utilisateurs', 'modifier');
  const peutAffecter = can('utilisateurs', 'affecter');

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const fonctionParId = useMemo(() => new Map((fonctions ?? []).map((f) => [f.id, f.libelle])), [fonctions]);

  const donnees = (utilisateurs ?? []).filter((u) => {
    if (filtreStatut && u.statut !== filtreStatut) return false;
    if (filtreEntite && u.entite_id !== filtreEntite) return false;
    if (recherche) {
      const cible = `${u.nom} ${u.prenom} ${u.email}`.toLowerCase();
      if (!cible.includes(recherche.toLowerCase())) return false;
    }
    return true;
  });

  if (!organisationId) return <Skeleton active />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Utilisateurs
        </Typography.Title>
        {peutCreer && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setUtilisateurEnEdition('nouveau')}>
            Nouvel utilisateur
          </Button>
        )}
      </div>

      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search
          placeholder="Rechercher (nom, email…)"
          allowClear
          style={{ width: 260 }}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <Select
          placeholder="Statut"
          allowClear
          style={{ width: 160 }}
          value={filtreStatut}
          onChange={setFiltreStatut}
          options={[
            { value: 'actif', label: 'Actif' },
            { value: 'inactif', label: 'Inactif' },
            { value: 'suspendu', label: 'Suspendu' },
          ]}
        />
        <Select
          placeholder="Entité"
          allowClear
          style={{ width: 220 }}
          value={filtreEntite}
          onChange={setFiltreEntite}
          options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))}
        />
      </Space>

      <Table<Utilisateur>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={donnees}
        columns={[
          { title: 'Nom', render: (_, u) => `${u.prenom} ${u.nom}` },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Entité', render: (_, u) => (u.entite_id ? entiteParId.get(u.entite_id) : '—') },
          { title: 'Fonction', render: (_, u) => (u.fonction_id ? fonctionParId.get(u.fonction_id) : '—') },
          {
            title: 'Statut',
            dataIndex: 'statut',
            render: (statut: string) => <Tag color={COULEUR_STATUT[statut]}>{statut}</Tag>,
          },
          {
            title: 'Actions',
            width: 180,
            render: (_, u) => (
              <Space size="small">
                {peutModifier && (
                  <Button type="link" size="small" onClick={() => setUtilisateurEnEdition(u)}>
                    Modifier
                  </Button>
                )}
                {peutAffecter && (
                  <Button type="link" size="small" onClick={() => setUtilisateurRoles(u)}>
                    Rôles
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      <UtilisateurFormModal
        open={utilisateurEnEdition !== null}
        utilisateur={utilisateurEnEdition === 'nouveau' ? undefined : (utilisateurEnEdition ?? undefined)}
        organisationId={organisationId}
        entites={entites ?? []}
        fonctions={fonctions ?? []}
        onClose={() => setUtilisateurEnEdition(null)}
      />

      <UtilisateurRolesDrawer
        open={utilisateurRoles !== null}
        utilisateur={utilisateurRoles}
        roles={roles ?? []}
        entites={entites ?? []}
        onClose={() => setUtilisateurRoles(null)}
      />
    </div>
  );
}
