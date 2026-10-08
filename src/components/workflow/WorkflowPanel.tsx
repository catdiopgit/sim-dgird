import { CircleCheck, GitBranch } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useWorkflowEtapes } from '../../hooks/workflow/useWorkflowGenerique';
import type { WorkflowHistoriqueEntree, WorkflowInstance } from '../../services/workflow/generique';
import { cn } from '../../lib/utils';
import { fr } from '../../utils/dateFr';
import { Confirmation } from '../form/confirm-dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/input';
import { Skeleton } from '../ui/skeleton';

export interface TransitionProposee {
  transition_id: string;
  libelle_action: string;
}

interface Props {
  titre: string;
  organisationId: string;
  /** Instance et historique chargés par le hook du module (le backend les expose par objet porteur). */
  instance: WorkflowInstance | undefined;
  historique: WorkflowHistoriqueEntree[] | undefined;
  chargement: boolean;
  etapeLibelle: string | null;
  transitions: TransitionProposee[] | undefined;
  chargementTransitions: boolean;
  enExecution: boolean;
  onExecuter: (transitionId: string, commentaire: string | undefined) => void;
  /** Libellé de l'événement de démarrage (aucune transition, aucune étape précédente). */
  libelleDemarrage?: string;
  libelleTermine?: string;
}

// Panneau de circuit générique (moteur de workflow partagé GED / Missions) :
// étape actuelle, actions disponibles (résolues côté serveur) avec
// commentaire facultatif et confirmation, puis historique en frise.
export function WorkflowPanel({
  titre,
  organisationId,
  instance,
  historique,
  chargement,
  etapeLibelle,
  transitions,
  chargementTransitions,
  enExecution,
  onExecuter,
  libelleDemarrage = 'Soumission',
  libelleTermine = 'Workflow terminé',
}: Props) {
  const { data: etapes } = useWorkflowEtapes(instance?.workflow_definition_id);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const [commentaire, setCommentaire] = useState('');

  const etapeParId = useMemo(() => new Map((etapes ?? []).map((e) => [e.id, e])), [etapes]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  const enCours = instance?.statut_instance === 'en_cours';
  const liste = transitions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titre}</CardTitle>
        <GitBranch className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-5">
        {chargement ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className={cn('rounded-lg p-4', enCours ? 'bg-accent' : 'bg-good/10')}>
              <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                {enCours ? 'Étape actuelle' : 'Statut'}
              </div>
              <div className={cn('mt-1 flex items-center gap-2 font-semibold', enCours ? 'text-accent-foreground' : 'text-good-text')}>
                {!enCours && <CircleCheck className="size-4" />}
                {enCours ? (etapeLibelle ?? '—') : libelleTermine}
              </div>
              {enCours &&
                (chargementTransitions ? (
                  <Skeleton className="mt-3 h-9 w-40" />
                ) : liste.length === 0 ? (
                  <p className="mt-2 text-[13px] text-muted-foreground">Aucune action disponible pour vous à cette étape.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    <Textarea
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      placeholder="Commentaire (optionnel)"
                      aria-label="Commentaire"
                      rows={2}
                      className="bg-card"
                    />
                    <div className="flex flex-wrap gap-2">
                      {liste.map((t, i) => (
                        <Confirmation
                          key={t.transition_id}
                          titre={`Confirmer l'action « ${t.libelle_action} » ?`}
                          libelleConfirmer={t.libelle_action}
                          enCours={enExecution}
                          onConfirmer={(fermer) => {
                            fermer();
                            onExecuter(t.transition_id, commentaire || undefined);
                          }}
                          declencheur={(ouvrir) => (
                            <Button variant={i === 0 ? 'default' : 'outline'} disabled={enExecution} onClick={ouvrir}>
                              {t.libelle_action}
                            </Button>
                          )}
                        >
                          {commentaire ? (
                            <p>
                              Commentaire joint : <span className="text-muted-foreground">« {commentaire} »</span>
                            </p>
                          ) : (
                            <p className="text-muted-foreground">Le dossier passera à l'étape suivante du circuit.</p>
                          )}
                        </Confirmation>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            <div>
              <h4 className="mb-3 text-[13px] font-semibold">Historique</h4>
              {(historique ?? []).length === 0 ? (
                <p className="text-[13px] text-muted-foreground">Aucun événement.</p>
              ) : (
                <ol>
                  {(historique ?? []).map((h, i, tout) => {
                    const dernier = i === tout.length - 1;
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
                        <div className="text-[13px] font-semibold">
                          {!h.transition_id && !h.etape_precedente_id
                            ? libelleDemarrage
                            : (etapeParId.get(h.etape_suivante_id)?.libelle ?? h.etape_suivante_id)}
                        </div>
                        {h.commentaire && <div className="mt-1 text-[13px] italic text-muted-foreground">« {h.commentaire} »</div>}
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
    </Card>
  );
}
