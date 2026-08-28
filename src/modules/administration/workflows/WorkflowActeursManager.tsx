import { PlusOutlined } from '@ant-design/icons';
import { Button, Drawer, Popconfirm, Select, Space, Table, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useEntites } from '../../../hooks/administration/useEntites';
import { useFonctions } from '../../../hooks/administration/useFonctions';
import { useRoles, useUtilisateurs } from '../../../hooks/administration/useUtilisateurs';
import {
  useWorkflowActeurMutations,
  useWorkflowActeurs,
} from '../../../hooks/administration/useWorkflowsAdmin';
import type { Database } from '../../../types/database';
import type { WorkflowActeur } from '../../../services/administration/workflows';

type TypeActeur = Database['public']['Enums']['type_acteur_workflow'];

const LABEL_TYPE: Record<TypeActeur, string> = {
  role: 'Rôle',
  fonction: 'Fonction',
  entite: 'Entité',
  entite_et_descendants: 'Entité + descendants',
  utilisateur: 'Utilisateur',
  responsable_entite_courante: "Responsable de l'entité du dossier",
  superieur_hierarchique_courant: 'Supérieur hiérarchique du dossier',
};

const TYPES_SANS_CIBLE: TypeActeur[] = ['responsable_entite_courante', 'superieur_hierarchique_courant'];

interface Props {
  open: boolean;
  transitionId: string | null;
  libelleAction: string;
  organisationId: string;
  peutModifier: boolean;
  onClose: () => void;
}

export function WorkflowActeursManager({
  open,
  transitionId,
  libelleAction,
  organisationId,
  peutModifier,
  onClose,
}: Props) {
  const { data: acteurs, isLoading } = useWorkflowActeurs(transitionId ?? undefined);
  const { create, remove } = useWorkflowActeurMutations(transitionId ?? undefined);
  const { data: roles } = useRoles(organisationId);
  const { data: fonctions } = useFonctions(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateurs(organisationId);

  const [typeActeur, setTypeActeur] = useState<TypeActeur>('role');
  const [cibleId, setCibleId] = useState<string | undefined>();

  const roleParId = useMemo(() => new Map((roles ?? []).map((r) => [r.id, r.libelle])), [roles]);
  const fonctionParId = useMemo(() => new Map((fonctions ?? []).map((f) => [f.id, f.libelle])), [fonctions]);
  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  const optionsCible = () => {
    switch (typeActeur) {
      case 'role':
        return (roles ?? []).map((r) => ({ value: r.id, label: r.libelle }));
      case 'fonction':
        return (fonctions ?? []).map((f) => ({ value: f.id, label: f.libelle }));
      case 'entite':
      case 'entite_et_descendants':
        return (entites ?? []).map((e) => ({ value: e.id, label: e.libelle }));
      case 'utilisateur':
        return (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }));
      default:
        return [];
    }
  };

  const libelleActeur = (acteur: WorkflowActeur) => {
    switch (acteur.type_acteur) {
      case 'role':
        return acteur.role_id ? (roleParId.get(acteur.role_id) ?? '—') : '—';
      case 'fonction':
        return acteur.fonction_id ? (fonctionParId.get(acteur.fonction_id) ?? '—') : '—';
      case 'entite':
      case 'entite_et_descendants':
        return acteur.entite_id ? (entiteParId.get(acteur.entite_id) ?? '—') : '—';
      case 'utilisateur':
        return acteur.utilisateur_id ? (utilisateurParId.get(acteur.utilisateur_id) ?? '—') : '—';
      default:
        return '—';
    }
  };

  const onAjouter = () => {
    if (!transitionId) return;
    if (!TYPES_SANS_CIBLE.includes(typeActeur) && !cibleId) return;
    create.mutate(
      {
        workflow_transition_id: transitionId,
        type_acteur: typeActeur,
        role_id: typeActeur === 'role' ? (cibleId ?? null) : null,
        fonction_id: typeActeur === 'fonction' ? (cibleId ?? null) : null,
        entite_id: typeActeur === 'entite' || typeActeur === 'entite_et_descendants' ? (cibleId ?? null) : null,
        utilisateur_id: typeActeur === 'utilisateur' ? (cibleId ?? null) : null,
      },
      { onSuccess: () => setCibleId(undefined) },
    );
  };

  return (
    <Drawer open={open} onClose={onClose} title={`Acteurs — ${libelleAction}`} size={480}>
      <Typography.Paragraph type="secondary">
        Aucun acteur défini = transition ouverte à quiconque a accès au dossier. Ajouter un ou plusieurs
        acteurs restreint la transition à ceux qui correspondent à au moins une des lignes ci-dessous.
      </Typography.Paragraph>

      {peutModifier && (
        <Space style={{ marginBottom: 16 }} wrap align="start">
          <Select
            value={typeActeur}
            onChange={(v) => {
              setTypeActeur(v);
              setCibleId(undefined);
            }}
            style={{ width: 220 }}
            options={Object.entries(LABEL_TYPE).map(([value, label]) => ({ value, label }))}
          />
          {!TYPES_SANS_CIBLE.includes(typeActeur) && (
            <Select placeholder="Choisir" value={cibleId} onChange={setCibleId} style={{ width: 200 }} options={optionsCible()} />
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAjouter}
            disabled={!TYPES_SANS_CIBLE.includes(typeActeur) && !cibleId}
            loading={create.isPending}
          >
            Ajouter
          </Button>
        </Space>
      )}

      <Table<WorkflowActeur>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={acteurs}
        pagination={false}
        columns={[
          { title: 'Type', render: (_, a) => LABEL_TYPE[a.type_acteur] },
          { title: 'Cible', render: (_, a) => libelleActeur(a) },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  width: 100,
                  render: (_: unknown, a: WorkflowActeur) => (
                    <Popconfirm title="Retirer cet acteur ?" onConfirm={() => remove.mutate(a.id)}>
                      <Button type="link" size="small" danger>
                        Retirer
                      </Button>
                    </Popconfirm>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Drawer>
  );
}
