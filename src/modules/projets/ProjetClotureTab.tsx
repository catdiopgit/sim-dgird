import { CircleCheck, Lock, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Confirmation, ConfirmDialog } from '../../components/form/confirm-dialog';
import { Champ } from '../../components/form/champ';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { useClotureMutations, useVerifierCloture } from '../../hooks/projets/useClotureProjet';
import type { Projet } from '../../services/projets/projets';
import { BadgeCloture } from './projetAffichage';

interface Props {
  projet: Projet;
  peutDemander: boolean;
  utilisateurParId: Map<string, string>;
}

// §8/§9 : checklist en direct (fn_verifier_cloture_projet) + workflow à deux
// niveaux. Les boutons Confirmer/Rejeter restent affichés dès qu'une demande
// est en attente — c'est le serveur (responsable hiérarchique ou permission
// projets/valider) qui tranche en dernier ressort, l'UI n'est qu'une aide.
export function ProjetClotureTab({ projet, peutDemander, utilisateurParId }: Props) {
  const { data: controles, isLoading } = useVerifierCloture(projet.id);
  const { demander, confirmer, rejeter } = useClotureMutations(projet.id);
  const [motifModalOuvert, setMotifModalOuvert] = useState(false);
  const [motif, setMotif] = useState('');

  const blocages = (controles ?? []).filter((c) => c.bloquant);
  const nom = (id: string | null) => (id ? (utilisateurParId.get(id) ?? '—') : '—');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clôture du projet</CardTitle>
        {projet.cloture_statut === 'aucune' ? (
          <Badge variant="muted" shape="pill">
            Aucune demande
          </Badge>
        ) : (
          <BadgeCloture statut={projet.cloture_statut} />
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-[12px] text-muted-foreground">Demandée par</dt>
            <dd className="mt-0.5 font-medium">{nom(projet.cloture_demandee_par)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted-foreground">Confirmée par</dt>
            <dd className="mt-0.5 font-medium">{nom(projet.cloture_confirmee_par)}</dd>
          </div>
          {projet.cloture_motif_rejet && (
            <div className="sm:col-span-2">
              <dt className="text-[12px] text-muted-foreground">Motif du rejet</dt>
              <dd className="mt-0.5 whitespace-pre-line">{projet.cloture_motif_rejet}</dd>
            </div>
          )}
        </dl>

        {projet.cloture_statut === 'confirmee' && (
          <div className="flex items-start gap-2.5 rounded-lg bg-good/10 p-3 text-[13px] text-good-text">
            <Lock className="mt-0.5 size-4 shrink-0" />
            Ce projet est clôturé : toute modification normale est bloquée.
          </div>
        )}

        <section>
          <h4 className="mb-2 text-[13px] font-semibold">
            Contrôles avant clôture
            {!isLoading && blocages.length > 0 && (
              <span className="ml-2 font-normal text-warn-text">
                {blocages.length} point{blocages.length > 1 ? 's' : ''} bloquant{blocages.length > 1 ? 's' : ''}
              </span>
            )}
          </h4>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (controles ?? []).length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Aucun contrôle.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {(controles ?? []).map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 px-3 py-2.5 text-[13px]">
                  {c.bloquant ? (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn-text" aria-label="Bloquant" />
                  ) : (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-good-text" aria-label="Conforme" />
                  )}
                  <span>{c.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {peutDemander && projet.cloture_statut !== 'demandee' && projet.cloture_statut !== 'confirmee' && (
          <Confirmation
            titre="Demander la clôture du projet ?"
            libelleConfirmer="Demander la clôture"
            enCours={demander.isPending}
            onConfirmer={(fermer) => demander.mutate(undefined, { onSuccess: fermer })}
            declencheur={(ouvrir) => (
              <Button onClick={ouvrir} disabled={demander.isPending}>
                Demander la clôture
              </Button>
            )}
          >
            {blocages.length > 0 ? (
              <p className="text-warn-text">
                {blocages.length} contrôle{blocages.length > 1 ? 's' : ''} bloquant{blocages.length > 1 ? 's' : ''}{' '}
                subsiste{blocages.length > 1 ? 'nt' : ''}.
              </p>
            ) : (
              <p className="text-muted-foreground">La demande sera soumise au responsable pour confirmation.</p>
            )}
          </Confirmation>
        )}

        {projet.cloture_statut === 'demandee' && (
          <div className="flex flex-wrap gap-2">
            <Confirmation
              titre="Confirmer la clôture du projet ?"
              libelleConfirmer="Confirmer la clôture"
              enCours={confirmer.isPending}
              onConfirmer={(fermer) => confirmer.mutate(undefined, { onSuccess: fermer })}
              declencheur={(ouvrir) => (
                <Button onClick={ouvrir} disabled={confirmer.isPending}>
                  Confirmer la clôture
                </Button>
              )}
            >
              <p className="text-muted-foreground">Une fois clôturé, le projet ne pourra plus être modifié normalement.</p>
            </Confirmation>
            <Button variant="outline" className="text-crit-text hover:text-crit-text" onClick={() => setMotifModalOuvert(true)}>
              Rejeter
            </Button>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={motifModalOuvert}
        onClose={() => setMotifModalOuvert(false)}
        titre="Rejeter la demande de clôture"
        libelleConfirmer="Rejeter"
        destructif
        enCours={rejeter.isPending}
        confirmerDesactive={motif.trim().length === 0}
        onConfirmer={() =>
          rejeter.mutate(motif, {
            onSuccess: () => {
              setMotifModalOuvert(false);
              setMotif('');
            },
          })
        }
      >
        <Champ label="Motif du rejet" htmlFor="cloture-motif" requis>
          <Textarea
            id="cloture-motif"
            autoFocus
            rows={3}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Expliquez ce qui doit être corrigé avant la clôture"
          />
        </Champ>
      </ConfirmDialog>
    </Card>
  );
}
