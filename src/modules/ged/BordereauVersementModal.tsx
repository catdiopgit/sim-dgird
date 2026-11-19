import { Printer } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useEnteteDocument } from '../../hooks/administration/useEnteteDocument';
import { useOrganisation } from '../../hooks/administration/useOrganisation';
import { useDossiers } from '../../hooks/ged/useDossiers';
import type { Document } from '../../services/ged/documents';
import type { GedVersement } from '../../services/ged/versements';
import { imprimerZone } from '../../utils/imprimer';
import { EnteteDocumentImprime } from '../courrier/EnteteDocumentImprime';

interface Props {
  open: boolean;
  onClose: () => void;
  organisationId: string;
  versement: GedVersement;
  documents: Document[];
}

const date = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

// v8.6.4 — Bordereau de versement imprimable (A4) : toutes les informations
// saisies au versement, l'entité versante, le classement attribué par
// l'archiviste, la liste des documents et les cadres de signature.
export function BordereauVersementModal({ open, onClose, organisationId, versement, documents }: Props) {
  const { data: organisation } = useOrganisation(organisationId);
  const entete = useEnteteDocument(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: dossiers } = useDossiers(organisationId);
  const feuilleRef = useRef<HTMLDivElement>(null);

  const entite = useMemo(() => (entites ?? []).find((e) => e.id === versement.entite_id), [entites, versement.entite_id]);
  const deposant = useMemo(() => {
    const u = (utilisateurs ?? []).find((x) => x.id === versement.redacteur_id);
    return u ? `${u.prenom} ${u.nom}` : '—';
  }, [utilisateurs, versement.redacteur_id]);
  const dossierParId = useMemo(() => new Map((dossiers ?? []).map((d) => [d.id, d])), [dossiers]);
  const emplacement = versement.dossier_cible_id ? dossierParId.get(versement.dossier_cible_id) : undefined;

  const cellule: React.CSSProperties = { border: '1px solid #000', padding: '3px 6px', fontSize: 12, verticalAlign: 'top' };
  const entetes: React.CSSProperties = { ...cellule, background: '#f1f2ee', fontWeight: 600, textAlign: 'left' };
  const libelle: React.CSSProperties = { ...entetes, width: 150 };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bordereau de versement</DialogTitle>
          <DialogDescription>Aperçu du bordereau à imprimer et à faire signer.</DialogDescription>
        </DialogHeader>
        <DialogBody className="bg-muted/50">
          <div ref={feuilleRef} className="rounded-lg bg-white p-6 text-[13px] text-[#161a18] shadow-sm ring-1 ring-black/5">
            <div className="zone-imprimable">
              <EnteteDocumentImprime organisation={organisation} entete={entete} titre="BORDEREAU DE VERSEMENT" />

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <th style={libelle}>Code d'archivage</th>
                    <td style={{ ...cellule, fontWeight: 700 }}>{versement.code_archivage || 'Attribué au classement'}</td>
                    <th style={libelle}>Étape</th>
                    <td style={cellule}>{versement.brouillon ? 'Brouillon' : (versement.etape_libelle ?? '—')}</td>
                  </tr>
                  <tr>
                    <th style={libelle}>Objet</th>
                    <td style={cellule} colSpan={3}>
                      {versement.objet}
                    </td>
                  </tr>
                  <tr>
                    <th style={libelle}>Direction versante</th>
                    <td style={cellule} colSpan={3}>
                      {entite ? `${entite.libelle}${entite.sigle ? ` (${entite.sigle})` : ''}` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <th style={libelle}>Déposant</th>
                    <td style={cellule}>{deposant}</td>
                    <th style={libelle}>Nombre de documents</th>
                    <td style={cellule}>{documents.length}</td>
                  </tr>
                  <tr>
                    <th style={libelle}>Date de début extrême</th>
                    <td style={cellule}>{date(versement.date_debut_extreme)}</td>
                    <th style={libelle}>Date de fin extrême</th>
                    <td style={cellule}>{date(versement.date_fin_extreme)}</td>
                  </tr>
                  <tr>
                    <th style={libelle}>Créé le</th>
                    <td style={cellule}>{date(versement.created_at)}</td>
                    <th style={libelle}>Soumis le</th>
                    <td style={cellule}>{date(versement.soumis_le)}</td>
                  </tr>
                  <tr>
                    <th style={libelle}>Classé le</th>
                    <td style={cellule}>{date(versement.classe_le)}</td>
                    <th style={libelle}>Archivé le</th>
                    <td style={cellule}>{date(versement.archive_le)}</td>
                  </tr>
                  <tr>
                    <th style={libelle}>Emplacement (plan)</th>
                    <td style={cellule} colSpan={3}>
                      {emplacement ? `${emplacement.code} — ${emplacement.libelle}` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <th style={libelle}>Description</th>
                    <td style={{ ...cellule, whiteSpace: 'pre-line' }} colSpan={3}>
                      {versement.description || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ fontSize: 13, fontWeight: 600, margin: '4px 0 6px' }}>Liste des documents versés</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ ...entetes, width: 36, textAlign: 'center' }}>N°</th>
                    <th style={entetes}>Titre du document</th>
                    <th style={{ ...entetes, width: 150 }}>Mots-clés</th>
                    <th style={{ ...entetes, width: 80 }}>Ajouté le</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length === 0 ? (
                    <tr>
                      <td style={{ ...cellule, textAlign: 'center' }} colSpan={4}>
                        Aucun document
                      </td>
                    </tr>
                  ) : (
                    documents.map((d, i) => (
                      <tr key={d.id}>
                        <td style={{ ...cellule, textAlign: 'center' }}>{i + 1}</td>
                        <td style={cellule}>{d.titre}</td>
                        <td style={cellule}>{(d.mots_cles ?? []).join(', ') || '—'}</td>
                        <td style={cellule}>{date(d.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <table className="bloc-insecable" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ ...entetes, textAlign: 'center' }}>Le déposant</th>
                    <th style={{ ...entetes, textAlign: 'center' }}>Le directeur de la direction versante</th>
                    <th style={{ ...entetes, textAlign: 'center' }}>L'archiviste</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ ...cellule, height: 90 }}>
                      <div>{deposant}</div>
                      <div style={{ marginTop: 50, fontSize: 11, color: '#5f6661' }}>Date et signature</div>
                    </td>
                    <td style={{ ...cellule, height: 90 }}>
                      <div style={{ marginTop: 66, fontSize: 11, color: '#5f6661' }}>Date et signature</div>
                    </td>
                    <td style={{ ...cellule, height: 90 }}>
                      <div style={{ marginTop: 66, fontSize: 11, color: '#5f6661' }}>Date et signature</div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#5f6661' }}>
                {entete.piedDePage || organisation?.code} — Bordereau édité le {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            onClick={() =>
              imprimerZone(
                feuilleRef.current?.querySelector<HTMLElement>('.zone-imprimable') ?? null,
                `Bordereau de versement ${versement.code_archivage ?? ''}`,
              )
            }
          >
            <Printer />
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
