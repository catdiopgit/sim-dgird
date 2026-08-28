import { ArrowLeftOutlined, LockOutlined, PrinterOutlined, UnlockOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Modal, Popconfirm, Result, Skeleton, Space } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useCourrier, useSupprimerCourrier } from '../../hooks/courrier/useCourriers';
import { useDeverrouillerCourrier } from '../../hooks/courrier/useDecharge';
import { useProfile } from '../../hooks/useProfile';
import { CourrierDechargeModal } from './CourrierDechargeModal';
import { CourrierImputationPanel } from './CourrierImputationPanel';
import { CourrierInfoCard } from './CourrierInfoCard';
import { CourrierPiecesJointes } from './CourrierPiecesJointes';
import { CourrierWorkflowPanel } from './CourrierWorkflowPanel';
import { FicheExploitationModal } from './FicheExploitationModal';

export function CourrierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const { data: courrier, isLoading, isError } = useCourrier(id);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const supprimer = useSupprimerCourrier();
  const deverrouiller = useDeverrouillerCourrier(id);
  const [ficheOuverte, setFicheOuverte] = useState(false);
  const [dechargeOuverte, setDechargeOuverte] = useState(false);
  const [motifDeverrouillage, setMotifDeverrouillage] = useState<string | null>(null);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  if (isLoading || !organisationId) return <Skeleton active />;

  if (isError || !courrier) {
    return (
      <Result
        status="404"
        title="Courrier introuvable"
        subTitle="Ce courrier n'existe pas ou vous n'y avez pas accès."
        extra={
          <Button type="primary" onClick={() => navigate('/courriers')}>
            Retour à la liste
          </Button>
        }
      />
    );
  }

  const estVerrouille = courrier.verrouille_le !== null;
  const peutModifier =
    !estVerrouille && (courrier.created_by === profile?.id || can('courrier', 'modifier', courrier.entite_id));
  const peutSupprimer = !estVerrouille && can('courrier', 'supprimer', courrier.entite_id);
  const peutDeverrouiller = can('courrier', 'deverrouiller', courrier.entite_id);
  const peutAjouterDecharge = !estVerrouille && courrier.sens === 'sortant' && peutModifier;

  return (
    <div>
      {estVerrouille && (
        <Alert
          type="warning"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 16 }}
          message="Courrier verrouillé"
          description={
            <>
              Ce courrier est définitivement verrouillé suite à l'ajout d'une décharge
              {courrier.verrouille_par ? ` par ${utilisateurParId.get(courrier.verrouille_par) ?? '—'}` : ''}
              {courrier.verrouille_le ? ` le ${new Date(courrier.verrouille_le).toLocaleString('fr-FR')}` : ''}.
              Aucune modification n'est possible.
            </>
          }
          action={
            peutDeverrouiller && (
              <Button size="small" icon={<UnlockOutlined />} onClick={() => setMotifDeverrouillage('')}>
                Déverrouiller (exceptionnel)
              </Button>
            )
          }
        />
      )}

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/courriers')}>
          Retour
        </Button>
        <Button icon={<PrinterOutlined />} onClick={() => setFicheOuverte(true)}>
          Fiche d'exploitation
        </Button>
        {peutAjouterDecharge && (
          <Button icon={<LockOutlined />} onClick={() => setDechargeOuverte(true)}>
            Ajouter une décharge
          </Button>
        )}
        {peutSupprimer && (
          <Popconfirm
            title="Supprimer ce courrier ?"
            onConfirm={() =>
              supprimer.mutate(courrier.id, { onSuccess: () => navigate('/courriers') })
            }
          >
            <Button danger>Supprimer</Button>
          </Popconfirm>
        )}
      </Space>

      <CourrierInfoCard
        courrier={courrier}
        organisationId={organisationId}
        entiteLibelle={courrier.entite_id ? (entiteParId.get(courrier.entite_id) ?? '—') : 'Non imputé'}
        peutModifier={peutModifier}
      />
      <CourrierWorkflowPanel courrier={courrier} organisationId={organisationId} />
      {/* Version 5 §3/§13 : sur un courrier arrivé, l'imputation se fait
          désormais via les actions modales du workflow (CourrierWorkflowPanel)
          — le panneau statique ci-dessous reste utile pour départ/interne. */}
      {courrier.sens !== 'entrant' && (
        <CourrierImputationPanel courrier={courrier} organisationId={organisationId} peutModifier={peutModifier} />
      )}
      <CourrierPiecesJointes courrierId={courrier.id} peutModifier={peutModifier} />

      <FicheExploitationModal
        courrierId={courrier.id}
        organisationId={organisationId}
        open={ficheOuverte}
        onClose={() => setFicheOuverte(false)}
      />

      <CourrierDechargeModal courrierId={courrier.id} open={dechargeOuverte} onClose={() => setDechargeOuverte(false)} />

      <Modal
        open={motifDeverrouillage !== null}
        title="Déverrouiller le courrier (procédure exceptionnelle)"
        onCancel={() => setMotifDeverrouillage(null)}
        onOk={() => motifDeverrouillage && deverrouiller.mutate(motifDeverrouillage, { onSuccess: () => setMotifDeverrouillage(null) })}
        okButtonProps={{ disabled: !motifDeverrouillage?.trim(), loading: deverrouiller.isPending, danger: true }}
        okText="Déverrouiller"
        destroyOnHidden
      >
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="Cette action est journalisée et tracée nominativement."
        />
        <Input.TextArea
          rows={3}
          placeholder="Motif du déverrouillage (obligatoire)"
          value={motifDeverrouillage ?? ''}
          onChange={(e) => setMotifDeverrouillage(e.target.value)}
        />
      </Modal>
    </div>
  );
}
