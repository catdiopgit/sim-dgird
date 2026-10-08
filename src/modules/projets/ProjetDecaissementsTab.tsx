import { message } from '../../lib/notifications';
import { Download, Plus, Wallet } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { ouvrirFichier } from '../../config/apiClient';
import { ActionsLigne, BoutonSuppression } from '../../components/form/actions-ligne';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tableau } from '../../components/ui/tableau';
import { useAvenants } from '../../hooks/projets/useAvenants';
import { useDecaissementMutations, useDecaissements } from '../../hooks/projets/useDecaissements';
import { useDocumentsProjet } from '../../hooks/projets/useDocumentsProjet';
import { cn } from '../../lib/utils';
import { getUrlTelechargementDocument } from '../../services/projets/documents';
import type { Decaissement } from '../../services/projets/decaissements';
import { fr } from '../../utils/dateFr';
import { formatMontant } from '../../utils/format';
import { DecaissementFormModal } from './DecaissementFormModal';
import { BarreAvancement } from './projetAffichage';

interface Props {
  projetId: string;
  peutModifier: boolean;
  cloture: boolean;
  budgetPrevu: number | null;
  utilisateurParId: Map<string, string>;
}

function Indicateur({ libelle, valeur, detail, alerte }: { libelle: string; valeur: string; detail?: ReactNode; alerte?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-[12px] text-muted-foreground">{libelle}</div>
      <div className={cn('mt-1 text-[18px] font-semibold tabular-nums', alerte && 'text-crit-text')}>{valeur}</div>
      {detail && <div className="mt-2 text-[12px] text-muted-foreground">{detail}</div>}
    </div>
  );
}

// §2/§4/§5 Décaissements : origine (contrat d'origine ou avenant précis) et
// contrôles de cohérence par origine, appliqués côté serveur par
// app.fn_verifier_decaissement (0075) — l'UI se contente de relayer le
// message d'erreur si un cumul est dépassé.
export function ProjetDecaissementsTab({ projetId, peutModifier, cloture, budgetPrevu, utilisateurParId }: Props) {
  const { data: decaissements, isLoading } = useDecaissements(projetId);
  const { data: documents } = useDocumentsProjet(projetId);
  const { data: avenants } = useAvenants(projetId);
  const { remove: supprimer } = useDecaissementMutations(projetId);
  const [formOuvert, setFormOuvert] = useState(false);

  const documentParDecaissementId = useMemo(
    () => new Map((documents ?? []).filter((d) => d.decaissement_id).map((d) => [d.decaissement_id as string, d])),
    [documents],
  );
  const avenantParId = useMemo(() => new Map((avenants ?? []).map((a) => [a.id, a])), [avenants]);

  const cumulPct = useMemo(() => (decaissements ?? []).reduce((s, d) => s + d.pourcentage, 0), [decaissements]);
  const cumulMontant = useMemo(() => (decaissements ?? []).reduce((s, d) => s + d.montant, 0), [decaissements]);
  const solde = budgetPrevu != null ? budgetPrevu - cumulMontant : null;

  const cumulContrat = useMemo(
    () => (decaissements ?? []).filter((d) => !d.avenant_id).reduce((s, d) => s + d.montant, 0),
    [decaissements],
  );
  const cumulAvenants = useMemo(
    () => (decaissements ?? []).filter((d) => d.avenant_id).reduce((s, d) => s + d.montant, 0),
    [decaissements],
  );

  const nomOrigine = (d: Decaissement) => {
    if (!d.avenant_id) return "Contrat d'origine";
    return avenantParId.get(d.avenant_id)?.reference ?? 'Avenant';
  };

  const telecharger = async (decaissement: Decaissement) => {
    const document = documentParDecaissementId.get(decaissement.id);
    if (!document) {
      message.error('Aucun justificatif disponible.');
      return;
    }
    const url = await getUrlTelechargementDocument(document);
    if (!url) {
      message.error('Aucun fichier disponible pour ce justificatif.');
      return;
    }
    await ouvrirFichier(url);
  };

  const modifiable = peutModifier && !cloture;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Décaissements</CardTitle>
        {modifiable && (
          <Button variant="outline" size="sm" onClick={() => setFormOuvert(true)}>
            <Plus />
            Ajouter un décaissement
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Indicateur
            libelle="Cumul décaissé"
            valeur={`${cumulPct.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`}
            alerte={cumulPct > 100}
            detail={<BarreAvancement pct={cumulPct} />}
          />
          <Indicateur libelle="Montant cumulé" valeur={formatMontant(cumulMontant)} />
          <Indicateur
            libelle="Contrat d'origine / avenants"
            valeur={formatMontant(cumulContrat)}
            detail={`+ ${formatMontant(cumulAvenants)} sur avenants`}
          />
          <Indicateur
            libelle="Solde restant à décaisser"
            valeur={solde != null ? formatMontant(solde) : '—'}
            alerte={solde != null && solde < 0}
          />
        </div>

        <Tableau<Decaissement>
          libelle="Décaissements du projet"
          lignes={decaissements}
          cleLigne={(d) => d.id}
          chargement={isLoading}
          minLargeur={820}
          vide={{ icone: Wallet, titre: 'Aucun décaissement' }}
          colonnes={[
            {
              cle: 'date',
              titre: 'Date',
              className: 'w-28 whitespace-nowrap tabular-nums',
              rendu: (d) => fr(d.date_decaissement).format('D MMM YYYY'),
            },
            {
              cle: 'origine',
              titre: 'Origine',
              className: 'w-40',
              rendu: (d) => (
                <Badge variant={d.avenant_id ? 'outline' : 'muted'} shape="pill">
                  {nomOrigine(d)}
                </Badge>
              ),
            },
            {
              cle: 'pct',
              titre: 'Part',
              className: 'w-20 text-right tabular-nums',
              rendu: (d) => `${d.pourcentage.toLocaleString('fr-FR')} %`,
            },
            {
              cle: 'montant',
              titre: 'Montant',
              className: 'w-40 text-right tabular-nums',
              rendu: (d) => <span className="font-medium">{formatMontant(d.montant)}</span>,
            },
            {
              cle: 'depose',
              titre: 'Déposé par',
              className: 'w-40',
              rendu: (d) => (d.created_by ? (utilisateurParId.get(d.created_by) ?? '—') : '—'),
            },
            {
              cle: 'observations',
              titre: 'Observations',
              rendu: (d) => <span className="line-clamp-2 text-muted-foreground">{d.observations || '—'}</span>,
            },
            {
              cle: 'actions',
              titre: <span className="sr-only">Actions</span>,
              className: 'w-20',
              rendu: (d: Decaissement) => (
                <ActionsLigne>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => void telecharger(d)}
                    disabled={!documentParDecaissementId.has(d.id)}
                    aria-label="Télécharger le justificatif"
                    title={documentParDecaissementId.has(d.id) ? 'Justificatif' : 'Aucun justificatif'}
                  >
                    <Download />
                  </Button>
                  {modifiable && (
                    <BoutonSuppression
                      libelle={`Supprimer le décaissement du ${fr(d.date_decaissement).format('D MMMM YYYY')}`}
                      titre="Supprimer ce décaissement ?"
                      enCours={supprimer.isPending}
                      onConfirmer={(fermer) => supprimer.mutate(d.id, { onSuccess: fermer })}
                    >
                      <p>
                        Le décaissement de <strong>{formatMontant(d.montant)}</strong> du{' '}
                        {fr(d.date_decaissement).format('D MMMM YYYY')} sera supprimé et le solde recalculé.
                      </p>
                    </BoutonSuppression>
                  )}
                </ActionsLigne>
              ),
            },
          ]}
        />
      </CardContent>

      <DecaissementFormModal
        open={formOuvert}
        projetId={projetId}
        budgetPrevu={budgetPrevu}
        avenants={avenants}
        onClose={() => setFormOuvert(false)}
      />
    </Card>
  );
}
