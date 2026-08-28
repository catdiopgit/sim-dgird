import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircleFilled, PlusOutlined, PrinterOutlined } from '@ant-design/icons';
import {
  Button,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Radio,
  Result,
  Select,
  Space,
  Steps,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEntites, useUtilisateursOptions } from '../../../hooks/administration/useEntites';
import { useContacts, useCreerContact } from '../../../hooks/courrier/useContacts';
import { useCourrierReferentiel, useCreerCourrier } from '../../../hooks/courrier/useCourriers';
import type { Courrier } from '../../../services/courrier/courriers';
import { ajouterDestinataire } from '../../../services/courrier/destinataires';
import { uploadPieceJointe } from '../../../services/courrier/piecesJointes';
import { FicheExploitationModal } from '../FicheExploitationModal';
import { PiecesJointesStagingList, type PieceJointeStagee } from './PiecesJointesStagingList';

const schema = z.object({
  objet: z.string().min(1, 'Requis'),
  entiteId: z.string().min(1, 'Requis'),
  reference: z.string().optional(),
  typeValeurId: z.string().optional(),
  dateCourrier: z.custom<dayjs.Dayjs | null>().optional(),
  dateEnvoi: z.custom<dayjs.Dayjs | null>().optional(),
  modeTransmissionValeurId: z.string().optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const DEFAUTS: FormValues = {
  objet: '',
  entiteId: '',
  reference: '',
  typeValeurId: '',
  dateCourrier: dayjs(),
  dateEnvoi: null,
  modeTransmissionValeurId: '',
  observations: '',
};

type AmpliataireType = 'entite' | 'utilisateur' | 'contact';
interface Ampliataire {
  id: string;
  type: AmpliataireType;
  cibleId: string;
  cibleLabel: string;
  interne: boolean;
}

interface Props {
  open: boolean;
  organisationId: string;
  onClose: () => void;
  onTermine: (courrier: Courrier) => void;
}

// Assistant en 5 étapes pour l'enregistrement d'un courrier départ (plan V3
// §9-11, §E) : informations → pièces jointes → destinataires (principal +
// ampliataires internes/externes, contacts recherchables/créables à la
// volée) → récapitulatif → confirmation avec numéro généré.
export function CourrierDepartWizard({ open, organisationId, onClose, onTermine }: Props) {
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: contacts } = useContacts(organisationId);
  const creerContact = useCreerContact(organisationId);
  const creer = useCreerCourrier(organisationId);

  const [etape, setEtape] = useState(0);
  const [fichiers, setFichiers] = useState<PieceJointeStagee[]>([]);
  const [contactPrincipalId, setContactPrincipalId] = useState<string | undefined>();
  const [ampliataires, setAmpliataires] = useState<Ampliataire[]>([]);
  const [nouveauContactOuvert, setNouveauContactOuvert] = useState<'principal' | 'ampliataire' | null>(null);
  const [nouveauContactNom, setNouveauContactNom] = useState('');
  const [ampliCibleType, setAmpliCibleType] = useState<AmpliataireType>('entite');
  const [ampliCibleId, setAmpliCibleId] = useState<string | undefined>();
  const [enCours, setEnCours] = useState(false);
  const [courrierCree, setCourrierCree] = useState<Courrier | null>(null);
  const [ficheOuverte, setFicheOuverte] = useState(false);

  const { control, handleSubmit, trigger, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAUTS,
  });
  const valeurs = watch();

  const fermer = () => {
    onClose();
    setEtape(0);
    setFichiers([]);
    setContactPrincipalId(undefined);
    setAmpliataires([]);
    setCourrierCree(null);
    setFicheOuverte(false);
    reset(DEFAUTS);
  };

  const libelleValeur = (liste: { id: string; libelle: string }[] | undefined, id?: string) =>
    liste?.find((v) => v.id === id)?.libelle ?? '—';
  const libelleEntite = (id?: string) => entites?.find((e) => e.id === id)?.libelle ?? '—';
  const libelleContact = (id?: string) => contacts?.find((c) => c.id === id)?.nom ?? '—';

  const suivant = async () => {
    if (etape === 0) {
      const valide = await trigger(['objet', 'entiteId']);
      if (!valide) return;
    }
    setEtape((e) => e + 1);
  };
  const precedent = () => setEtape((e) => e - 1);

  const creerContactRapide = async (usage: 'principal' | 'ampliataire') => {
    if (!nouveauContactNom.trim()) return;
    const contact = await creerContact.mutateAsync({ nom: nouveauContactNom.trim(), type: 'administration' });
    if (usage === 'principal') {
      setContactPrincipalId(contact.id);
    } else {
      setAmpliataires((a) => [
        ...a,
        { id: crypto.randomUUID(), type: 'contact', cibleId: contact.id, cibleLabel: contact.nom, interne: false },
      ]);
    }
    setNouveauContactNom('');
    setNouveauContactOuvert(null);
  };

  const ajouterAmpliataire = () => {
    if (!ampliCibleId) return;
    const label =
      ampliCibleType === 'entite'
        ? libelleEntite(ampliCibleId)
        : ampliCibleType === 'utilisateur'
          ? (() => {
              const u = utilisateurs?.find((u) => u.id === ampliCibleId);
              return u ? `${u.prenom} ${u.nom}` : '—';
            })()
          : libelleContact(ampliCibleId);
    setAmpliataires((a) => [
      ...a,
      { id: crypto.randomUUID(), type: ampliCibleType, cibleId: ampliCibleId, cibleLabel: label, interne: ampliCibleType !== 'contact' },
    ]);
    setAmpliCibleId(undefined);
  };

  const valider = handleSubmit(async (values) => {
    setEnCours(true);
    try {
      const courrier = await creer.mutateAsync({
        p_sens: 'sortant',
        p_objet: values.objet,
        p_entite_id: values.entiteId,
        p_type_valeur_id: values.typeValeurId || null,
        p_date_courrier: values.dateCourrier ? values.dateCourrier.format('YYYY-MM-DD') : null,
        p_date_envoi: values.dateEnvoi ? values.dateEnvoi.toISOString() : null,
        p_mode_transmission_valeur_id: values.modeTransmissionValeurId || null,
        p_destinataire_texte: contactPrincipalId ? libelleContact(contactPrincipalId) : null,
        p_contact_destinataire_id: contactPrincipalId || null,
        p_observations: values.observations || null,
      });

      for (const f of fichiers) {
        await uploadPieceJointe(courrier.id, f.file, f.estScan);
      }

      for (const a of ampliataires) {
        await ajouterDestinataire({
          courrier_id: courrier.id,
          entite_id: a.type === 'entite' ? a.cibleId : null,
          utilisateur_id: a.type === 'utilisateur' ? a.cibleId : null,
          contact_id: a.type === 'contact' ? a.cibleId : null,
          type_diffusion: 'copie',
        });
      }

      setCourrierCree(courrier);
      setEtape(4);
    } finally {
      setEnCours(false);
    }
  });

  const footer = () => {
    if (etape === 4) {
      return [
        <Button key="fermer" onClick={fermer}>
          Fermer
        </Button>,
        <Button key="voir" type="primary" onClick={() => courrierCree && onTermine(courrierCree)}>
          Voir le courrier
        </Button>,
      ];
    }
    return [
      <Button key="annuler" onClick={fermer}>
        Annuler
      </Button>,
      etape > 0 && (
        <Button key="precedent" onClick={precedent}>
          Précédent
        </Button>
      ),
      etape < 3 && (
        <Button key="suivant" type="primary" onClick={suivant}>
          Suivant
        </Button>
      ),
      etape === 3 && (
        <Button key="valider" type="primary" loading={enCours} onClick={valider}>
          Valider l'enregistrement
        </Button>
      ),
    ].filter(Boolean);
  };

  return (
    <Modal open={open} title="Nouveau courrier départ" onCancel={fermer} width={820} footer={footer()} destroyOnHidden>
      <Steps
        size="small"
        current={etape}
        style={{ marginBottom: 24 }}
        items={[{ title: 'Informations' }, { title: 'Pièces jointes' }, { title: 'Destinataires' }, { title: 'Récapitulatif' }, { title: 'Confirmation' }]}
      />

      {etape === 0 && (
        <Form layout="vertical">
          <Form.Item label="Objet" required>
            <Controller name="objet" control={control} render={({ field }) => <Input {...field} autoFocus />} />
          </Form.Item>
          <Form.Item label="Entité en charge" required>
            <Controller
              name="entiteId"
              control={control}
              render={({ field }) => (
                <Select {...field} placeholder="Sélectionner une entité" options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))} />
              )}
            />
          </Form.Item>
          <Form.Item label="Référence">
            <Controller name="reference" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
          <Form.Item label="Type de courrier">
            <Controller
              name="typeValeurId"
              control={control}
              render={({ field }) => (
                <Select {...field} allowClear options={(referentiel?.types ?? []).map((v) => ({ value: v.id, label: v.libelle }))} />
              )}
            />
          </Form.Item>
          <Form.Item label="Date du courrier">
            <Controller name="dateCourrier" control={control} render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />} />
          </Form.Item>
          <Form.Item label="Date d'envoi">
            <Controller name="dateEnvoi" control={control} render={({ field }) => <DatePicker {...field} showTime style={{ width: '100%' }} />} />
          </Form.Item>
          <Form.Item label="Mode de transmission">
            <Controller
              name="modeTransmissionValeurId"
              control={control}
              render={({ field }) => (
                <Select {...field} allowClear options={(referentiel?.modesTransmission ?? []).map((v) => ({ value: v.id, label: v.libelle }))} />
              )}
            />
          </Form.Item>
          <Form.Item label="Observations">
            <Controller name="observations" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} />} />
          </Form.Item>
        </Form>
      )}

      {etape === 1 && <PiecesJointesStagingList fichiers={fichiers} onChange={setFichiers} />}

      {etape === 2 && (
        <div>
          <Typography.Title level={5}>Destinataire principal</Typography.Title>
          <Space wrap style={{ marginBottom: 20 }}>
            <Select
              placeholder="Rechercher un contact existant"
              showSearch
              allowClear
              style={{ width: 320 }}
              value={contactPrincipalId}
              onChange={setContactPrincipalId}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={(contacts ?? []).map((c) => ({ value: c.id, label: c.nom }))}
            />
            <Button icon={<PlusOutlined />} onClick={() => setNouveauContactOuvert('principal')}>
              Nouveau contact
            </Button>
          </Space>

          <Typography.Title level={5}>Ampliataires</Typography.Title>
          <Space wrap style={{ marginBottom: 12 }} align="start">
            <Radio.Group value={ampliCibleType} onChange={(e) => { setAmpliCibleType(e.target.value); setAmpliCibleId(undefined); }}>
              <Radio.Button value="entite">Entité (interne)</Radio.Button>
              <Radio.Button value="utilisateur">Utilisateur (interne)</Radio.Button>
              <Radio.Button value="contact">Contact (externe)</Radio.Button>
            </Radio.Group>
          </Space>
          <Space wrap style={{ marginBottom: 20 }}>
            <Select
              placeholder="Choisir"
              showSearch
              style={{ width: 280 }}
              value={ampliCibleId}
              onChange={setAmpliCibleId}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={
                ampliCibleType === 'entite'
                  ? (entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))
                  : ampliCibleType === 'utilisateur'
                    ? (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))
                    : (contacts ?? []).map((c) => ({ value: c.id, label: c.nom }))
              }
            />
            <Button icon={<PlusOutlined />} onClick={ajouterAmpliataire} disabled={!ampliCibleId}>
              Ajouter
            </Button>
            {ampliCibleType === 'contact' && (
              <Button onClick={() => setNouveauContactOuvert('ampliataire')}>Nouveau contact</Button>
            )}
          </Space>

          <Space wrap>
            {ampliataires.map((a) => (
              <Tag
                key={a.id}
                color={a.interne ? 'blue' : 'purple'}
                closable
                onClose={() => setAmpliataires((list) => list.filter((x) => x.id !== a.id))}
              >
                {a.cibleLabel} {a.interne ? '(interne)' : '(externe)'}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {etape === 3 && (
        <div>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Objet">{valeurs.objet}</Descriptions.Item>
            <Descriptions.Item label="Entité en charge">{libelleEntite(valeurs.entiteId)}</Descriptions.Item>
            <Descriptions.Item label="Type">{libelleValeur(referentiel?.types, valeurs.typeValeurId)}</Descriptions.Item>
            <Descriptions.Item label="Date du courrier">
              {valeurs.dateCourrier ? valeurs.dateCourrier.format('DD/MM/YYYY') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Date d'envoi">
              {valeurs.dateEnvoi ? valeurs.dateEnvoi.format('DD/MM/YYYY HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Mode de transmission">
              {libelleValeur(referentiel?.modesTransmission, valeurs.modeTransmissionValeurId)}
            </Descriptions.Item>
            <Descriptions.Item label="Destinataire principal">
              {contactPrincipalId ? libelleContact(contactPrincipalId) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Ampliataires">
              {ampliataires.length === 0 ? '—' : ampliataires.map((a) => <Tag key={a.id}>{a.cibleLabel}</Tag>)}
            </Descriptions.Item>
            <Descriptions.Item label="Observations">{valeurs.observations || '—'}</Descriptions.Item>
            <Descriptions.Item label="Pièces jointes">
              {fichiers.length === 0 ? '—' : fichiers.map((f) => <Tag key={f.id}>{f.file.name}</Tag>)}
            </Descriptions.Item>
          </Descriptions>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
            Vous pouvez revenir en arrière pour corriger une information avant de valider
            définitivement l'enregistrement.
          </Typography.Paragraph>
        </div>
      )}

      {etape === 4 && courrierCree && (
        <Result
          icon={<CheckCircleFilled style={{ color: '#2e9e4f' }} />}
          title="Courrier enregistré"
          subTitle={
            <Space direction="vertical" align="center">
              <span>
                Numéro attribué : <Typography.Text strong>{courrierCree.numero}</Typography.Text>
              </span>
            </Space>
          }
          extra={
            <Button icon={<PrinterOutlined />} onClick={() => setFicheOuverte(true)}>
              Imprimer la fiche d'exploitation
            </Button>
          }
        />
      )}

      {courrierCree && (
        <FicheExploitationModal
          courrierId={courrierCree.id}
          organisationId={organisationId}
          open={ficheOuverte}
          onClose={() => setFicheOuverte(false)}
        />
      )}

      <Modal
        open={nouveauContactOuvert !== null}
        title="Nouveau contact"
        onCancel={() => { setNouveauContactOuvert(null); setNouveauContactNom(''); }}
        onOk={() => nouveauContactOuvert && creerContactRapide(nouveauContactOuvert)}
        confirmLoading={creerContact.isPending}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Nom du contact / de l'organisme">
            <Input value={nouveauContactNom} onChange={(e) => setNouveauContactNom(e.target.value)} autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
}
