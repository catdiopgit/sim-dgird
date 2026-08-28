import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircleFilled, PlusOutlined, PrinterOutlined } from '@ant-design/icons';
import { Button, DatePicker, Descriptions, Form, Input, Modal, Result, Select, Space, Steps, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useContacts, useCreerContact } from '../../../hooks/courrier/useContacts';
import { useCourrierReferentiel, useCreerCourrier } from '../../../hooks/courrier/useCourriers';
import type { Courrier } from '../../../services/courrier/courriers';
import { uploadPieceJointe } from '../../../services/courrier/piecesJointes';
import { FicheExploitationModal } from '../FicheExploitationModal';
import { PiecesJointesStagingList, type PieceJointeStagee } from './PiecesJointesStagingList';

const schema = z.object({
  objet: z.string().min(1, 'Requis'),
  typeValeurId: z.string().optional(),
  prioriteValeurId: z.string().optional(),
  confidentialiteValeurId: z.string().optional(),
  dateCourrier: z.custom<dayjs.Dayjs | null>().optional(),
  dateReception: z.custom<dayjs.Dayjs | null>().optional(),
  contactExpediteurId: z.string().optional(),
  referenceExpediteur: z.string().optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const DEFAUTS: FormValues = {
  objet: '',
  typeValeurId: '',
  prioriteValeurId: '',
  confidentialiteValeurId: '',
  dateCourrier: dayjs(),
  dateReception: dayjs(),
  contactExpediteurId: '',
  referenceExpediteur: '',
  observations: '',
};

interface Props {
  open: boolean;
  organisationId: string;
  onClose: () => void;
  onTermine: (courrier: Courrier) => void;
}

// Assistant en 4 étapes pour l'enregistrement d'un courrier arrivé (plan V3
// §2, §E ; enrichi V5 §2-§5) : on ne demande volontairement ni entité, ni
// service, ni bureau, ni agent destinataire à la saisie — le routage initial
// est automatique (fn_creer_courrier) et l'affectation réelle se fait ensuite
// via l'imputation (workflow) ; l'étape de workflow appliquée juste après
// l'enregistrement est elle aussi automatique, configurée en Administration.
// L'expéditeur est un contact existant (module contacts V3, réutilisé tel
// quel), pas un texte libre. Le courrier n'est créé en base qu'à la
// validation finale du récapitulatif.
export function CourrierArriveWizard({ open, organisationId, onClose, onTermine }: Props) {
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const { data: contacts } = useContacts(organisationId);
  const creerContact = useCreerContact(organisationId);
  const creer = useCreerCourrier(organisationId);

  const [etape, setEtape] = useState(0);
  const [fichiers, setFichiers] = useState<PieceJointeStagee[]>([]);
  const [nouveauContactOuvert, setNouveauContactOuvert] = useState(false);
  const [nouveauContactNom, setNouveauContactNom] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [courrierCree, setCourrierCree] = useState<Courrier | null>(null);
  const [ficheOuverte, setFicheOuverte] = useState(false);

  const { control, handleSubmit, trigger, watch, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAUTS,
  });
  const valeurs = watch();

  const fermer = () => {
    onClose();
    setEtape(0);
    setFichiers([]);
    setNouveauContactOuvert(false);
    setNouveauContactNom('');
    setCourrierCree(null);
    setFicheOuverte(false);
    reset(DEFAUTS);
  };

  const libelleValeur = (liste: { id: string; libelle: string }[] | undefined, id?: string) =>
    liste?.find((v) => v.id === id)?.libelle ?? '—';
  const libelleContact = (id?: string) => contacts?.find((c) => c.id === id)?.nom ?? '—';

  const creerContactRapide = async () => {
    if (!nouveauContactNom.trim()) return;
    const contact = await creerContact.mutateAsync({ nom: nouveauContactNom.trim(), type: 'administration' });
    setValue('contactExpediteurId', contact.id);
    setNouveauContactNom('');
    setNouveauContactOuvert(false);
  };

  const suivant = async () => {
    if (etape === 0) {
      const valide = await trigger(['objet']);
      if (!valide) return;
    }
    setEtape((e) => e + 1);
  };
  const precedent = () => setEtape((e) => e - 1);

  const valider = handleSubmit(async (values) => {
    setEnCours(true);
    try {
      const courrier = await creer.mutateAsync({
        p_sens: 'entrant',
        p_objet: values.objet,
        p_type_valeur_id: values.typeValeurId || null,
        p_priorite_valeur_id: values.prioriteValeurId || null,
        p_confidentialite_valeur_id: values.confidentialiteValeurId || null,
        p_date_courrier: values.dateCourrier ? values.dateCourrier.format('YYYY-MM-DD') : null,
        p_date_reception: values.dateReception ? values.dateReception.toISOString() : null,
        p_expediteur_contact_id: values.contactExpediteurId || null,
        p_reference_expediteur: values.referenceExpediteur || null,
        p_observations: values.observations || null,
      });

      for (const f of fichiers) {
        await uploadPieceJointe(courrier.id, f.file, f.estScan);
      }

      setCourrierCree(courrier);
      setEtape(3);
    } finally {
      setEnCours(false);
    }
  });

  const footer = () => {
    if (etape === 3) {
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
      etape < 2 && (
        <Button key="suivant" type="primary" onClick={suivant}>
          Suivant
        </Button>
      ),
      etape === 2 && (
        <Button key="valider" type="primary" loading={enCours} onClick={valider}>
          Valider l'enregistrement
        </Button>
      ),
    ].filter(Boolean);
  };

  return (
    <Modal open={open} title="Nouveau courrier arrivé" onCancel={fermer} width={760} footer={footer()} destroyOnHidden>
      <Steps
        size="small"
        current={etape}
        style={{ marginBottom: 24 }}
        items={[
          { title: 'Informations' },
          { title: 'Pièces jointes' },
          { title: 'Récapitulatif' },
          { title: 'Confirmation' },
        ]}
      />

      {etape === 0 && (
        <Form layout="vertical">
          <Form.Item label="Objet" required>
            <Controller name="objet" control={control} render={({ field }) => <Input {...field} autoFocus />} />
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
          <Form.Item label="Priorité">
            <Controller
              name="prioriteValeurId"
              control={control}
              render={({ field }) => (
                <Select {...field} allowClear options={(referentiel?.priorites ?? []).map((v) => ({ value: v.id, label: v.libelle }))} />
              )}
            />
          </Form.Item>
          <Form.Item label="Confidentialité">
            <Controller
              name="confidentialiteValeurId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  allowClear
                  options={(referentiel?.confidentialites ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
                />
              )}
            />
          </Form.Item>
          <Form.Item label="Date du courrier">
            <Controller
              name="dateCourrier"
              control={control}
              render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
            />
          </Form.Item>
          <Form.Item label="Date de réception">
            <Controller
              name="dateReception"
              control={control}
              render={({ field }) => (
                <DatePicker
                  {...field}
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                />
              )}
            />
          </Form.Item>
          <Form.Item label="Expéditeur">
            <Controller
              name="contactExpediteurId"
              control={control}
              render={({ field }) => (
                <Space.Compact block>
                  <Select
                    {...field}
                    placeholder="Rechercher un contact existant"
                    showSearch
                    allowClear
                    style={{ width: '100%' }}
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    options={(contacts ?? []).map((c) => ({ value: c.id, label: c.nom }))}
                  />
                  <Button icon={<PlusOutlined />} onClick={() => setNouveauContactOuvert(true)}>
                    Nouveau contact
                  </Button>
                </Space.Compact>
              )}
            />
          </Form.Item>
          <Form.Item label="Réf. exp">
            <Controller
              name="referenceExpediteur"
              control={control}
              render={({ field }) => <Input {...field} placeholder="Référence indiquée par l'expéditeur" />}
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
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Objet">{valeurs.objet}</Descriptions.Item>
            <Descriptions.Item label="Type">{libelleValeur(referentiel?.types, valeurs.typeValeurId)}</Descriptions.Item>
            <Descriptions.Item label="Priorité">{libelleValeur(referentiel?.priorites, valeurs.prioriteValeurId)}</Descriptions.Item>
            <Descriptions.Item label="Confidentialité">
              {libelleValeur(referentiel?.confidentialites, valeurs.confidentialiteValeurId)}
            </Descriptions.Item>
            <Descriptions.Item label="Date du courrier">
              {valeurs.dateCourrier ? valeurs.dateCourrier.format('DD/MM/YYYY') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Date de réception">
              {valeurs.dateReception ? valeurs.dateReception.format('DD/MM/YYYY HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Expéditeur">{libelleContact(valeurs.contactExpediteurId)}</Descriptions.Item>
            <Descriptions.Item label="Réf. exp">{valeurs.referenceExpediteur || '—'}</Descriptions.Item>
            <Descriptions.Item label="Observations">{valeurs.observations || '—'}</Descriptions.Item>
            <Descriptions.Item label="Pièces jointes">
              {fichiers.length === 0
                ? '—'
                : fichiers.map((f) => (
                    <Tag key={f.id} color={f.estScan ? 'blue' : 'default'}>
                      {f.file.name}
                      {f.estScan ? ' (scan)' : ''}
                    </Tag>
                  ))}
            </Descriptions.Item>
          </Descriptions>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
            Vous pouvez revenir en arrière pour corriger une information avant de valider
            définitivement l'enregistrement.
          </Typography.Paragraph>
        </div>
      )}

      {etape === 3 && courrierCree && (
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
        open={nouveauContactOuvert}
        title="Nouveau contact"
        onCancel={() => { setNouveauContactOuvert(false); setNouveauContactNom(''); }}
        onOk={creerContactRapide}
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
