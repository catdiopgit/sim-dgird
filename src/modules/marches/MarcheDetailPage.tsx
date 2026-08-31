import { ArrowLeftOutlined, CheckCircleOutlined, EditOutlined, PrinterOutlined } from '@ant-design/icons';
import { Alert, Button, Popconfirm, Result, Skeleton, Space, Tabs, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useMarche, useMarcheMutations, useVerifierClotureMarche } from '../../hooks/marches/useMarches';
import { useMarcheCandidats } from '../../hooks/marches/useMarcheCandidats';
import { usePeutModifierMarche } from '../../hooks/marches/usePeutModifierMarche';
import { useTypesMarche } from '../../hooks/marches/useTypesMarche';
import { useProfile } from '../../hooks/useProfile';
import { MarcheAttributionTab } from './MarcheAttributionTab';
import { MarcheCandidatsTab } from './MarcheCandidatsTab';
import { MarcheDocumentsTab } from './MarcheDocumentsTab';
import { MarcheFormModal } from './MarcheFormModal';
import { MarchePhasesTab } from './MarchePhasesTab';
import { MarcheSituationImprimable } from './MarcheSituationImprimable';
import { MarcheVueEnsembleTab } from './MarcheVueEnsembleTab';

export function MarcheDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const { data: marche, isLoading, isError } = useMarche(id);
  const { data: types } = useTypesMarche();
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: candidats } = useMarcheCandidats(id);
  const { data: controlesCloture } = useVerifierClotureMarche(id);
  const { remove: supprimerMarche, cloturer } = useMarcheMutations();
  const peutModifier = usePeutModifierMarche(marche, profile?.id, can);

  const [editionOuverte, setEditionOuverte] = useState(false);
  const [impressionOuverte, setImpressionOuverte] = useState(false);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const typeParId = useMemo(() => new Map((types ?? []).map((t) => [t.id, t.libelle])), [types]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const candidatParId = useMemo(() => new Map((candidats ?? []).map((c) => [c.id, c.nom])), [candidats]);

  if (isLoading || !organisationId) return <Skeleton active />;

  if (isError || !marche) {
    return (
      <Result
        status="404"
        title="Marché introuvable"
        subTitle="Ce marché n'existe pas ou vous n'y avez pas accès."
        extra={
          <Button type="primary" onClick={() => navigate('/marches')}>
            Retour aux marchés
          </Button>
        }
      />
    );
  }

  const peutSupprimer = can('marches', 'supprimer', marche.entite_id);
  const peutCloturer = can('marches', 'valider', marche.entite_id) && marche.statut_cloture !== 'cloture';
  const blocagesCloture = (controlesCloture ?? []).filter((c) => c.bloquant);

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/marches')}>
          Retour
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {marche.reference} — {marche.objet}
        </Typography.Title>
        {marche.statut_cloture === 'cloture' && <Tag color="green">Clôturé</Tag>}
        <Button icon={<PrinterOutlined />} onClick={() => setImpressionOuverte(true)}>
          Imprimer la situation
        </Button>
        {peutModifier && (
          <Button icon={<EditOutlined />} onClick={() => setEditionOuverte(true)}>
            Modifier
          </Button>
        )}
        {peutCloturer && (
          <Popconfirm
            title="Clôturer ce marché ?"
            description={blocagesCloture.length > 0 ? 'Des blocages existent, voir ci-dessous.' : undefined}
            onConfirm={() => cloturer.mutate(marche.id)}
            disabled={blocagesCloture.length > 0}
          >
            <Button icon={<CheckCircleOutlined />} loading={cloturer.isPending} disabled={blocagesCloture.length > 0}>
              Clôturer le marché
            </Button>
          </Popconfirm>
        )}
        {peutSupprimer && (
          <Popconfirm
            title="Supprimer ce marché ?"
            onConfirm={() => supprimerMarche.mutate(marche.id, { onSuccess: () => navigate('/marches') })}
          >
            <Button danger loading={supprimerMarche.isPending}>
              Supprimer
            </Button>
          </Popconfirm>
        )}
      </Space>

      {peutCloturer && blocagesCloture.length > 0 && (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          showIcon
          message="Clôture impossible pour le moment"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {blocagesCloture.map((c) => (
                <li key={c.code}>{c.message}</li>
              ))}
            </ul>
          }
        />
      )}

      <Tabs
        items={[
          {
            key: 'vue-ensemble',
            label: "Vue d'ensemble",
            children: (
              <MarcheVueEnsembleTab
                marche={marche}
                entiteParId={entiteParId}
                typeParId={typeParId}
                utilisateurParId={utilisateurParId}
                candidatParId={candidatParId}
              />
            ),
          },
          {
            key: 'phases',
            label: 'Phases',
            children: (
              <MarchePhasesTab marcheId={marche.id} peutModifier={peutModifier} cloture={marche.statut_cloture === 'cloture'} />
            ),
          },
          {
            key: 'documents',
            label: 'Documents',
            children: <MarcheDocumentsTab marcheId={marche.id} peutModifier={peutModifier} />,
          },
          {
            key: 'candidats',
            label: 'Entreprises et consultants',
            children: <MarcheCandidatsTab marcheId={marche.id} peutModifier={peutModifier} />,
          },
          {
            key: 'attribution',
            label: 'Attribution',
            children: <MarcheAttributionTab marcheId={marche.id} peutModifier={peutModifier} />,
          },
        ]}
      />

      <MarcheFormModal
        open={editionOuverte}
        organisationId={organisationId}
        marche={marche}
        onClose={() => setEditionOuverte(false)}
      />
      <MarcheSituationImprimable
        open={impressionOuverte}
        marche={marche}
        entiteParId={entiteParId}
        typeParId={typeParId}
        utilisateurParId={utilisateurParId}
        candidatParId={candidatParId}
        onClose={() => setImpressionOuverte(false)}
      />
    </div>
  );
}
