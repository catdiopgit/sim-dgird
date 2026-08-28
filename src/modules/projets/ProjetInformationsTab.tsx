import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Popconfirm, Progress, Select, Space, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useContactExecutionMutations, useContactsExecution } from '../../hooks/projets/useContactsExecution';
import { useMembresProjet } from '../../hooks/projets/useMembresProjet';
import { useProjetMutations } from '../../hooks/projets/useProjets';
import { useVisibiliteEntites, useVisibiliteMutations, useVisibiliteUtilisateurs } from '../../hooks/projets/useVisibiliteProjet';
import type { ContactExecution } from '../../services/projets/contactsExecution';
import type { Projet } from '../../services/projets/projets';
import type { Entite, UtilisateurOption } from '../../services/administration/entites';
import { ContactExecutionFormModal } from './ContactExecutionFormModal';

interface Props {
  projet: Projet;
  organisationId: string;
  peutModifier: boolean;
  entiteParId: Map<string, string>;
  utilisateurParId: Map<string, string>;
  entites: Entite[] | undefined;
  utilisateurs: UtilisateurOption[] | undefined;
}

const LIBELLES_PORTEE: Record<Projet['portee_visibilite'], string> = {
  membres: 'Membres du projet uniquement',
  entites: "Agents d'une ou plusieurs entités",
  agents: 'Agents spécifiques',
  tous: 'Tout le monde (organisation)',
};

const LIBELLES_ORGANISME: Record<Projet['organisme_execution_type'], string> = {
  organisation: "L'organisation elle-même",
  consultant: 'Consultant',
  entreprise: 'Entreprise',
  externe: 'Autre organisme externe',
};

// §8 Informations générales, organisme/chargé de l'exécution (§1, §4) et
// visibilité (§5). L'avancement n'est plus qu'affiché : il est calculé
// automatiquement à partir des livrables (app.fn_recalculer_avancement_projet,
// déclenché à chaque changement de livrable — voir migration 0073).
export function ProjetInformationsTab({
  projet,
  organisationId,
  peutModifier,
  entiteParId,
  utilisateurParId,
  entites,
  utilisateurs,
}: Props) {
  const { data: visibiliteEntites } = useVisibiliteEntites(projet.id);
  const { data: visibiliteUtilisateurs } = useVisibiliteUtilisateurs(projet.id);
  const { definirEntites, definirUtilisateurs } = useVisibiliteMutations(projet.id);
  const { data: membres } = useMembresProjet(projet.id);
  const { data: contacts } = useContactsExecution(projet.id);
  const { remove: supprimerContact } = useContactExecutionMutations(projet.id);
  const { update: mettreAJourProjet } = useProjetMutations(organisationId);
  const [contactFormOuvert, setContactFormOuvert] = useState(false);

  const entiteIdsSelectionnees = useMemo(() => (visibiliteEntites ?? []).map((v) => v.entite_id), [visibiliteEntites]);
  const utilisateurIdsSelectionnes = useMemo(
    () => (visibiliteUtilisateurs ?? []).map((v) => v.utilisateur_id),
    [visibiliteUtilisateurs],
  );
  const contactParId = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, c.nom])), [contacts]);

  const optionsChargeExecution = useMemo(
    () => [
      {
        label: 'Membres du projet',
        options: (membres ?? []).map((m) => ({
          value: `membre:${m.utilisateur_id}`,
          label: utilisateurParId.get(m.utilisateur_id) ?? m.utilisateur_id,
        })),
      },
      {
        label: "Contacts d'exécution",
        options: (contacts ?? []).map((c) => ({ value: `contact:${c.id}`, label: c.nom })),
      },
    ],
    [membres, contacts, utilisateurParId],
  );

  const valeurChargeExecution = projet.charge_execution_utilisateur_id
    ? `membre:${projet.charge_execution_utilisateur_id}`
    : projet.charge_execution_contact_id
      ? `contact:${projet.charge_execution_contact_id}`
      : undefined;

  const nomChargeExecution = projet.charge_execution_utilisateur_id
    ? (utilisateurParId.get(projet.charge_execution_utilisateur_id) ?? '—')
    : projet.charge_execution_contact_id
      ? (contactParId.get(projet.charge_execution_contact_id) ?? '—')
      : null;

  const changerChargeExecution = (valeur: string | undefined) => {
    const [type, id] = valeur ? valeur.split(':') : [null, null];
    mettreAJourProjet.mutate({
      id: projet.id,
      patch: {
        charge_execution_utilisateur_id: type === 'membre' ? id : null,
        charge_execution_contact_id: type === 'contact' ? id : null,
      },
    });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card title="Informations générales">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Référence">{projet.code}</Descriptions.Item>
          <Descriptions.Item label="Entité porteuse">{entiteParId.get(projet.entite_id) ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Intitulé" span={2}>
            {projet.nom}
          </Descriptions.Item>
          <Descriptions.Item label="Responsable du projet">
            {projet.responsable_id ? (utilisateurParId.get(projet.responsable_id) ?? '—') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Coordonnateur">
            {projet.coordonnateur_id ? (utilisateurParId.get(projet.coordonnateur_id) ?? '—') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Date de début">
            {projet.date_debut ? new Date(projet.date_debut).toLocaleDateString('fr-FR') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Date de fin prévue">
            {projet.date_fin_prevue ? new Date(projet.date_fin_prevue).toLocaleDateString('fr-FR') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Budget prévu">
            {projet.budget_prevu != null ? `${projet.budget_prevu.toLocaleString('fr-FR')} FCFA` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Budget réel">
            {projet.budget_reel != null ? `${projet.budget_reel.toLocaleString('fr-FR')} FCFA` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Financement">{projet.financement || '—'}</Descriptions.Item>
          <Descriptions.Item label="Lieu d'exécution">{projet.lieu_execution || '—'}</Descriptions.Item>
          <Descriptions.Item label="Avancement (calculé)">
            <Progress percent={Math.round(projet.avancement_pct)} size="small" status={projet.avancement_pct >= 100 ? 'success' : 'active'} />
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {projet.description || '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Exécution">
        <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Organisme chargé de l'exécution">
            {LIBELLES_ORGANISME[projet.organisme_execution_type]}
            {projet.organisme_execution_type !== 'organisation' && projet.organisme_execution_nom
              ? ` — ${projet.organisme_execution_nom}`
              : ''}
          </Descriptions.Item>
          <Descriptions.Item label="Chargé de l'exécution">{nomChargeExecution ?? '—'}</Descriptions.Item>
        </Descriptions>

        {peutModifier && (
          <>
            <Typography.Text strong>Modifier le chargé de l'exécution</Typography.Text>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%', marginTop: 8, marginBottom: 16 }}
              value={valeurChargeExecution}
              onChange={changerChargeExecution}
              options={optionsChargeExecution}
            />
          </>
        )}

        <Typography.Text strong>Contacts d'exécution</Typography.Text>
        <Table<ContactExecution>
          style={{ marginTop: 8 }}
          rowKey="id"
          size="small"
          dataSource={contacts}
          pagination={false}
          columns={[
            { title: 'Nom', dataIndex: 'nom' },
            { title: 'Fonction', dataIndex: 'fonction', render: (v) => v || '—' },
            { title: 'Email', dataIndex: 'email', render: (v) => v || '—' },
            { title: 'Téléphone', dataIndex: 'telephone', render: (v) => v || '—' },
            ...(peutModifier
              ? [
                  {
                    title: 'Actions',
                    key: 'actions',
                    width: 100,
                    render: (_: unknown, c: ContactExecution) => (
                      <Popconfirm title="Supprimer ce contact ?" onConfirm={() => supprimerContact.mutate(c.id)}>
                        <Button type="link" size="small" danger>
                          Supprimer
                        </Button>
                      </Popconfirm>
                    ),
                  },
                ]
              : []),
          ]}
        />
        {peutModifier && (
          <Button
            style={{ marginTop: 8 }}
            icon={<PlusOutlined />}
            onClick={() => setContactFormOuvert(true)}
          >
            Ajouter un contact
          </Button>
        )}
      </Card>

      <Card title="Visibilité">
        <Typography.Paragraph>
          Portée actuelle : <Tag>{LIBELLES_PORTEE[projet.portee_visibilite]}</Tag>
          {' '}— modifiable depuis le bouton « Modifier » du projet.
        </Typography.Paragraph>

        {projet.portee_visibilite === 'entites' && (
          <>
            <Typography.Text strong>Entités autorisées à consulter ce projet</Typography.Text>
            <Select
              mode="multiple"
              style={{ width: '100%', marginTop: 8 }}
              disabled={!peutModifier}
              value={entiteIdsSelectionnees}
              onChange={(valeurs) => definirEntites.mutate(valeurs)}
              options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))}
            />
          </>
        )}

        {projet.portee_visibilite === 'agents' && (
          <>
            <Typography.Text strong>Agents autorisés à consulter ce projet</Typography.Text>
            <Select
              mode="multiple"
              showSearch
              style={{ width: '100%', marginTop: 8 }}
              disabled={!peutModifier}
              value={utilisateurIdsSelectionnes}
              onChange={(valeurs) => definirUtilisateurs.mutate(valeurs)}
              filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}
              options={(utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))}
            />
          </>
        )}

        {(projet.portee_visibilite === 'membres' || projet.portee_visibilite === 'tous') && (
          <Typography.Text type="secondary">
            {projet.portee_visibilite === 'membres'
              ? "Aucune sélection nécessaire : seuls les membres de l'équipe (onglet Membres) peuvent consulter ce projet."
              : 'Aucune sélection nécessaire : tous les utilisateurs autorisés de l\'organisation peuvent consulter ce projet.'}
          </Typography.Text>
        )}
      </Card>

      <ContactExecutionFormModal open={contactFormOuvert} projetId={projet.id} onClose={() => setContactFormOuvert(false)} />
    </Space>
  );
}
