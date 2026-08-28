import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Input, Popconfirm, Select, Space, Table, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useContacts } from '../../hooks/courrier/useContacts';
import { useDestinataireMutations, useDestinataires } from '../../hooks/courrier/useDestinataires';
import type { Destinataire } from '../../services/courrier/destinataires';

interface Props {
  courrierId: string;
  organisationId: string;
  peutModifier: boolean;
}

// Mise en copie (ampliataires) uniquement — distinct de l'imputation
// (CourrierImputationPanel), qui gère le destinataire "principal" (type_diffusion
// = 'principal') et met réellement à jour l'entité/l'agent en charge du dossier.
export function CourrierDestinataires({ courrierId, organisationId, peutModifier }: Props) {
  const { data: destinatairesTous, isLoading } = useDestinataires(courrierId);
  const { ajouter, retirer } = useDestinataireMutations(courrierId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: contacts } = useContacts(organisationId);

  const [cibleType, setCibleType] = useState<'entite' | 'utilisateur' | 'contact'>('entite');
  const [cibleId, setCibleId] = useState<string | undefined>();
  const [instruction, setInstruction] = useState('');
  const [echeance, setEcheance] = useState<Dayjs | null>(null);

  const copies = useMemo(() => (destinatairesTous ?? []).filter((d) => d.type_diffusion === 'copie'), [destinatairesTous]);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const contactParId = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, c.nom])), [contacts]);

  const onAjouter = () => {
    if (!cibleId) return;
    ajouter.mutate(
      {
        courrier_id: courrierId,
        entite_id: cibleType === 'entite' ? cibleId : null,
        utilisateur_id: cibleType === 'utilisateur' ? cibleId : null,
        contact_id: cibleType === 'contact' ? cibleId : null,
        type_diffusion: 'copie',
        instruction: instruction || null,
        echeance: echeance ? echeance.format('YYYY-MM-DD') : null,
      },
      {
        onSuccess: () => {
          setCibleId(undefined);
          setInstruction('');
          setEcheance(null);
        },
      },
    );
  };

  return (
    <Card title="Copies (ampliataires)" style={{ marginTop: 16 }}>
      <Typography.Paragraph type="secondary">
        Entités, utilisateurs ou contacts externes mis en copie pour information — ne change pas
        l'entité en charge du dossier (voir le panneau Imputation ci-dessus).
      </Typography.Paragraph>
      {peutModifier && (
        <Space style={{ marginBottom: 12 }} wrap align="start">
          <Select
            value={cibleType}
            onChange={(v) => {
              setCibleType(v);
              setCibleId(undefined);
            }}
            style={{ width: 150 }}
            options={[
              { value: 'entite', label: 'Entité' },
              { value: 'utilisateur', label: 'Utilisateur' },
              { value: 'contact', label: 'Contact externe' },
            ]}
          />
          <Select
            placeholder="Choisir"
            value={cibleId}
            onChange={setCibleId}
            style={{ width: 200 }}
            showSearch
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={
              cibleType === 'entite'
                ? (entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))
                : cibleType === 'utilisateur'
                  ? (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))
                  : (contacts ?? []).map((c) => ({ value: c.id, label: c.nom }))
            }
          />
          <Input
            placeholder="Instruction / consigne"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            style={{ width: 200 }}
          />
          <DatePicker placeholder="Échéance" value={echeance} onChange={setEcheance} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAjouter}
            disabled={!cibleId}
            loading={ajouter.isPending}
          >
            Ajouter
          </Button>
        </Space>
      )}

      <Table<Destinataire>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={copies}
        pagination={false}
        columns={[
          {
            title: 'Destinataire',
            render: (_, d) =>
              d.entite_id
                ? (entiteParId.get(d.entite_id) ?? '—')
                : d.utilisateur_id
                  ? (utilisateurParId.get(d.utilisateur_id) ?? '—')
                  : d.contact_id
                    ? (contactParId.get(d.contact_id) ?? '—')
                    : '—',
          },
          { title: 'Instruction', dataIndex: 'instruction', render: (v: string | null) => v ?? '—' },
          {
            title: 'Échéance',
            dataIndex: 'echeance',
            width: 110,
            render: (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
          },
          {
            title: 'Pris connaissance',
            render: (_, d) =>
              d.date_prise_connaissance ? new Date(d.date_prise_connaissance).toLocaleString('fr-FR') : '—',
          },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  width: 100,
                  render: (_: unknown, d: Destinataire) => (
                    <Popconfirm title="Retirer ce destinataire ?" onConfirm={() => retirer.mutate(d.id)}>
                      <Button type="link" danger size="small">
                        Retirer
                      </Button>
                    </Popconfirm>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}
