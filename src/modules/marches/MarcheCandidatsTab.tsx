import { Building2, Plus, Upload, Users } from 'lucide-react';
import { useState } from 'react';
import { ActionsLigne, BoutonModifier, BoutonSuppression } from '../../components/form/actions-ligne';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tableau, type Colonne } from '../../components/ui/tableau';
import { useMarcheCandidatMutations, useMarcheCandidats } from '../../hooks/marches/useMarcheCandidats';
import type { MarcheCandidat } from '../../services/marches/candidats';
import { DocumentMarcheAjouterModal } from './DocumentMarcheAjouterModal';
import { MarcheCandidatFormModal } from './MarcheCandidatFormModal';

interface Props {
  marcheId: string;
  peutModifier: boolean;
}

// §15 Entreprises et consultants (fonctionnalité optionnelle) — les offres
// technique/financière se joignent via « Ajouter une offre », qui dépose un
// document rattaché au candidat (marche_candidat_id).
export function MarcheCandidatsTab({ marcheId, peutModifier }: Props) {
  const { data: candidats, isLoading } = useMarcheCandidats(marcheId);
  const { remove } = useMarcheCandidatMutations(marcheId);
  const [candidatEnEdition, setCandidatEnEdition] = useState<MarcheCandidat | 'nouveau' | null>(null);
  const [candidatPourOffre, setCandidatPourOffre] = useState<MarcheCandidat | null>(null);

  const colonnes: Colonne<MarcheCandidat>[] = [
    {
      cle: 'nom',
      titre: 'Nom / raison sociale',
      rendu: (c) => (
        <span className="flex items-center gap-2.5">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">{c.nom}</span>
        </span>
      ),
    },
    {
      cle: 'type',
      titre: 'Type',
      className: 'w-32',
      rendu: (c) => <Badge variant="muted">{c.type === 'entreprise' ? 'Entreprise' : 'Consultant'}</Badge>,
    },
    {
      cle: 'coordonnees',
      titre: 'Coordonnées',
      rendu: (c) => (c.coordonnees ? <span className="whitespace-pre-line">{c.coordonnees}</span> : <span className="text-muted-foreground">—</span>),
    },
    ...(peutModifier
      ? [
          {
            cle: 'actions',
            titre: <span className="sr-only">Actions</span>,
            className: 'w-px whitespace-nowrap',
            rendu: (c: MarcheCandidat) => (
              <ActionsLigne>
                <Button variant="ghost" size="sm" onClick={() => setCandidatPourOffre(c)}>
                  <Upload className="text-muted-foreground" />
                  Ajouter une offre
                </Button>
                <BoutonModifier libelle={`Modifier ${c.nom}`} onClick={() => setCandidatEnEdition(c)} />
                <BoutonSuppression
                  libelle={`Supprimer ${c.nom}`}
                  titre="Supprimer ce candidat ?"
                  enCours={remove.isPending}
                  onConfirmer={(fermer) => remove.mutate(c.id, { onSuccess: fermer })}
                >
                  <p>
                    <b>{c.nom}</b> sera retiré des candidats de ce marché.
                  </p>
                </BoutonSuppression>
              </ActionsLigne>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Entreprises et consultants
          {candidats && candidats.length > 0 && <span className="ml-2 font-normal text-muted-foreground">{candidats.length}</span>}
        </CardTitle>
        {peutModifier && (
          <Button variant="outline" size="sm" onClick={() => setCandidatEnEdition('nouveau')}>
            <Plus />
            Ajouter un candidat
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tableau
          libelle="Candidats du marché"
          colonnes={colonnes}
          lignes={candidats}
          cleLigne={(c) => c.id}
          chargement={isLoading}
          minLargeur={640}
          vide={{ icone: Users, titre: 'Aucun candidat', description: 'Enregistrez les entreprises et consultants participant à la procédure.' }}
        />
      </CardContent>

      <MarcheCandidatFormModal
        open={candidatEnEdition !== null}
        marcheId={marcheId}
        candidat={candidatEnEdition === 'nouveau' ? null : candidatEnEdition}
        onClose={() => setCandidatEnEdition(null)}
      />
      <DocumentMarcheAjouterModal
        open={candidatPourOffre !== null}
        marcheId={marcheId}
        candidatIdFixe={candidatPourOffre?.id}
        onClose={() => setCandidatPourOffre(null)}
      />
    </Card>
  );
}
