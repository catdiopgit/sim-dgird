import { ArrowLeftOutlined, InboxOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, DatePicker, Empty, Modal, Row, Skeleton, Space, Table, Tag, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useArchivageCompteurs,
  useArchivageElements,
  useArchivageMutations,
  useOperationEnPreparation,
} from '../../../hooks/ged/useArchivage';
import { useProfile } from '../../../hooks/useProfile';
import type { ArchivageElement } from '../../../services/ged/archivage';

const { RangePicker } = DatePicker;

const LABEL_TYPE: Record<ArchivageElement['type_element'], string> = {
  courrier: 'Courrier',
  projet: 'Projet',
  mission: 'Mission',
};

interface Classement {
  annee?: number;
  typeCourrierLibelle?: string;
  entiteLibelle?: string;
}

function formatClassement(element: ArchivageElement): string {
  const c = (element.classement ?? {}) as Classement;
  const parties = [c.annee?.toString()];
  if (element.type_element === 'courrier') parties.push(c.typeCourrierLibelle ?? '—');
  parties.push(c.entiteLibelle ?? '—');
  return parties.filter(Boolean).join(' / ');
}

function anneeParDefaut(): [Dayjs, Dayjs] {
  const annee = dayjs().year() - 1;
  return [dayjs(`${annee}-01-01`), dayjs(`${annee}-12-31`)];
}

// 0 et "donnée indisponible" ne signifient pas la même chose (§9 du brief
// dashboard, même principe ici) : distinct de compteurs undefined (chargement
// en cours ou échec de récupération), jamais confondu avec un vrai zéro.
function CompteurCard({ titre, valeur, chargement }: { titre: string; valeur: number | undefined; chargement: boolean }) {
  return (
    <Card size="small">
      <Typography.Text type="secondary">{titre}</Typography.Text>
      {chargement ? (
        <Skeleton active paragraph={false} title={{ width: 60 }} style={{ marginTop: 8 }} />
      ) : valeur === undefined ? (
        <div>
          <Typography.Title level={3} style={{ margin: 0, color: '#838C86' }}>
            —
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Données indisponibles
          </Typography.Text>
        </div>
      ) : (
        <Typography.Title level={3} style={{ margin: 0 }}>
          {valeur}
        </Typography.Title>
      )}
    </Card>
  );
}

// Page GED → Archives → Archivage (documentation/Archivage Automatique.txt) :
// l'archiviste prépare en un clic (détection automatique des courriers/
// projets/missions clôturés depuis ≥1 an), revoit la liste, puis confirme —
// seule cette confirmation classe définitivement (§3 du brief : aucun élément
// n'est considéré comme archivé avant confirmation explicite).
export function ArchivagePage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const [periode, setPeriode] = useState<[Dayjs, Dayjs]>(anneeParDefaut);
  const [modalConfirmationOuvert, setModalConfirmationOuvert] = useState(false);

  const dateDebut = periode[0].format('YYYY-MM-DD');
  const dateFin = periode[1].format('YYYY-MM-DD');

  const { data: compteurs, isLoading: chargementCompteurs } = useArchivageCompteurs(dateDebut, dateFin);
  const { data: operation } = useOperationEnPreparation(organisationId);
  const { data: elements, isLoading: chargementElements } = useArchivageElements(operation?.id);
  const { preparer, definirSelection, confirmer } = useArchivageMutations(organisationId);

  const peutConsulter = can('ged', 'consulter');
  const peutArchiver = can('ged', 'archiver');
  const peutValider = can('ged', 'valider');

  const eligibles = useMemo(() => (elements ?? []).filter((e) => e.etat === 'eligible'), [elements]);
  const anomalies = useMemo(() => (elements ?? []).filter((e) => e.etat === 'anomalie'), [elements]);
  const selectionnes = eligibles.filter((e) => e.selectionne);
  const nbCourriersSelectionnes = selectionnes.filter((e) => e.type_element === 'courrier').length;
  const nbProjetsSelectionnes = selectionnes.filter((e) => e.type_element === 'projet').length;
  const nbMissionsSelectionnes = selectionnes.filter((e) => e.type_element === 'mission').length;

  if (!organisationId) return <Skeleton active />;

  if (!peutConsulter) {
    return <Alert type="warning" showIcon message="Vous n'avez pas accès à l'archivage GED." />;
  }

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/ged')}>
          Retour
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Archivage
        </Typography.Title>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <CompteurCard titre="Courriers à archiver" valeur={compteurs?.courriers} chargement={chargementCompteurs} />
        </Col>
        <Col xs={12} md={6}>
          <CompteurCard titre="Projets à archiver" valeur={compteurs?.projets} chargement={chargementCompteurs} />
        </Col>
        <Col xs={12} md={6}>
          <CompteurCard titre="Missions à archiver" valeur={compteurs?.missions} chargement={chargementCompteurs} />
        </Col>
        <Col xs={12} md={6}>
          <CompteurCard titre="Déjà archivés" valeur={compteurs?.dejaArchives} chargement={chargementCompteurs} />
        </Col>
      </Row>

      {compteurs?.derniereOperation && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Dernière opération : {dayjs(compteurs.derniereOperation.dateDebut).format('DD/MM/YYYY')} →{' '}
          {dayjs(compteurs.derniereOperation.dateFin).format('DD/MM/YYYY')} — statut :{' '}
          {compteurs.derniereOperation.statut === 'confirmee' ? 'Terminé' : 'En préparation'}
          {compteurs.derniereOperation.confirmeLe &&
            ` (confirmé le ${dayjs(compteurs.derniereOperation.confirmeLe).format('DD/MM/YYYY')})`}
        </Typography.Paragraph>
      )}

      {peutArchiver && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Typography.Text>Période :</Typography.Text>
            <RangePicker
              value={periode}
              format="DD/MM/YYYY"
              allowClear={false}
              onChange={(v) => v && v[0] && v[1] && setPeriode([v[0], v[1]])}
            />
            <Button
              type="primary"
              icon={<InboxOutlined />}
              loading={preparer.isPending}
              onClick={() => preparer.mutate({ dateDebut, dateFin })}
            >
              Préparer l'archivage annuel
            </Button>
          </Space>
        </Card>
      )}

      {operation && (
        <>
          <Card
            size="small"
            title={`Éléments détectés — ${dayjs(operation.date_debut).format('DD/MM/YYYY')} → ${dayjs(operation.date_fin).format('DD/MM/YYYY')}`}
            extra={
              peutValider && (
                <Button type="primary" disabled={selectionnes.length === 0} onClick={() => setModalConfirmationOuvert(true)}>
                  Confirmer l'archivage
                </Button>
              )
            }
            style={{ marginBottom: 16 }}
          >
            {chargementElements ? (
              <Skeleton active />
            ) : eligibles.length === 0 ? (
              <Empty description="Aucun élément éligible pour cette période" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Table<ArchivageElement>
                rowKey="id"
                size="small"
                dataSource={eligibles}
                pagination={{ pageSize: 20 }}
                rowSelection={{
                  selectedRowKeys: eligibles.filter((e) => e.selectionne).map((e) => e.id),
                  onSelect: (record, selected) => definirSelection.mutate({ elementId: record.id, selectionne: selected }),
                  onSelectAll: (selected, _selectedRows, changeRows) =>
                    changeRows.forEach((r) => definirSelection.mutate({ elementId: r.id, selectionne: selected })),
                }}
                columns={[
                  { title: 'Type', dataIndex: 'type_element', width: 100, render: (v: ArchivageElement['type_element']) => <Tag>{LABEL_TYPE[v]}</Tag> },
                  { title: 'Référence', dataIndex: 'reference', width: 160 },
                  { title: 'Libellé', dataIndex: 'libelle' },
                  {
                    title: 'Date de clôture',
                    dataIndex: 'date_cloture',
                    width: 130,
                    render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
                  },
                  { title: 'Classement', render: (_, e) => formatClassement(e) },
                ]}
              />
            )}
          </Card>

          {anomalies.length > 0 && (
            <Card size="small" title="Éléments nécessitant une intervention">
              <Space direction="vertical" style={{ width: '100%' }}>
                {anomalies.map((a) => (
                  <div key={a.id}>
                    <Typography.Text>
                      <WarningOutlined style={{ color: '#C98A1D', marginRight: 6 }} />
                      {LABEL_TYPE[a.type_element]} {a.reference} — {a.libelle}
                    </Typography.Text>
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {a.motif_anomalie} Corrigez l'information manquante depuis le module concerné, puis relancez la
                      préparation.
                    </Typography.Text>
                  </div>
                ))}
              </Space>
            </Card>
          )}
        </>
      )}

      <Modal
        title="Confirmer l'archivage"
        open={modalConfirmationOuvert}
        onCancel={() => setModalConfirmationOuvert(false)}
        onOk={() => {
          if (!operation) return;
          confirmer.mutate(operation.id, { onSuccess: () => setModalConfirmationOuvert(false) });
        }}
        okText="Confirmer l'archivage"
        cancelText="Annuler"
        confirmLoading={confirmer.isPending}
      >
        <Typography.Paragraph>
          Vous êtes sur le point d'archiver {nbCourriersSelectionnes} courrier(s), {nbProjetsSelectionnes} projet(s) et{' '}
          {nbMissionsSelectionnes} mission(s) pour la période du {dayjs(dateDebut).format('DD/MM/YYYY')} au{' '}
          {dayjs(dateFin).format('DD/MM/YYYY')}.
        </Typography.Paragraph>
        <Typography.Paragraph>
          Après confirmation, ces éléments seront intégrés aux archives selon le plan de classement défini.
        </Typography.Paragraph>
        <Typography.Paragraph strong>Confirmez-vous cette opération ?</Typography.Paragraph>
      </Modal>
    </div>
  );
}
