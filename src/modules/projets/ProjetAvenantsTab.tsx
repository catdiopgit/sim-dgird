import { FileSignature, Plus } from 'lucide-react';
import { useState } from 'react';
import { ActionsLigne, BoutonModifier, BoutonSuppression } from '../../components/form/actions-ligne';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tableau } from '../../components/ui/tableau';
import { useAvenantMutations, useAvenants } from '../../hooks/projets/useAvenants';
import type { Avenant } from '../../services/projets/avenants';
import { fr } from '../../utils/dateFr';
import { formatMontant } from '../../utils/format';
import { AvenantFormModal } from './AvenantFormModal';

interface Props {
  projetId: string;
  peutModifier: boolean;
}

export function ProjetAvenantsTab({ projetId, peutModifier }: Props) {
  const { data: avenants, isLoading } = useAvenants(projetId);
  const { remove } = useAvenantMutations(projetId);
  const [avenantEnEdition, setAvenantEnEdition] = useState<Avenant | 'nouveau' | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Avenants
          {avenants && avenants.length > 0 && <span className="ml-2 font-normal text-muted-foreground">{avenants.length}</span>}
        </CardTitle>
        {peutModifier && (
          <Button variant="outline" size="sm" onClick={() => setAvenantEnEdition('nouveau')}>
            <Plus />
            Ajouter un avenant
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tableau<Avenant>
          libelle="Avenants du projet"
          lignes={avenants}
          cleLigne={(a) => a.id}
          chargement={isLoading}
          minLargeur={600}
          onLigneClic={(a) => setAvenantEnEdition(a)}
          vide={{ icone: FileSignature, titre: 'Aucun avenant' }}
          colonnes={[
            { cle: 'reference', titre: 'Référence', className: 'w-36', rendu: (a) => <span className="font-medium">{a.reference}</span> },
            {
              cle: 'date',
              titre: 'Date',
              className: 'w-32 tabular-nums',
              rendu: (a) => (a.date_avenant ? fr(a.date_avenant).format('D MMM YYYY') : <span className="text-muted-foreground">—</span>),
            },
            { cle: 'objet', titre: 'Objet', rendu: (a) => <span className="line-clamp-2">{a.objet}</span> },
            {
              cle: 'montant',
              titre: 'Montant',
              className: 'w-40 text-right tabular-nums',
              rendu: (a) => formatMontant(a.montant),
            },
            ...(peutModifier
              ? [
                  {
                    cle: 'actions',
                    titre: <span className="sr-only">Actions</span>,
                    className: 'w-20',
                    rendu: (a: Avenant) => (
                      <ActionsLigne>
                        <BoutonModifier libelle={`Modifier l'avenant ${a.reference}`} onClick={() => setAvenantEnEdition(a)} />
                        <BoutonSuppression
                          libelle={`Supprimer l'avenant ${a.reference}`}
                          titre="Supprimer cet avenant ?"
                          enCours={remove.isPending}
                          onConfirmer={(fermer) => remove.mutate(a.id, { onSuccess: fermer })}
                        >
                          <p>
                            L'avenant <strong>{a.reference}</strong> sera supprimé, ainsi que ses effets sur le budget et les
                            livrables du projet.
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
      <AvenantFormModal
        open={avenantEnEdition !== null}
        projetId={projetId}
        avenant={avenantEnEdition === 'nouveau' ? null : avenantEnEdition}
        onClose={() => setAvenantEnEdition(null)}
      />
    </Card>
  );
}
