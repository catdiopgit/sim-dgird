import { CalendarDays, CircleCheck, Package, Pencil, Plus, TriangleAlert, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BoutonSuppression } from '../../components/form/actions-ligne';
import { Confirmation } from '../../components/form/confirm-dialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { EtatVide } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { useContactsExecution } from '../../hooks/projets/useContactsExecution';
import { useDocumentsProjet } from '../../hooks/projets/useDocumentsProjet';
import { useCloturerLivrable, useLivrableMutations, useLivrables } from '../../hooks/projets/useLivrables';
import { cn } from '../../lib/utils';
import type { Livrable } from '../../services/projets/livrables';
import type { ProjetsReferentiel } from '../../services/projets/referentiel';
import { fr } from '../../utils/dateFr';
import { LivrableClotureModal } from './LivrableClotureModal';
import { LivrableFormModal } from './LivrableFormModal';
import { BadgeValeur } from './projetAffichage';

interface Props {
  projetId: string;
  organisationId: string;
  peutModifier: boolean;
  referentiel: ProjetsReferentiel | undefined;
  utilisateurParId: Map<string, string>;
  cloture: boolean;
}

const STATUTS_TERMINAUX = new Set(['realise', 'valide', 'annule']);

// §2 Le projet est désormais constitué uniquement de livrables (plus de
// phase/activité intermédiaire) — chacun porte son poids (quote-part) dans
// l'avancement global, recalculé automatiquement côté serveur dès qu'un
// livrable change (trigger app.trg_livrables_recalcule_avancement, 0073).
export function ProjetLivrablesTab({
  projetId,
  organisationId,
  peutModifier,
  referentiel,
  utilisateurParId,
  cloture,
}: Props) {
  const { data: livrables, isLoading } = useLivrables(projetId);
  const { data: contacts } = useContactsExecution(projetId);
  const { data: documents } = useDocumentsProjet(projetId);
  const cloturer = useCloturerLivrable(projetId);
  const { remove: supprimerLivrable } = useLivrableMutations(projetId);
  const [livrableEnEdition, setLivrableEnEdition] = useState<Livrable | 'nouveau' | null>(null);
  const [livrableAClore, setLivrableAClore] = useState<Livrable | null>(null);

  const statutParId = useMemo(() => new Map((referentiel?.statutsLivrable ?? []).map((v) => [v.id, v])), [referentiel]);
  const contactParId = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, c.nom])), [contacts]);
  const livrablesAvecJustificatif = useMemo(
    () => new Set((documents ?? []).filter((d) => d.livrable_id).map((d) => d.livrable_id as string)),
    [documents],
  );

  const poidsTotal = useMemo(() => (livrables ?? []).reduce((somme, l) => somme + l.poids_pct, 0), [livrables]);
  const actionsVisibles = peutModifier && !cloture;

  const nomResponsable = (l: Livrable) => {
    if (l.responsable_utilisateur_id) return utilisateurParId.get(l.responsable_utilisateur_id) ?? '—';
    if (l.responsable_contact_id) return contactParId.get(l.responsable_contact_id) ?? '—';
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>
            Livrables
            {livrables && livrables.length > 0 && <span className="ml-2 font-normal text-muted-foreground">{livrables.length}</span>}
          </CardTitle>
          {livrables && livrables.length > 0 && (
            <p className={cn('mt-1 text-[13px]', poidsTotal === 100 ? 'text-muted-foreground' : 'font-medium text-warn-text')}>
              Quote-parts cumulées : {poidsTotal} % {poidsTotal === 100 ? '' : '(devrait être 100 %)'}
            </p>
          )}
        </div>
        {actionsVisibles && (
          <Button variant="outline" size="sm" onClick={() => setLivrableEnEdition('nouveau')}>
            <Plus />
            Ajouter un livrable
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (livrables ?? []).length === 0 ? (
          <div className="rounded-lg border border-dashed border-border">
            <EtatVide icone={Package} titre="Aucun livrable" description="Le projet avance au rythme de ses livrables, chacun pondéré par sa quote-part." />
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {(livrables ?? []).map((l) => {
              const statut = l.statut_valeur_id ? statutParId.get(l.statut_valeur_id) : null;
              const termine = Boolean(statut?.code && STATUTS_TERMINAUX.has(statut.code));
              const enRetard = statut?.code === 'en-retard';
              const responsable = nomResponsable(l);
              return (
                <li key={l.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{l.nom}</span>
                      <BadgeValeur valeur={statut} />
                      {termine && !livrablesAvecJustificatif.has(l.id) && statut?.code !== 'annule' && (
                        <span className="inline-flex items-center gap-1 text-[12px] text-warn-text">
                          <TriangleAlert className="size-3.5" />
                          Sans justificatif
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="size-3.5" />
                        {responsable ?? 'Sans responsable'}
                      </span>
                      <span className={cn('inline-flex items-center gap-1.5', enRetard && 'font-medium text-crit-text')}>
                        <CalendarDays className="size-3.5" />
                        {l.date_prevue ? fr(l.date_prevue).format('D MMM YYYY') : 'Sans échéance'}
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full items-center gap-2 sm:w-40" title="Quote-part dans l'avancement du projet">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, l.poids_pct)}%` }} />
                    </div>
                    <span className="w-10 text-right text-[12px] font-semibold tabular-nums">{l.poids_pct} %</span>
                  </div>

                  {actionsVisibles && (
                    <div className="flex shrink-0 items-center gap-1">
                      {!termine &&
                        (livrablesAvecJustificatif.has(l.id) ? (
                          <Confirmation
                            titre="Clôturer ce livrable ?"
                            libelleConfirmer="Clôturer"
                            enCours={cloturer.isPending}
                            onConfirmer={(fermer) => cloturer.mutate({ id: l.id }, { onSuccess: fermer })}
                            declencheur={(ouvrir) => (
                              <Button variant="outline" size="sm" disabled={cloturer.isPending} onClick={ouvrir}>
                                <CircleCheck />
                                Clôturer
                              </Button>
                            )}
                          >
                            <p>
                              Le livrable <strong>{l.nom}</strong> sera marqué comme livré, avec le justificatif déjà joint.
                            </p>
                          </Confirmation>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setLivrableAClore(l)}>
                            <CircleCheck />
                            Clôturer
                          </Button>
                        ))}
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => setLivrableEnEdition(l)} aria-label={`Modifier ${l.nom}`} title="Modifier">
                        <Pencil />
                      </Button>
                      <BoutonSuppression
                        libelle={`Supprimer ${l.nom}`}
                        titre="Supprimer ce livrable ?"
                        enCours={supprimerLivrable.isPending}
                        onConfirmer={(fermer) => supprimerLivrable.mutate(l.id, { onSuccess: fermer })}
                      >
                        <p>
                          Le livrable <strong>{l.nom}</strong> sera supprimé du projet.
                        </p>
                      </BoutonSuppression>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <LivrableFormModal
        open={livrableEnEdition !== null}
        organisationId={organisationId}
        projetId={projetId}
        livrable={livrableEnEdition === 'nouveau' ? null : livrableEnEdition}
        onClose={() => setLivrableEnEdition(null)}
      />
      <LivrableClotureModal
        open={livrableAClore !== null}
        projetId={projetId}
        livrable={livrableAClore}
        onClose={() => setLivrableAClore(null)}
      />
    </Card>
  );
}
