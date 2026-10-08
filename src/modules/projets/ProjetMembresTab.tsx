import { Pencil, Plus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ActionsLigne, BoutonSuppression } from '../../components/form/actions-ligne';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tableau } from '../../components/ui/tableau';
import { useMembreMutations, useMembresProjet } from '../../hooks/projets/useMembresProjet';
import type { ProjetsReferentiel } from '../../services/projets/referentiel';
import type { ProjetMembre } from '../../services/projets/membres';
import { MembreFormModal } from './MembreFormModal';
import { BadgeValeur } from './projetAffichage';

interface Props {
  projetId: string;
  organisationId: string;
  peutModifier: boolean;
  referentiel: ProjetsReferentiel | undefined;
  utilisateurParId: Map<string, string>;
}

const initiales = (nom: string) =>
  nom
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join('');

export function ProjetMembresTab({ projetId, organisationId, peutModifier, referentiel, utilisateurParId }: Props) {
  const { data: membres, isLoading } = useMembresProjet(projetId);
  const { retirer } = useMembreMutations(projetId);
  const [formOuvert, setFormOuvert] = useState(false);

  const roleEquipeParId = useMemo(() => new Map((referentiel?.rolesEquipe ?? []).map((v) => [v.id, v])), [referentiel]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Équipe
          {membres && membres.length > 0 && <span className="ml-2 font-normal text-muted-foreground">{membres.length}</span>}
        </CardTitle>
        {peutModifier && (
          <Button variant="outline" size="sm" onClick={() => setFormOuvert(true)}>
            <Plus />
            Ajouter un membre
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tableau<ProjetMembre>
          libelle="Équipe du projet"
          lignes={membres}
          cleLigne={(m) => m.id}
          chargement={isLoading}
          minLargeur={480}
          vide={{ icone: Users, titre: 'Aucun membre', description: "Ajoutez les agents qui contribuent au projet." }}
          colonnes={[
            {
              cle: 'membre',
              titre: 'Membre',
              rendu: (m) => {
                const nom = utilisateurParId.get(m.utilisateur_id) ?? '—';
                return (
                  <span className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-semibold text-accent-foreground">
                      {initiales(nom)}
                    </span>
                    <span className="font-medium">{nom}</span>
                  </span>
                );
              },
            },
            {
              cle: 'role',
              titre: 'Rôle',
              rendu: (m) => <BadgeValeur valeur={m.role_equipe_valeur_id ? roleEquipeParId.get(m.role_equipe_valeur_id) : null} />,
            },
            {
              cle: 'droit',
              titre: "Droit d'écriture",
              className: 'w-40',
              rendu: (m) =>
                m.peut_modifier ? (
                  <Badge variant="success" shape="pill">
                    <Pencil className="mr-1 size-3" />
                    Contributeur
                  </Badge>
                ) : (
                  <Badge variant="muted" shape="pill">
                    Lecture seule
                  </Badge>
                ),
            },
            ...(peutModifier
              ? [
                  {
                    cle: 'actions',
                    titre: <span className="sr-only">Actions</span>,
                    className: 'w-14',
                    rendu: (m: ProjetMembre) => (
                      <ActionsLigne>
                        <BoutonSuppression
                          libelle={`Retirer ${utilisateurParId.get(m.utilisateur_id) ?? 'ce membre'}`}
                          titre="Retirer ce membre ?"
                          libelleConfirmer="Retirer"
                          enCours={retirer.isPending}
                          onConfirmer={(fermer) => retirer.mutate(m.id, { onSuccess: fermer })}
                        >
                          <p>
                            <strong>{utilisateurParId.get(m.utilisateur_id) ?? 'Ce membre'}</strong> ne fera plus partie de
                            l'équipe du projet.
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
      <MembreFormModal
        open={formOuvert}
        organisationId={organisationId}
        projetId={projetId}
        onClose={() => setFormOuvert(false)}
      />
    </Card>
  );
}
