import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Result, Skeleton, Space, Tabs, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { usePeutModifierProjet } from '../../hooks/projets/usePeutModifierProjet';
import { useProjet, useProjetMutations, useProjetsReferentiel } from '../../hooks/projets/useProjets';
import { useProfile } from '../../hooks/useProfile';
import { ProjetAvenantsTab } from './ProjetAvenantsTab';
import { ProjetClotureTab } from './ProjetClotureTab';
import { ProjetDecaissementsTab } from './ProjetDecaissementsTab';
import { ProjetDocumentsTab } from './ProjetDocumentsTab';
import { ProjetFormModal } from './ProjetFormModal';
import { ProjetHistoriqueTab } from './ProjetHistoriqueTab';
import { ProjetInformationsTab } from './ProjetInformationsTab';
import { ProjetLivrablesTab } from './ProjetLivrablesTab';
import { ProjetMembresTab } from './ProjetMembresTab';
import { ProjetVueEnsembleTab } from './ProjetVueEnsembleTab';

export function ProjetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const { data: projet, isLoading, isError } = useProjet(id);
  const { data: referentiel } = useProjetsReferentiel(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { remove: supprimerProjet } = useProjetMutations(organisationId);
  const peutModifier = usePeutModifierProjet(projet, profile?.id, can);

  const [editionProjetOuverte, setEditionProjetOuverte] = useState(false);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const statutParId = useMemo(() => new Map((referentiel?.statuts ?? []).map((v) => [v.id, v])), [referentiel]);
  const prioriteParId = useMemo(() => new Map((referentiel?.priorites ?? []).map((v) => [v.id, v])), [referentiel]);

  if (isLoading || !organisationId) return <Skeleton active />;

  if (isError || !projet) {
    return (
      <Result
        status="404"
        title="Projet introuvable"
        subTitle="Ce projet n'existe pas ou vous n'y avez pas accès."
        extra={
          <Button type="primary" onClick={() => navigate('/projets')}>
            Retour aux projets
          </Button>
        }
      />
    );
  }

  const peutSupprimer = can('projets', 'supprimer', projet.entite_id);
  const peutDemanderCloture = projet.responsable_id === profile?.id;

  const statut = projet.statut_valeur_id ? statutParId.get(projet.statut_valeur_id) : null;
  const priorite = projet.priorite_valeur_id ? prioriteParId.get(projet.priorite_valeur_id) : null;

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projets')}>
          Retour
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {projet.code} — {projet.nom}
        </Typography.Title>
        {statut && <Tag color={statut.couleur ?? undefined}>{statut.libelle}</Tag>}
        {priorite && <Tag color={priorite.couleur ?? undefined}>{priorite.libelle}</Tag>}
        {projet.cloture_statut === 'confirmee' && <Tag color="green">Clôturé</Tag>}
        {projet.cloture_statut === 'demandee' && <Tag color="gold">Clôture en attente</Tag>}
        {peutModifier && (
          <Button icon={<EditOutlined />} onClick={() => setEditionProjetOuverte(true)}>
            Modifier
          </Button>
        )}
        {peutSupprimer && (
          <Popconfirm
            title="Supprimer ce projet ?"
            onConfirm={() => supprimerProjet.mutate(projet.id, { onSuccess: () => navigate('/projets') })}
          >
            <Button danger loading={supprimerProjet.isPending}>
              Supprimer
            </Button>
          </Popconfirm>
        )}
      </Space>

      <Tabs
        items={[
          {
            key: 'vue-ensemble',
            label: "Vue d'ensemble",
            children: (
              <ProjetVueEnsembleTab
                projet={projet}
                referentiel={referentiel}
                entiteParId={entiteParId}
                utilisateurParId={utilisateurParId}
              />
            ),
          },
          {
            key: 'informations',
            label: 'Informations',
            children: (
              <ProjetInformationsTab
                projet={projet}
                organisationId={organisationId}
                peutModifier={peutModifier}
                entiteParId={entiteParId}
                utilisateurParId={utilisateurParId}
                entites={entites}
                utilisateurs={utilisateurs}
              />
            ),
          },
          {
            key: 'livrables',
            label: 'Livrables',
            children: (
              <ProjetLivrablesTab
                projetId={projet.id}
                organisationId={organisationId}
                peutModifier={peutModifier}
                referentiel={referentiel}
                utilisateurParId={utilisateurParId}
                cloture={projet.cloture_statut === 'confirmee'}
              />
            ),
          },
          {
            key: 'decaissements',
            label: 'Décaissements',
            children: (
              <ProjetDecaissementsTab
                projetId={projet.id}
                peutModifier={peutModifier}
                cloture={projet.cloture_statut === 'confirmee'}
                budgetPrevu={projet.budget_prevu}
                utilisateurParId={utilisateurParId}
              />
            ),
          },
          {
            key: 'membres',
            label: 'Membres',
            children: (
              <ProjetMembresTab
                projetId={projet.id}
                organisationId={organisationId}
                peutModifier={peutModifier}
                referentiel={referentiel}
                utilisateurParId={utilisateurParId}
              />
            ),
          },
          {
            key: 'documents',
            label: 'Documents',
            children: (
              <ProjetDocumentsTab
                projetId={projet.id}
                peutModifier={peutModifier}
                referentiel={referentiel}
                utilisateurParId={utilisateurParId}
              />
            ),
          },
          {
            key: 'avenants',
            label: 'Avenants',
            children: <ProjetAvenantsTab projetId={projet.id} peutModifier={peutModifier} />,
          },
          {
            key: 'historique',
            label: 'Historique',
            children: <ProjetHistoriqueTab projetId={projet.id} utilisateurParId={utilisateurParId} />,
          },
          {
            key: 'cloture',
            label: 'Clôture',
            children: (
              <ProjetClotureTab projet={projet} peutDemander={peutDemanderCloture} utilisateurParId={utilisateurParId} />
            ),
          },
        ]}
      />

      <ProjetFormModal
        open={editionProjetOuverte}
        organisationId={organisationId}
        projet={projet}
        onClose={() => setEditionProjetOuverte(false)}
      />
    </div>
  );
}
