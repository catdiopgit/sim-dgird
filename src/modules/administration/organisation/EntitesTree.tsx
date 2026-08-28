import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Dropdown, Skeleton, Space, Tag, Tree, Typography, type MenuProps } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useMemo, useState } from 'react';
import { useEntiteMutations, useEntites, useUtilisateursOptions } from '../../../hooks/administration/useEntites';
import { useTypeEntites } from '../../../hooks/administration/useTypeEntites';
import type { Entite } from '../../../services/administration/entites';
import { EntiteFormModal, type EntiteFormValues } from './EntiteFormModal';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

type ModalState =
  | { mode: 'creer-racine' }
  | { mode: 'creer-enfant'; parentId: string }
  | { mode: 'modifier'; entite: Entite }
  | null;

export function EntitesTree({ organisationId, peutModifier }: Props) {
  const { data: entites, isLoading: chargementEntites } = useEntites(organisationId);
  const { data: typeEntites, isLoading: chargementTypes } = useTypeEntites(organisationId);
  const { data: utilisateursOptions } = useUtilisateursOptions(organisationId);
  const { create, update, remove } = useEntiteMutations(organisationId);
  const [modalState, setModalState] = useState<ModalState>(null);

  const typeParId = useMemo(
    () => new Map((typeEntites ?? []).map((t) => [t.id, t.libelle])),
    [typeEntites],
  );

  const menuPour = (entite: Entite): MenuProps['items'] => [
    { key: 'ajouter-enfant', label: 'Ajouter une sous-entité' },
    { key: 'modifier', label: 'Modifier' },
    { key: 'toggle-actif', label: entite.actif ? 'Désactiver' : 'Activer' },
    { key: 'supprimer', label: 'Supprimer', danger: true },
  ];

  const gererClicMenu = (entite: Entite, key: string) => {
    switch (key) {
      case 'ajouter-enfant':
        setModalState({ mode: 'creer-enfant', parentId: entite.id });
        break;
      case 'modifier':
        setModalState({ mode: 'modifier', entite });
        break;
      case 'toggle-actif':
        update.mutate({ id: entite.id, patch: { actif: !entite.actif } });
        break;
      case 'supprimer':
        remove.mutate(entite.id);
        break;
    }
  };

  const arbre = useMemo(() => {
    const enfantsParParent = new Map<string | null, Entite[]>();
    for (const e of entites ?? []) {
      const liste = enfantsParParent.get(e.parent_entite_id) ?? [];
      liste.push(e);
      enfantsParParent.set(e.parent_entite_id, liste);
    }
    for (const liste of enfantsParParent.values()) liste.sort((a, b) => a.ordre - b.ordre);

    const construireNoeuds = (parentId: string | null): DataNode[] =>
      (enfantsParParent.get(parentId) ?? []).map((e) => ({
        key: e.id,
        title: (
          <Space size="small" style={{ opacity: e.actif ? 1 : 0.5 }}>
            <Tag color="green">{typeParId.get(e.type_entite_id) ?? '—'}</Tag>
            <span>
              {e.libelle}
              {e.sigle ? ` (${e.sigle})` : ''}
            </span>
            {!e.actif && <Tag>inactif</Tag>}
            {peutModifier && (
              <Dropdown
                menu={{ items: menuPour(e), onClick: ({ key }) => gererClicMenu(e, key) }}
                trigger={['click']}
              >
                <Button type="text" size="small" icon={<MoreOutlined />} onClick={(ev) => ev.stopPropagation()} />
              </Dropdown>
            )}
          </Space>
        ),
        children: construireNoeuds(e.id),
      }));

    return construireNoeuds(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entites, typeParId, peutModifier]);

  const onSubmitModal = (values: EntiteFormValues) => {
    const patchCommun = {
      type_entite_id: values.type_entite_id,
      code: values.code,
      libelle: values.libelle,
      sigle: values.sigle || null,
      responsable_utilisateur_id: values.responsable_utilisateur_id || null,
      personne_receptrice_id: values.personne_receptrice_id || null,
    };
    if (modalState?.mode === 'creer-racine') {
      create.mutate(
        { organisation_id: organisationId, parent_entite_id: null, ...patchCommun },
        { onSuccess: () => setModalState(null) },
      );
    } else if (modalState?.mode === 'creer-enfant') {
      create.mutate(
        { organisation_id: organisationId, parent_entite_id: modalState.parentId, ...patchCommun },
        { onSuccess: () => setModalState(null) },
      );
    } else if (modalState?.mode === 'modifier') {
      update.mutate(
        { id: modalState.entite.id, patch: patchCommun },
        { onSuccess: () => setModalState(null) },
      );
    }
  };

  if (chargementEntites || chargementTypes) {
    return <Skeleton active />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Structure organisationnelle
        </Typography.Title>
        {peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setModalState({ mode: 'creer-racine' })}>
            Ajouter une entité racine
          </Button>
        )}
      </div>

      {arbre.length === 0 ? (
        <Typography.Text type="secondary">Aucune entité pour le moment.</Typography.Text>
      ) : (
        <Tree treeData={arbre} defaultExpandAll selectable={false} />
      )}

      <EntiteFormModal
        open={modalState !== null}
        estNouveau={modalState?.mode !== 'modifier'}
        titre={
          modalState?.mode === 'modifier'
            ? "Modifier l'entité"
            : modalState?.mode === 'creer-enfant'
              ? 'Nouvelle sous-entité'
              : 'Nouvelle entité racine'
        }
        valeursInitiales={
          modalState?.mode === 'modifier'
            ? {
                type_entite_id: modalState.entite.type_entite_id,
                code: modalState.entite.code,
                libelle: modalState.entite.libelle,
                sigle: modalState.entite.sigle ?? '',
                responsable_utilisateur_id: modalState.entite.responsable_utilisateur_id ?? '',
                personne_receptrice_id: modalState.entite.personne_receptrice_id ?? '',
              }
            : undefined
        }
        typeEntites={typeEntites ?? []}
        utilisateursOptions={utilisateursOptions ?? []}
        confirmLoading={create.isPending || update.isPending}
        onCancel={() => setModalState(null)}
        onSubmit={onSubmitModal}
      />
    </div>
  );
}
