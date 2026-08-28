import { zodResolver } from '@hookform/resolvers/zod';
import { PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Switch,
  Table,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useModulesActions } from '../../../hooks/administration/useRolesAdmin';
import {
  useListeValeursMutations,
  useListesValeurs,
  useValeurListeMutations,
  useValeursListes,
} from '../../../hooks/administration/useParametrage';
import type { ListeValeurs, ValeurListe } from '../../../services/administration/parametrage';
import { slugifier } from '../../../utils/slug';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

const schemaListe = z.object({
  libelle: z.string().min(1, 'Requis'),
  code: z.string().min(1, 'Requis'),
  moduleId: z.string().optional(),
});
type FormListe = z.infer<typeof schemaListe>;

const schemaValeur = z.object({
  code: z.string().min(1, 'Requis'),
  libelle: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  couleur: z.string().optional(),
  ordre: z.number().int(),
  valeur_defaut: z.boolean(),
  actif: z.boolean(),
});
type FormValeur = z.infer<typeof schemaValeur>;

export function ListesValeursManager({ organisationId, peutModifier }: Props) {
  const { data: listes, isLoading } = useListesValeurs(organisationId);
  const { modules } = useModulesActions();
  const listeMutations = useListeValeursMutations(organisationId);
  const [listeSelectionnee, setListeSelectionnee] = useState<ListeValeurs | null>(null);
  const [editionListe, setEditionListe] = useState<ListeValeurs | 'nouveau' | null>(null);

  const { data: valeurs, isLoading: chargementValeurs } = useValeursListes(listeSelectionnee?.id);
  const valeurMutations = useValeurListeMutations(listeSelectionnee?.id);
  const [editionValeur, setEditionValeur] = useState<ValeurListe | 'nouveau' | null>(null);

  const { control: controlListe, handleSubmit: submitListe, reset: resetListe, setValue: setValeurListe, watch: watchListe } =
    useForm<FormListe>({ resolver: zodResolver(schemaListe), defaultValues: { libelle: '', code: '', moduleId: '' } });

  useEffect(() => {
    if (editionListe === 'nouveau') resetListe({ libelle: '', code: '', moduleId: '' });
    else if (editionListe) resetListe({ libelle: editionListe.libelle, code: editionListe.code, moduleId: editionListe.module_id ?? '' });
  }, [editionListe, resetListe]);

  const libelleListe = watchListe('libelle');
  useEffect(() => {
    if (editionListe === 'nouveau' && libelleListe) setValeurListe('code', slugifier(libelleListe));
  }, [libelleListe, editionListe, setValeurListe]);

  const onSubmitListe = (values: FormListe) => {
    if (editionListe === 'nouveau') {
      listeMutations.create.mutate(
        { organisation_id: organisationId, code: values.code, libelle: values.libelle, module_id: values.moduleId || null },
        { onSuccess: () => setEditionListe(null) },
      );
    } else if (editionListe) {
      listeMutations.update.mutate(
        { id: editionListe.id, patch: { code: values.code, libelle: values.libelle, module_id: values.moduleId || null } },
        { onSuccess: () => setEditionListe(null) },
      );
    }
  };

  const { control: controlValeur, handleSubmit: submitValeur, reset: resetValeur, setValue: setValeurValeur, watch: watchValeur } =
    useForm<FormValeur>({
      resolver: zodResolver(schemaValeur),
      defaultValues: { code: '', libelle: '', description: '', couleur: '', ordre: 0, valeur_defaut: false, actif: true },
    });

  useEffect(() => {
    if (editionValeur === 'nouveau') {
      resetValeur({ code: '', libelle: '', description: '', couleur: '', ordre: (valeurs?.length ?? 0) + 1, valeur_defaut: false, actif: true });
    } else if (editionValeur) {
      resetValeur({
        code: editionValeur.code,
        libelle: editionValeur.libelle,
        description: editionValeur.description ?? '',
        couleur: editionValeur.couleur ?? '',
        ordre: editionValeur.ordre,
        valeur_defaut: editionValeur.valeur_defaut,
        actif: editionValeur.actif,
      });
    }
  }, [editionValeur, resetValeur, valeurs]);

  const libelleValeur = watchValeur('libelle');
  useEffect(() => {
    if (editionValeur === 'nouveau' && libelleValeur) setValeurValeur('code', slugifier(libelleValeur));
  }, [libelleValeur, editionValeur, setValeurValeur]);

  const onSubmitValeur = (values: FormValeur) => {
    if (!listeSelectionnee) return;
    const patch = {
      code: values.code,
      libelle: values.libelle,
      description: values.description || null,
      couleur: values.couleur || null,
      ordre: values.ordre,
      valeur_defaut: values.valeur_defaut,
      actif: values.actif,
    };
    if (editionValeur === 'nouveau') {
      valeurMutations.create.mutate({ liste_id: listeSelectionnee.id, ...patch }, { onSuccess: () => setEditionValeur(null) });
    } else if (editionValeur) {
      valeurMutations.update.mutate({ id: editionValeur.id, patch }, { onSuccess: () => setEditionValeur(null) });
    }
  };

  const moduleParId = new Map((modules.data ?? []).map((m) => [m.id, m.libelle]));

  return (
    <div>
      <Typography.Title level={5}>Listes de valeurs</Typography.Title>
      <Typography.Paragraph type="secondary">
        Remplace les tables de statuts/priorités/types codées en dur : chaque liste regroupe des valeurs
        réutilisables par un ou plusieurs modules.
      </Typography.Paragraph>
      <Row gutter={16}>
        <Col span={10}>
          <Card
            size="small"
            title="Listes"
            extra={peutModifier && <Button size="small" icon={<PlusOutlined />} onClick={() => setEditionListe('nouveau')} />}
          >
            <Table<ListeValeurs>
              rowKey="id"
              size="small"
              loading={isLoading}
              dataSource={listes}
              pagination={false}
              onRow={(record) => ({ onClick: () => setListeSelectionnee(record), style: { cursor: 'pointer' } })}
              columns={[
                { title: 'Libellé', dataIndex: 'libelle' },
                { title: 'Module', render: (_, r) => (r.module_id ? moduleParId.get(r.module_id) : 'partagée') },
                ...(peutModifier
                  ? [
                      {
                        title: '',
                        key: 'actions',
                        width: 90,
                        render: (_: unknown, record: ListeValeurs) => (
                          <span onClick={(e) => e.stopPropagation()}>
                            <Button type="link" size="small" onClick={() => setEditionListe(record)}>
                              Modifier
                            </Button>
                            <Popconfirm title="Supprimer cette liste ?" onConfirm={() => listeMutations.remove.mutate(record.id)}>
                              <Button type="link" size="small" danger>
                                Suppr.
                              </Button>
                            </Popconfirm>
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </Col>
        <Col span={14}>
          <Card
            size="small"
            title={listeSelectionnee ? `Valeurs — ${listeSelectionnee.libelle}` : 'Valeurs'}
            extra={
              peutModifier &&
              listeSelectionnee && (
                <Button size="small" icon={<PlusOutlined />} onClick={() => setEditionValeur('nouveau')}>
                  Ajouter
                </Button>
              )
            }
          >
            {!listeSelectionnee ? (
              <Typography.Text type="secondary">Sélectionnez une liste à gauche.</Typography.Text>
            ) : (
              <Table<ValeurListe>
                rowKey="id"
                size="small"
                loading={chargementValeurs}
                dataSource={valeurs}
                pagination={false}
                columns={[
                  { title: 'Libellé', dataIndex: 'libelle' },
                  { title: 'Code', dataIndex: 'code' },
                  {
                    title: 'Défaut',
                    dataIndex: 'valeur_defaut',
                    width: 70,
                    render: (v: boolean) => (v ? '✓' : ''),
                  },
                  {
                    title: 'Actif',
                    dataIndex: 'actif',
                    width: 80,
                    render: (actif: boolean, record: ValeurListe) => (
                      <Switch
                        size="small"
                        checked={actif}
                        disabled={!peutModifier}
                        onChange={(checked) => valeurMutations.update.mutate({ id: record.id, patch: { actif: checked } })}
                      />
                    ),
                  },
                  ...(peutModifier
                    ? [
                        {
                          title: '',
                          key: 'actions',
                          width: 90,
                          render: (_: unknown, record: ValeurListe) => (
                            <span>
                              <Button type="link" size="small" onClick={() => setEditionValeur(record)}>
                                Modifier
                              </Button>
                              <Popconfirm title="Supprimer cette valeur ?" onConfirm={() => valeurMutations.remove.mutate(record.id)}>
                                <Button type="link" size="small" danger>
                                  Suppr.
                                </Button>
                              </Popconfirm>
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        open={editionListe !== null}
        title={editionListe === 'nouveau' ? 'Nouvelle liste' : 'Modifier la liste'}
        onCancel={() => setEditionListe(null)}
        onOk={submitListe(onSubmitListe)}
        confirmLoading={listeMutations.create.isPending || listeMutations.update.isPending}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Libellé">
            <Controller name="libelle" control={controlListe} render={({ field }) => <Input {...field} autoFocus />} />
          </Form.Item>
          <Form.Item label="Code">
            <Controller name="code" control={controlListe} render={({ field }) => <Input {...field} />} />
          </Form.Item>
          <Form.Item label="Module (vide = partagée entre modules)">
            <Controller
              name="moduleId"
              control={controlListe}
              render={({ field }) => (
                <Select {...field} allowClear options={(modules.data ?? []).map((m) => ({ value: m.id, label: m.libelle }))} />
              )}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={editionValeur !== null}
        title={editionValeur === 'nouveau' ? 'Nouvelle valeur' : 'Modifier la valeur'}
        onCancel={() => setEditionValeur(null)}
        onOk={submitValeur(onSubmitValeur)}
        confirmLoading={valeurMutations.create.isPending || valeurMutations.update.isPending}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Libellé">
            <Controller name="libelle" control={controlValeur} render={({ field }) => <Input {...field} autoFocus />} />
          </Form.Item>
          <Form.Item label="Code">
            <Controller name="code" control={controlValeur} render={({ field }) => <Input {...field} />} />
          </Form.Item>
          <Form.Item label="Description">
            <Controller name="description" control={controlValeur} render={({ field }) => <Input {...field} />} />
          </Form.Item>
          <Form.Item label="Couleur">
            <Controller
              name="couleur"
              control={controlValeur}
              render={({ field }) => (
                <ColorPicker
                  value={field.value || undefined}
                  onChange={(couleur) => field.onChange(couleur.toHexString())}
                />
              )}
            />
          </Form.Item>
          <Form.Item label="Ordre">
            <Controller
              name="ordre"
              control={controlValeur}
              render={({ field }) => <InputNumber {...field} onChange={(v) => field.onChange(v ?? 0)} style={{ width: '100%' }} />}
            />
          </Form.Item>
          <Form.Item label="Valeur par défaut">
            <Controller
              name="valeur_defaut"
              control={controlValeur}
              render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
            />
          </Form.Item>
          <Form.Item label="Actif">
            <Controller
              name="actif"
              control={controlValeur}
              render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
