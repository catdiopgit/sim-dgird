import { CalendarClock, CircleCheck, Layers, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Confirmation } from '../../components/form/confirm-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Encart } from '../../components/ui/encart';
import { Tableau, type Colonne } from '../../components/ui/tableau';
import { useDocumentsMarche } from '../../hooks/marches/useDocumentsMarche';
import { usePhaseMarcheMutations, usePhasesMarche } from '../../hooks/marches/usePhasesMarche';
import type { PhaseMarcheAvecStatut } from '../../services/marches/phasesMarche';
import { BadgeStatutPhase, dateCourte } from './marcheAffichage';
import { PhaseValidationModal } from './PhaseValidationModal';

interface Props {
  marcheId: string;
  peutModifier: boolean;
  cloture: boolean;
}

// §10/§11/§13 : planification en cascade (bouton "Planifier", idempotent —
// génère les phases depuis le type de marché si aucune n'existe encore, sinon
// recalcule les dates prévisionnelles), suivi individuel de chaque phase avec
// dates prévues/réelles distinctes, statut calculé côté serveur.
export function MarchePhasesTab({ marcheId, peutModifier, cloture }: Props) {
  const { data: phases, isLoading } = usePhasesMarche(marcheId);
  const { data: documents } = useDocumentsMarche(marcheId);
  const { planifier, demarrer, valider } = usePhaseMarcheMutations(marcheId);
  const [phaseAValider, setPhaseAValider] = useState<PhaseMarcheAvecStatut | null>(null);

  const phasesAvecJustificatif = useMemo(
    () => new Set((documents ?? []).filter((d) => d.phase_marche_id).map((d) => d.phase_marche_id as string)),
    [documents],
  );

  const actionsVisibles = peutModifier && !cloture;

  const colonnes: Colonne<PhaseMarcheAvecStatut>[] = [
    {
      cle: 'nom',
      titre: 'Phase',
      rendu: (p) => (
        <div>
          <div className="font-medium">{p.nom}</div>
          <div className="text-[12px] text-muted-foreground">
            {p.duree_prevue} {p.unite_duree}(s){p.obligatoire ? ' · obligatoire' : ''}
          </div>
        </div>
      ),
    },
    {
      cle: 'prevu',
      titre: 'Prévu',
      className: 'whitespace-nowrap tabular-nums',
      rendu: (p) => (
        <span>
          {dateCourte(p.date_debut_prevue)} → {dateCourte(p.date_fin_prevue)}
        </span>
      ),
    },
    {
      cle: 'reel',
      titre: 'Réel',
      className: 'whitespace-nowrap tabular-nums',
      rendu: (p) =>
        p.date_debut_reelle || p.date_fin_reelle ? (
          <span>
            {dateCourte(p.date_debut_reelle)} → {dateCourte(p.date_fin_reelle)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { cle: 'statut', titre: 'Statut', className: 'whitespace-nowrap', rendu: (p) => <BadgeStatutPhase statut={p.statut_calcule} /> },
    {
      cle: 'justificatif',
      titre: 'Justificatif',
      className: 'whitespace-nowrap',
      rendu: (p) =>
        phasesAvecJustificatif.has(p.id) ? (
          <Badge variant="success" shape="pill">
            Présent
          </Badge>
        ) : (
          <Badge variant="muted" shape="pill">
            Aucun
          </Badge>
        ),
    },
    ...(actionsVisibles
      ? [
          {
            cle: 'actions',
            titre: <span className="sr-only">Actions</span>,
            className: 'w-px whitespace-nowrap text-right',
            rendu: (p: PhaseMarcheAvecStatut) => {
              if (p.date_fin_reelle) return null;
              return (
                <div className="flex justify-end gap-1">
                  {!p.date_debut_reelle && (
                    <Button variant="ghost" size="sm" disabled={demarrer.isPending} onClick={() => demarrer.mutate(p.id)}>
                      <Play className="text-muted-foreground" />
                      Démarrer
                    </Button>
                  )}
                  {phasesAvecJustificatif.has(p.id) ? (
                    <Confirmation
                      titre="Valider la réalisation de cette phase ?"
                      libelleConfirmer="Valider"
                      enCours={valider.isPending}
                      onConfirmer={(fermer) => valider.mutate(p.id, { onSuccess: fermer })}
                      declencheur={(ouvrir) => (
                        <Button variant="outline" size="sm" onClick={ouvrir}>
                          <CircleCheck className="text-muted-foreground" />
                          Valider la réalisation
                        </Button>
                      )}
                    >
                      <p>
                        La phase <b>{p.nom}</b> sera marquée comme réalisée à la date du jour.
                      </p>
                    </Confirmation>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setPhaseAValider(p)}>
                      <CircleCheck className="text-muted-foreground" />
                      Valider la réalisation
                    </Button>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Planification et réalisation des phases</CardTitle>
          <CardDescription className="mt-1">
            Dates prévisionnelles calculées en cascade depuis le type de marché ; dates réelles saisies au fil de la réalisation.
          </CardDescription>
        </div>
        {actionsVisibles && (
          <Button variant="outline" size="sm" disabled={planifier.isPending} onClick={() => planifier.mutate()}>
            <CalendarClock className="text-muted-foreground" />
            {phases && phases.length > 0 ? 'Recalculer la planification' : 'Planifier'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {phases && phases.some((p) => p.statut_calcule === 'en_retard') && (
          <Encart variante="attention">
            Certaines phases sont en retard — une alerte par e-mail est envoyée automatiquement au responsable du marché.
          </Encart>
        )}

        <Tableau
          colonnes={colonnes}
          lignes={phases}
          cleLigne={(p) => p.id}
          chargement={isLoading}
          minLargeur={900}
          libelle="Phases du marché"
          vide={{
            icone: Layers,
            titre: 'Aucune phase planifiée',
            description: 'Cliquez sur « Planifier » (le type de marché doit avoir des phases paramétrées).',
          }}
        />
      </CardContent>

      <PhaseValidationModal open={phaseAValider !== null} marcheId={marcheId} phase={phaseAValider} onClose={() => setPhaseAValider(null)} />
    </Card>
  );
}
