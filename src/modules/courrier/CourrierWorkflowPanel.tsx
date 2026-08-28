import { Button, Card, Popconfirm, Skeleton, Space, Timeline, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useCourrierReferentiel } from '../../hooks/courrier/useCourriers';
import {
  useExecuterTransitionCourrier,
  useHistoriqueActions,
  useTransitionsDisponiblesCourrier,
  useWorkflowEtapes,
  useWorkflowHistorique,
  useWorkflowInstance,
} from '../../hooks/courrier/useWorkflow';
import type { Courrier } from '../../services/courrier/courriers';
import type { TransitionDisponible, TypeActionCourrier } from '../../services/courrier/workflow';
import { CourrierActionWorkflowModal } from './CourrierActionWorkflowModal';

interface Props {
  courrier: Courrier;
  organisationId: string;
}

const LIBELLE_TYPE_ACTION: Record<TypeActionCourrier, string> = {
  imputation: 'Imputation',
  affectation: 'Affectation',
  transmission: 'Transmission',
  redirection: 'Redirection',
};

export function CourrierWorkflowPanel({ courrier, organisationId }: Props) {
  const { data: instance, isLoading: chargementInstance } = useWorkflowInstance(
    courrier.workflow_instance_id ?? undefined,
  );
  const { data: etapes } = useWorkflowEtapes(instance?.workflow_definition_id);
  const { data: historique, isLoading: chargementHistorique } = useWorkflowHistorique(
    courrier.workflow_instance_id ?? undefined,
  );
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  // Résolution acteur (rôle/fonction/entité/responsable/délégation) + condition
  // faite côté serveur (public.fn_transitions_disponibles_courrier, migration
  // 0020) — le client ne fait que lister ce qui revient, sans dupliquer la logique.
  const { data: transitionsDisponibles, isLoading: chargementTransitions } =
    useTransitionsDisponiblesCourrier(courrier.id);
  const executer = useExecuterTransitionCourrier(courrier.id);

  const historiqueIds = useMemo(() => (historique ?? []).map((h) => h.id), [historique]);
  const { data: actionsHistorique } = useHistoriqueActions(historiqueIds);

  const [actionOuverte, setActionOuverte] = useState<TransitionDisponible | null>(null);

  const etapeParId = useMemo(() => new Map((etapes ?? []).map((e) => [e.id, e])), [etapes]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const actionDemandeeParId = useMemo(
    () => new Map((referentiel?.actionsDemandees ?? []).map((v) => [v.id, v.libelle])),
    [referentiel],
  );

  // Regroupe les destinataires corrélés (principal + copies) par ligne
  // d'historique, pour enrichir la timeline (V5 §14/§15) sans dupliquer la
  // donnée dans workflow_historique lui-même.
  const actionsParHistorique = useMemo(() => {
    const map = new Map<string, typeof actionsHistorique>();
    for (const a of actionsHistorique ?? []) {
      if (!a.workflow_historique_id) continue;
      const liste = map.get(a.workflow_historique_id) ?? [];
      liste.push(a);
      map.set(a.workflow_historique_id, liste);
    }
    return map;
  }, [actionsHistorique]);

  if (chargementInstance || chargementHistorique) return <Skeleton active />;

  const cibleLabel = (d: { entite_id: string | null; utilisateur_id: string | null }) =>
    d.entite_id ? (entiteParId.get(d.entite_id) ?? '—') : d.utilisateur_id ? (utilisateurParId.get(d.utilisateur_id) ?? '—') : '—';

  return (
    <Card title="Workflow" style={{ marginTop: 16 }}>
      <Space style={{ marginBottom: 16 }} wrap>
        {!chargementTransitions &&
          (transitionsDisponibles ?? []).length === 0 &&
          instance?.statut_instance === 'en_cours' && (
            <Typography.Text type="secondary">Aucune action disponible pour vous à cette étape.</Typography.Text>
          )}
        {instance?.statut_instance !== 'en_cours' && (
          <Typography.Text type="secondary">Workflow terminé.</Typography.Text>
        )}
        {(transitionsDisponibles ?? []).map((t) =>
          // V5 §3-§9 : sur un courrier arrivé, une transition tagguée d'un
          // type_action (donnée de configuration, cf. Administration >
          // Workflows) ouvre la fenêtre modale d'action au lieu d'une simple
          // confirmation — pour tout autre cas (départ/interne, ou transition
          // non tagguée), comportement inchangé.
          courrier.sens === 'entrant' && t.type_action ? (
            <Button key={t.transition_id} onClick={() => setActionOuverte(t)}>
              {t.libelle_action}
            </Button>
          ) : (
            <Popconfirm
              key={t.transition_id}
              title={`Confirmer l'action « ${t.libelle_action} » ?`}
              onConfirm={() => executer.mutate({ transitionId: t.transition_id })}
            >
              <Button loading={executer.isPending}>{t.libelle_action}</Button>
            </Popconfirm>
          ),
        )}
      </Space>

      <Timeline
        items={(historique ?? []).map((h) => {
          const actions = actionsParHistorique.get(h.id);
          const principal = actions?.find((a) => a.type_diffusion === 'principal');
          const copies = actions?.filter((a) => a.type_diffusion === 'copie') ?? [];

          return {
            content: principal ? (
              <div>
                <div>
                  <strong>{principal.type_action ? LIBELLE_TYPE_ACTION[principal.type_action] : etapeParId.get(h.etape_suivante_id)?.libelle}</strong>
                </div>
                <div style={{ fontSize: 13 }}>
                  Entité/personne principale : {cibleLabel(principal)}
                </div>
                {copies.length > 0 && (
                  <div style={{ fontSize: 13 }}>En copie : {copies.map(cibleLabel).join(', ')}</div>
                )}
                {principal.actions_demandees_ids.length > 0 && (
                  <div style={{ fontSize: 13 }}>
                    Actions demandées :{' '}
                    {principal.actions_demandees_ids.map((id) => actionDemandeeParId.get(id) ?? id).join(', ')}
                  </div>
                )}
                {principal.echeance && (
                  <div style={{ fontSize: 13 }}>
                    Échéance : {new Date(principal.echeance).toLocaleDateString('fr-FR')}
                  </div>
                )}
                {principal.instruction && <div style={{ fontSize: 13 }}>Observation : {principal.instruction}</div>}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {h.utilisateur_id ? `Effectué par ${utilisateurParId.get(h.utilisateur_id) ?? ''} — ` : ''}
                  {new Date(h.date_action).toLocaleString('fr-FR')}
                </Typography.Text>
              </div>
            ) : (
              // transition_id null = événement système, pas une transition configurée :
              // soit le démarrage du workflow (etape_precedente_id null — libellé dédié
              // pour un courrier départ), soit une clôture (ex. décharge, cf.
              // fn_ajouter_decharge_courrier) où le commentaire porte le libellé de
              // l'événement puisque l'étape n'a pas changé.
              <div>
                <div>
                  {!h.transition_id && !h.etape_precedente_id && courrier.sens === 'sortant'
                    ? 'Enregistrement courrier départ'
                    : !h.transition_id && h.commentaire
                      ? h.commentaire
                      : (etapeParId.get(h.etape_suivante_id)?.libelle ?? h.etape_suivante_id)}
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {new Date(h.date_action).toLocaleString('fr-FR')}
                  {h.utilisateur_id ? ` — ${utilisateurParId.get(h.utilisateur_id) ?? ''}` : ''}
                  {h.transition_id && h.commentaire ? ` — ${h.commentaire}` : ''}
                </Typography.Text>
              </div>
            ),
          };
        })}
      />

      {actionOuverte && (
        <CourrierActionWorkflowModal
          open={actionOuverte !== null}
          onClose={() => setActionOuverte(null)}
          courrier={courrier}
          organisationId={organisationId}
          typeAction={actionOuverte.type_action as TypeActionCourrier}
          transitionId={actionOuverte.transition_id}
        />
      )}
    </Card>
  );
}
