import { Printer } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { useOrganisation } from '../../hooks/administration/useOrganisation';
import { useDocumentsMarche } from '../../hooks/marches/useDocumentsMarche';
import { useMarcheAttribution } from '../../hooks/marches/useMarcheAttribution';
import { usePhasesMarche } from '../../hooks/marches/usePhasesMarche';
import type { Marche } from '../../services/marches/marches';
import type { PhaseMarcheAvecStatut } from '../../services/marches/phasesMarche';
import { dateCourte, montantFcfa } from './marcheAffichage';
import { LIBELLES_STATUT_PHASE } from './statutPhase';

interface Props {
  open: boolean;
  marche: Marche;
  entiteParId: Map<string, string>;
  typeParId: Map<string, string>;
  utilisateurParId: Map<string, string>;
  candidatParId: Map<string, string>;
  onClose: () => void;
}

const ecart = (phase: PhaseMarcheAvecStatut) => {
  if (phase.ecart_jours == null) return '—';
  if (phase.ecart_jours === 0) return 'À temps';
  return phase.ecart_jours > 0 ? `+${phase.ecart_jours} j (retard)` : `${phase.ecart_jours} j (avance)`;
};

// Styles fixes de la feuille (pas de tokens de thème : le papier reste blanc),
// identiques à la fiche d'exploitation des courriers.
const TABLE = 'w-full border-collapse text-[12.5px]';
const TH = 'border border-[#b9bdb6] bg-[#f1f2ee] px-2 py-1.5 text-left font-semibold';
const TH_LIGNE = 'w-36 border border-[#b9bdb6] bg-[#f1f2ee] px-2 py-1.5 text-left align-top font-semibold';
const TD = 'border border-[#b9bdb6] px-2 py-1.5 align-top';

// §17 « Imprimer la situation du marché » — sortie professionnelle et
// institutionnelle, même mécanisme que FicheExploitationModal côté Courriers :
// window.print() + CSS @media print isolant .zone-imprimable.
export function MarcheSituationImprimable({ open, marche, entiteParId, typeParId, utilisateurParId, candidatParId, onClose }: Props) {
  const { data: organisation } = useOrganisation(marche.organisation_id);
  const { data: phases, isLoading } = usePhasesMarche(marche.id);
  const { data: attribution } = useMarcheAttribution(marche.id);
  const { data: documents } = useDocumentsMarche(marche.id);

  const phasesAvecJustificatif = new Set((documents ?? []).filter((d) => d.phase_marche_id).map((d) => d.phase_marche_id));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Situation du marché</DialogTitle>
          <DialogDescription>Aperçu du document à imprimer.</DialogDescription>
        </DialogHeader>
        <DialogBody className="bg-muted/50">
          <div className="rounded-lg bg-white p-6 text-[13px] text-[#161a18] shadow-sm ring-1 ring-black/5">
            {isLoading ? (
              <Skeleton className="h-72 w-full bg-black/10" />
            ) : (
              <div className="zone-imprimable">
                <div className="mb-4 flex items-center gap-3">
                  {organisation?.logo_url && <img src={organisation.logo_url} alt="" className="h-12 object-contain" />}
                  <div>
                    <div className="font-semibold">{organisation?.nom ?? ''}</div>
                    <div className="text-[12px] text-[#5f6661]">Situation du marché — {marche.reference}</div>
                  </div>
                </div>

                <h3 className="mb-1.5 text-[14px] font-semibold">Informations générales</h3>
                <table className={TABLE}>
                  <tbody>
                    <tr>
                      <th className={TH_LIGNE}>Référence</th>
                      <td className={TD}>{marche.reference}</td>
                      <th className={TH_LIGNE}>Objet</th>
                      <td className={TD}>{marche.objet}</td>
                    </tr>
                    <tr>
                      <th className={TH_LIGNE}>Type</th>
                      <td className={TD}>{typeParId.get(marche.type_marche_id) ?? '—'}</td>
                      <th className={TH_LIGNE}>Responsable</th>
                      <td className={TD}>{marche.responsable_id ? (utilisateurParId.get(marche.responsable_id) ?? '—') : '—'}</td>
                    </tr>
                    <tr>
                      <th className={TH_LIGNE}>Entité porteuse</th>
                      <td className={TD}>{entiteParId.get(marche.entite_id) ?? '—'}</td>
                      <th className={TH_LIGNE}>Statut</th>
                      <td className={TD}>{marche.statut_cloture === 'cloture' ? 'Clôturé' : 'En cours'}</td>
                    </tr>
                    <tr>
                      <th className={TH_LIGNE}>Début prévisionnel</th>
                      <td className={TD}>{dateCourte(marche.date_debut_prevue)}</td>
                      <th className={TH_LIGNE}>Fin prévisionnelle</th>
                      <td className={TD}>{dateCourte(marche.date_fin_prevue)}</td>
                    </tr>
                  </tbody>
                </table>

                <h3 className="mb-1.5 mt-5 text-[14px] font-semibold">Planification et réalisation</h3>
                <table className={TABLE}>
                  <thead>
                    <tr>
                      <th className={TH}>Phase</th>
                      <th className={TH}>Durée prévue</th>
                      <th className={TH}>Début prévu</th>
                      <th className={TH}>Fin prévue</th>
                      <th className={TH}>Début réel</th>
                      <th className={TH}>Fin réelle</th>
                      <th className={TH}>Écart</th>
                      <th className={TH}>Statut</th>
                      <th className={TH}>Justificatif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(phases ?? []).length === 0 ? (
                      <tr>
                        <td className={`${TD} text-center text-[#5f6661]`} colSpan={9}>
                          Aucune phase planifiée
                        </td>
                      </tr>
                    ) : (
                      (phases ?? []).map((p) => (
                        <tr key={p.id}>
                          <td className={TD}>{p.nom}</td>
                          <td className={TD}>
                            {p.duree_prevue} {p.unite_duree}(s)
                          </td>
                          <td className={TD}>{dateCourte(p.date_debut_prevue)}</td>
                          <td className={TD}>{dateCourte(p.date_fin_prevue)}</td>
                          <td className={TD}>{dateCourte(p.date_debut_reelle)}</td>
                          <td className={TD}>{dateCourte(p.date_fin_reelle)}</td>
                          <td className={TD}>{ecart(p)}</td>
                          <td className={TD}>{LIBELLES_STATUT_PHASE[p.statut_calcule]}</td>
                          <td className={TD}>{phasesAvecJustificatif.has(p.id) ? 'Oui' : 'Non'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <h3 className="mb-1.5 mt-5 text-[14px] font-semibold">Attribution</h3>
                <table className={TABLE}>
                  <tbody>
                    <tr>
                      <th className={TH_LIGNE}>Attributaire</th>
                      <td className={TD}>{attribution ? (candidatParId.get(attribution.candidat_attributaire_id) ?? '—') : 'Non attribué'}</td>
                      <th className={TH_LIGNE}>Montant</th>
                      <td className={TD}>{montantFcfa(attribution?.montant_attribue)}</td>
                    </tr>
                    <tr>
                      <th className={TH_LIGNE}>Date d'attribution</th>
                      <td className={TD}>{dateCourte(attribution?.date_attribution)}</td>
                      <th className={TH_LIGNE}>Observations</th>
                      <td className={TD}>{attribution?.observations ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={() => window.print()}>
            <Printer />
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
