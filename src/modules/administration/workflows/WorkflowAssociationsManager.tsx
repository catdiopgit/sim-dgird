import { PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Select, Space, Table, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useWorkflowAssociationMutations,
  useWorkflowDefinitionAssociations,
} from '../../../hooks/administration/useWorkflowsAdmin';
import { listListesValeurs, listValeursListes } from '../../../services/administration/parametrage';
import type { WorkflowDefinitionAssociation } from '../../../services/administration/workflows';

interface Props {
  workflowDefinitionId: string;
  organisationId: string;
  moduleId: string;
  peutModifier: boolean;
}

export function WorkflowAssociationsManager({ workflowDefinitionId, organisationId, moduleId, peutModifier }: Props) {
  const { data: associations, isLoading } = useWorkflowDefinitionAssociations(workflowDefinitionId);
  const { create, remove } = useWorkflowAssociationMutations(workflowDefinitionId);

  const { data: listes } = useQuery({
    queryKey: ['listes-valeurs-module', organisationId, moduleId],
    queryFn: async () => (await listListesValeurs(organisationId)).filter((l) => l.module_id === moduleId),
    enabled: Boolean(organisationId && moduleId),
  });

  const [listeId, setListeId] = useState<string | undefined>();
  const { data: valeurs } = useQuery({
    queryKey: ['valeurs-listes-pour-liste', listeId],
    queryFn: () => listValeursListes(listeId!),
    enabled: Boolean(listeId),
  });
  const [valeurId, setValeurId] = useState<string | undefined>();

  useEffect(() => {
    setValeurId(undefined);
  }, [listeId]);

  // Pour afficher le libellé des associations déjà créées, il faut résoudre
  // valeur_liste_id -> libellé pour toutes les listes du module (pas seulement
  // celle sélectionnée dans le formulaire).
  const { data: toutesLesValeurs } = useQuery({
    queryKey: ['valeurs-listes-toutes', (listes ?? []).map((l) => l.id).join(',')],
    queryFn: async () => {
      const resultats = await Promise.all((listes ?? []).map((l) => listValeursListes(l.id)));
      return resultats.flat();
    },
    enabled: (listes ?? []).length > 0,
  });
  const valeurParId = useMemo(
    () => new Map((toutesLesValeurs ?? []).map((v) => [v.id, v.libelle])),
    [toutesLesValeurs],
  );

  const onAjouter = () => {
    if (!valeurId) return;
    create.mutate(
      { workflow_definition_id: workflowDefinitionId, valeur_liste_id: valeurId },
      { onSuccess: () => setValeurId(undefined) },
    );
  };

  return (
    <div>
      <Typography.Title level={5}>Association à une valeur</Typography.Title>
      <Typography.Paragraph type="secondary">
        Ce workflow sera utilisé automatiquement quand la valeur associée est sélectionnée (ex. le sens
        du courrier), au lieu du workflow par défaut du module.
      </Typography.Paragraph>
      {peutModifier && (
        <Space style={{ marginBottom: 12 }}>
          <Select
            placeholder="Liste"
            style={{ width: 200 }}
            value={listeId}
            onChange={setListeId}
            options={(listes ?? []).map((l) => ({ value: l.id, label: l.libelle }))}
          />
          <Select
            placeholder="Valeur"
            style={{ width: 200 }}
            value={valeurId}
            onChange={setValeurId}
            options={(valeurs ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
            disabled={!listeId}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={onAjouter} disabled={!valeurId} loading={create.isPending}>
            Associer
          </Button>
        </Space>
      )}
      <Table<WorkflowDefinitionAssociation>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={associations}
        pagination={false}
        columns={[
          { title: 'Valeur associée', render: (_, a) => valeurParId.get(a.valeur_liste_id) ?? a.valeur_liste_id },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  width: 100,
                  render: (_: unknown, a: WorkflowDefinitionAssociation) => (
                    <Popconfirm title="Retirer cette association ?" onConfirm={() => remove.mutate(a.id)}>
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
    </div>
  );
}
