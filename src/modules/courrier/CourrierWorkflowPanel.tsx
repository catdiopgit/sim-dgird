import { CircleCheck, GitBranch } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Confirmation } from '../../components/form/confirm-dialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
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
import { cn } from '../../lib/utils';
import type { Courrier } from '../../services/courrier/courriers';
import type { TransitionDisponible, TypeActionCourrier } from '../../services/courrier/workflow';
import { fr } from '../../utils/dateFr';
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
  const { data: instance, isLoading: chargementInstance } = useWorkflowInstance(courrier.id);
  const { data: etapes } = useWorkflowEtapes(instance?.workflow_definition_id);
  const { data: historique, isLoading: chargementHistorique } = useWorkflowHistorique(courrier.id);
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
  const { data: actionsHistorique } = useHistoriqueActions(courrier.id, historiqueIds);

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

  const enCours = instance?.statut_instance === 'en_cours';
  // L'agent (utilisateur_id) et l'entité (entite_id) sont tous les deux renseignés
  // quand l'imputation cible un agent précis (imputerCourrier renseigne toujours
  // entite_id, y compris dans ce cas) : prioriser le nom de la personne, sinon
  // retomber sur l'entité seule (cas où seule une entité a été choisie).
  const cibleLabel = (d: { entite_id: string | null; utilisateur_id: string | null }) => {
    const entite = d.entite_id ? (entiteParId.get(d.entite_id) ?? '—') : null;
    const personne = d.utilisateur_id ? (utilisateurParId.get(d.utilisateur_id) ?? '—') : null;
    if (personne) return entite ? `${personne} (${entite})` : personne;
    return entite ?? '—';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Circuit de traitement</CardTitle>
        <GitBranch className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-5">
        {chargementInstance || chargementHistorique ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            {/* Étape courante + actions disponibles */}
            <div className={cn('rounded-lg p-4', enCours ? 'bg-accent' : 'bg-good/10')}>
              <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                {enCours ? 'Étape actuelle' : 'Statut'}
              </div>
              <div className={cn('mt-1 flex items-center gap-2 font-semibold', enCours ? 'text-accent-foreground' : 'text-good-text')}>
                {!enCours && <CircleCheck className="size-4" />}
                {enCours ? (courrier.etape_libelle ?? '—') : 'Workflow terminé'}
              </div>
              {enCours && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {chargementTransitions ? (
                    <Skeleton className="h-9 w-40" />
                  ) : (transitionsDisponibles ?? []).length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">Aucune action disponible pour vous à cette étape.</p>
                  ) : (
                    (transitionsDisponibles ?? []).map((t, i) =>
                      // V5 §3-§9 : sur un courrier arrivé, une transition tagguée d'un
                      // type_action (donnée de configuration, cf. Administration >
                      // Workflows) ouvre la fenêtre modale d'action au lieu d'une simple
                      // confirmation — pour tout autre cas (départ/interne, ou transition
                      // non tagguée), comportement inchangé.
                      courrier.sens === 'entrant' && t.type_action ? (
                        <Button key={t.transition_id} variant={i === 0 ? 'default' : 'outline'} onClick={() => setActionOuverte(t)}>
                          {t.libelle_action}
                        </Button>
                      ) : (
                        <Confirmation
                          key={t.transition_id}
                          titre={`Confirmer l'action « ${t.libelle_action} » ?`}
                          libelleConfirmer={t.libelle_action}
                          enCours={executer.isPending}
                          onConfirmer={(fermer) => executer.mutate({ transitionId: t.transition_id }, { onSuccess: fermer })}
                          declencheur={(ouvrir) => (
                            <Button variant={i === 0 ? 'default' : 'outline'} disabled={executer.isPending} onClick={ouvrir}>
                              {t.libelle_action}
                            </Button>
                          )}
                        >
                          <p className="text-muted-foreground">Le courrier passera à l'étape suivante du circuit.</p>
                        </Confirmation>
                      ),
                    )
                  )}
                </div>
              )}
            </div>

            {/* Historique */}
            <div>
              <h4 className="mb-3 text-[13px] font-semibold">Historique</h4>
              {(historique ?? []).length === 0 ? (
                <p className="text-[13px] text-muted-foreground">Aucun événement.</p>
              ) : (
                <ol>
                  {(historique ?? []).map((h, i, liste) => {
                    const dernier = i === liste.length - 1;
                    const actions = actionsParHistorique.get(h.id);
                    const principal = actions?.find((a) => a.type_diffusion === 'principal');
                    const copies = actions?.filter((a) => a.type_diffusion === 'copie') ?? [];
                    const titre = principal
                      ? principal.type_action
                        ? LIBELLE_TYPE_ACTION[principal.type_action]
                        : etapeParId.get(h.etape_suivante_id)?.libelle
                      : // transition_id null = événement système, pas une transition configurée :
                        // soit le démarrage du workflow (etape_precedente_id null — libellé dédié
                        // pour un courrier départ), soit une clôture (ex. décharge, cf.
                        // fn_ajouter_decharge_courrier) où le commentaire porte le libellé de
                        // l'événement puisque l'étape n'a pas changé.
                        !h.transition_id && !h.etape_precedente_id && courrier.sens === 'sortant'
                        ? 'Enregistrement courrier départ'
                        : !h.transition_id && h.commentaire
                          ? h.commentaire
                          : (etapeParId.get(h.etape_suivante_id)?.libelle ?? h.etape_suivante_id);
                    const auteur = h.utilisateur_id ? utilisateurParId.get(h.utilisateur_id) : undefined;

                    return (
                      <li key={h.id} className={cn('relative pl-6', !dernier && 'pb-5')}>
                        {!dernier && <span className="absolute bottom-0 left-[5px] top-3 w-px bg-border" />}
                        <span
                          className={cn(
                            'absolute left-0 top-1.5 size-[11px] rounded-full border-2 border-card ring-1',
                            dernier ? 'bg-primary ring-primary' : 'bg-muted-foreground/50 ring-border',
                          )}
                        />
                        <div className="text-[13px] font-semibold">{titre}</div>
                        {principal && (
                          <div className="mt-1 space-y-0.5 text-[13px] text-muted-foreground">
                            <div>
                              <span className="text-foreground">{cibleLabel(principal)}</span>
                              {copies.length > 0 && <> · en copie : {copies.map(cibleLabel).join(', ')}</>}
                            </div>
                            {principal.actions_demandees_ids.length > 0 && (
                              <div>
                                Actions : {principal.actions_demandees_ids.map((id) => actionDemandeeParId.get(id) ?? id).join(', ')}
                              </div>
                            )}
                            {principal.echeance && <div>Échéance : {fr(principal.echeance).format('D MMMM YYYY')}</div>}
                            {principal.instruction && <div className="italic">« {principal.instruction} »</div>}
                          </div>
                        )}
                        {!principal && h.transition_id && h.commentaire && (
                          <div className="mt-1 text-[13px] italic text-muted-foreground">« {h.commentaire} »</div>
                        )}
                        <div className="mt-1 text-[12px] text-muted-foreground">
                          {fr(h.date_action).format('D MMM YYYY à HH:mm')}
                          {auteur ? ` · ${auteur}` : ''}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </>
        )}
      </CardContent>

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
