import { Gavel, Layers, MousePointerClick, Plus } from 'lucide-react';
import { useState } from 'react';
import { ActionsLigne, BoutonModifier, BoutonSuppression } from '../../../components/form/actions-ligne';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { EnTeteSection, EtatVide } from '../../../components/ui/page-header';
import { Tableau } from '../../../components/ui/tableau';
import { usePhaseTypeMarcheMutations, usePhasesTypeMarche, useTypeMarcheMutations, useTypesMarche } from '../../../hooks/marches/useTypesMarche';
import type { PhaseTypeMarche, TypeMarche } from '../../../services/marches/typesMarche';
import { PhaseTypeMarcheFormModal } from './PhaseTypeMarcheFormModal';
import { TypeMarcheFormModal } from './TypeMarcheFormModal';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

function BadgeActif({ actif }: { actif: boolean }) {
  return actif ? (
    <Badge variant="success" shape="pill">
      Actif
    </Badge>
  ) : (
    <Badge variant="muted" shape="pill">
      Inactif
    </Badge>
  );
}

function PhasesDuType({ type, peutModifier }: { type: TypeMarche; peutModifier: boolean }) {
  const { data: phases, isLoading } = usePhasesTypeMarche(type.id);
  const { remove } = usePhaseTypeMarcheMutations(type.id);
  const [phaseEnEdition, setPhaseEnEdition] = useState<PhaseTypeMarche | 'nouvelle' | null>(null);

  return (
    <Card className="min-w-0">
      <CardHeader className="items-center">
        <CardTitle className="min-w-0 truncate">Phases — {type.libelle}</CardTitle>
        {peutModifier && (
          <Button variant="outline" size="sm" onClick={() => setPhaseEnEdition('nouvelle')}>
            <Plus />
            Ajouter une phase
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tableau<PhaseTypeMarche>
          libelle={`Phases du type ${type.libelle}`}
          lignes={phases}
          cleLigne={(p) => p.id}
          chargement={isLoading}
          minLargeur={480}
          vide={{ icone: Layers, titre: 'Aucune phase', description: 'Ajoutez les phases de ce type de marché, dans leur ordre de réalisation.' }}
          colonnes={[
            { cle: 'ordre', titre: 'Ordre', className: 'w-14 tabular-nums text-muted-foreground', rendu: (p) => p.ordre },
            {
              cle: 'nom',
              titre: 'Phase',
              rendu: (p) => (
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {p.nom}
                  {!p.obligatoire && (
                    <Badge variant="muted" shape="pill">
                      optionnelle
                    </Badge>
                  )}
                </span>
              ),
            },
            {
              cle: 'duree',
              titre: 'Durée',
              className: 'w-28 whitespace-nowrap tabular-nums',
              rendu: (p) => `${p.duree} ${p.unite_duree}(s)`,
            },
            { cle: 'actif', titre: 'Statut', className: 'w-24', rendu: (p) => <BadgeActif actif={p.actif} /> },
            ...(peutModifier
              ? [
                  {
                    cle: 'actions',
                    titre: <span className="sr-only">Actions</span>,
                    className: 'w-20',
                    rendu: (p: PhaseTypeMarche) => (
                      <ActionsLigne>
                        <BoutonModifier libelle={`Modifier la phase ${p.nom}`} onClick={() => setPhaseEnEdition(p)} />
                        <BoutonSuppression
                          libelle={`Supprimer la phase ${p.nom}`}
                          titre="Supprimer cette phase ?"
                          enCours={remove.isPending}
                          onConfirmer={(fermer) => remove.mutate(p.id, { onSuccess: fermer })}
                        >
                          <p>
                            La phase <strong>{p.nom}</strong> ne sera plus dupliquée dans les nouveaux marchés de ce type.
                          </p>
                        </BoutonSuppression>
                      </ActionsLigne>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </CardContent>
      <PhaseTypeMarcheFormModal
        open={phaseEnEdition !== null}
        typeMarcheId={type.id}
        phase={phaseEnEdition === 'nouvelle' ? null : phaseEnEdition}
        onClose={() => setPhaseEnEdition(null)}
      />
    </Card>
  );
}

// §7 Paramétrage — types de marché et leurs phases, entièrement configurables
// depuis l'administration système, sans limite de nombre de types ni de phases.
export function TypesMarcheManager({ organisationId, peutModifier }: Props) {
  const { data: types, isLoading } = useTypesMarche();
  const { remove } = useTypeMarcheMutations();
  const [typeEnEdition, setTypeEnEdition] = useState<TypeMarche | 'nouveau' | null>(null);
  const [typeSelectionneId, setTypeSelectionneId] = useState<string | null>(null);

  const typeSelectionne = (types ?? []).find((t) => t.id === typeSelectionneId) ?? null;

  return (
    <div>
      <EnTeteSection
        titre="Types de marché"
        description="Chaque type de marché possède un ensemble ordonné de phases (dupliquées automatiquement à la création d'un marché de ce type)."
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="min-w-0">
          <CardHeader className="items-center">
            <CardTitle>Types</CardTitle>
            {peutModifier && (
              <Button variant="outline" size="sm" onClick={() => setTypeEnEdition('nouveau')}>
                <Plus />
                Nouveau type
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Tableau<TypeMarche>
              libelle="Types de marché"
              lignes={types}
              cleLigne={(t) => t.id}
              chargement={isLoading}
              minLargeur={360}
              onLigneClic={(t) => setTypeSelectionneId(t.id)}
              estActive={(t) => t.id === typeSelectionneId}
              vide={{ icone: Gavel, titre: 'Aucun type de marché' }}
              colonnes={[
                {
                  cle: 'libelle',
                  titre: 'Libellé',
                  rendu: (t) => (
                    <div>
                      <div className="font-medium">{t.libelle}</div>
                      <div className="font-mono text-[12px] text-muted-foreground">{t.code}</div>
                    </div>
                  ),
                },
                { cle: 'actif', titre: 'Statut', className: 'w-24', rendu: (t) => <BadgeActif actif={t.actif} /> },
                ...(peutModifier
                  ? [
                      {
                        cle: 'actions',
                        titre: <span className="sr-only">Actions</span>,
                        className: 'w-20',
                        rendu: (t: TypeMarche) => (
                          <ActionsLigne>
                            <BoutonModifier libelle={`Modifier le type ${t.libelle}`} onClick={() => setTypeEnEdition(t)} />
                            <BoutonSuppression
                              libelle={`Supprimer le type ${t.libelle}`}
                              titre="Supprimer ce type de marché ?"
                              enCours={remove.isPending}
                              onConfirmer={(fermer) =>
                                remove.mutate(t.id, {
                                  onSuccess: () => {
                                    if (typeSelectionneId === t.id) setTypeSelectionneId(null);
                                    fermer();
                                  },
                                })
                              }
                            >
                              <p>
                                Le type <strong>{t.libelle}</strong> et ses phases seront supprimés.
                              </p>
                            </BoutonSuppression>
                          </ActionsLigne>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </CardContent>
        </Card>

        {typeSelectionne ? (
          <PhasesDuType key={typeSelectionne.id} type={typeSelectionne} peutModifier={peutModifier} />
        ) : (
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Phases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-border">
                <EtatVide
                  icone={MousePointerClick}
                  titre="Aucun type sélectionné"
                  description="Choisissez un type de marché pour afficher et modifier ses phases."
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <TypeMarcheFormModal
        open={typeEnEdition !== null}
        organisationId={organisationId}
        type={typeEnEdition === 'nouveau' ? null : typeEnEdition}
        onClose={() => setTypeEnEdition(null)}
      />
    </div>
  );
}
