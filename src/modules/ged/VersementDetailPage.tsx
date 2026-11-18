import { ChevronRight, Copy, FilePlus, FileSearch, FileText, Info, Printer, Send, Trash2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Confirmation } from '../../components/form/confirm-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { NativeSelect } from '../../components/ui/native-select';
import { EtatVide, PageHeader } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useDocumentsVersement } from '../../hooks/ged/useDocuments';
import { Input } from '../../components/ui/input';
import { useDossiers, useOptionsDossiersGed } from '../../hooks/ged/useDossiers';
import {
  useAnnulerVersement,
  useDoublonsVersement,
  useModifierVersement,
  useRetirerDocumentVersement,
  useSoumettreVersement,
  useVersement,
} from '../../hooks/ged/useVersements';
import { libelleDossier } from '../../services/ged/dossiers';
import { useProfile } from '../../hooks/useProfile';
import { fr } from '../../utils/dateFr';
import { BordereauVersementModal } from './BordereauVersementModal';
import { ClassementPanel } from './ClassementPanel';
import { DocumentAjouterModal } from './DocumentAjouterModal';
import { StatutVersement } from './gedAffichage';
import { GedWorkflowPanel } from './GedWorkflowPanel';

export function VersementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, canEtendu } = useProfile();
  const organisationId = profile?.organisation_id;
  // v8.6 : l'archiviste réceptionne, contrôle, classe et archive.
  const estArchiviste = canEtendu('ged', 'archiver');

  const { data: versement, isLoading, isError } = useVersement(id);
  const { data: documents, isLoading: chargementDocuments } = useDocumentsVersement(id);
  const { data: dossiers } = useDossiers(organisationId);
  const optionsDossiers = useOptionsDossiersGed(organisationId, versement?.dossier_cible_id ?? null);
  const soumettre = useSoumettreVersement(id);
  const modifier = useModifierVersement(id);
  const retirer = useRetirerDocumentVersement(id);
  const annuler = useAnnulerVersement(id);
  const { data: doublons } = useDoublonsVersement(id, Boolean(versement) && (!versement?.brouillon || estArchiviste));
  const [ajouterOuvert, setAjouterOuvert] = useState(false);
  const [bordereauOuvert, setBordereauOuvert] = useState(false);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);

  const dossierParId = useMemo(() => new Map((dossiers ?? []).map((d) => [d.id, libelleDossier(d)])), [dossiers]);

  if (isLoading || !organisationId) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !versement) {
    return (
      <EtatVide icone={FileSearch} titre="Versement introuvable" description="Ce versement n'existe pas ou vous n'y avez pas accès.">
        <Button onClick={() => navigate('/ged')}>Retour à la GED</Button>
      </EtatVide>
    );
  }

  // Brouillon : le déposant (ou « GED / modifier » étendu). Ensuite : l'archiviste.
  const peutModifier =
    versement.brouillon &&
    (versement.redacteur_id === profile?.id || canEtendu('ged', 'modifier', versement.entite_id) || estArchiviste);
  const peutClasser = estArchiviste && versement.etape_code === 'classement';
  const dossierCibleLibelle = versement.dossier_cible_id ? (dossierParId.get(versement.dossier_cible_id) ?? null) : null;
  const peutChoisirDossier = versement.brouillon && peutModifier;
  const entite = (entites ?? []).find((e) => e.id === versement.entite_id);
  const deposant = (utilisateurs ?? []).find((u) => u.id === versement.redacteur_id);
  const dateFr = (d: string | null | undefined) => (d ? fr(d).format('D MMMM YYYY') : '—');
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const nbDocuments = (documents ?? []).length;
  const peutSoumettre = versement.brouillon && peutModifier;

  return (
    <div className="space-y-5">
      <PageHeader
        retour={{ vers: '/ged', libelle: 'Gestion documentaire' }}
        surtitre={
          <>
            <span className="font-medium">Versement</span>
            <StatutVersement versement={versement} />
          </>
        }
        titre={versement.objet}
        description={`Créé le ${fr(versement.created_at).format('D MMMM YYYY')} · mis à jour le ${fr(versement.updated_at).format('D MMMM YYYY')}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setBordereauOuvert(true)}>
              <Printer className="text-muted-foreground" />
              Bordereau de versement
            </Button>
            {versement.brouillon && peutModifier && (
              <Button variant="outline" onClick={() => setAjouterOuvert(true)}>
                <FilePlus className="text-muted-foreground" />
                Ajouter un document
              </Button>
            )}
            {versement.brouillon && peutModifier && (
              <Confirmation
                titre="Annuler ce brouillon ?"
                libelleConfirmer="Annuler le brouillon"
                destructif
                enCours={annuler.isPending}
                onConfirmer={(fermer) =>
                  annuler.mutate(undefined, {
                    onSuccess: () => {
                      fermer();
                      navigate('/ged');
                    },
                  })
                }
                declencheur={(ouvrir) => (
                  <Button variant="outline" onClick={ouvrir}>
                    <XCircle className="text-muted-foreground" />
                    Annuler le brouillon
                  </Button>
                )}
              >
                <p>Le versement et ses documents seront retirés de la GED. Cette action est définitive.</p>
              </Confirmation>
            )}
            {peutSoumettre && (
              <Confirmation
                titre="Soumettre ce versement à l'archiviste ?"
                libelleConfirmer="Soumettre"
                enCours={soumettre.isPending}
                onConfirmer={(fermer) => soumettre.mutate(undefined, { onSuccess: fermer })}
                declencheur={(ouvrir) => (
                  <Button
                    onClick={ouvrir}
                    disabled={nbDocuments === 0 || soumettre.isPending}
                    title={nbDocuments === 0 ? 'Ajoutez au moins un document' : undefined}
                  >
                    <Send />
                    {soumettre.isPending ? 'Soumission…' : 'Soumettre'}
                  </Button>
                )}
              >
                <p>
                  {nbDocuments} document{nbDocuments > 1 ? 's' : ''} seront transmis pour validation et classement. Le
                  versement ne sera plus modifiable pendant l'examen.
                </p>
              </Confirmation>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_380px]">
        <div className="order-2 min-w-0 space-y-5 xl:order-1">
          {/* v8.6.4 : à l'étape de classement, le classement passe en tête. */}
          {peutClasser && (
            <ClassementPanel organisationId={organisationId} versement={versement} nbDocuments={nbDocuments} />
          )}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <Info2 libelle="Code d'archivage">
                  {versement.code_archivage ? (
                    <span className="font-mono font-semibold">{versement.code_archivage}</span>
                  ) : (
                    <span className="text-muted-foreground">Attribué par l'archiviste au classement</span>
                  )}
                </Info2>
                <Info2 libelle="Entité versante">
                  {entite ? `${entite.libelle}${entite.sigle ? ` (${entite.sigle})` : ''}` : '—'}
                </Info2>
                <Info2 libelle="Déposant">{deposant ? `${deposant.prenom} ${deposant.nom}` : '—'}</Info2>
                <Info2 libelle="Documents">
                  <span className="tabular-nums">{nbDocuments}</span>
                </Info2>
                <Info2 libelle="Date de début extrême" htmlFor={peutModifier ? 'date-debut' : undefined}>
                  {peutModifier ? (
                    <Input
                      id="date-debut"
                      type="date"
                      max={aujourdhui}
                      defaultValue={versement.date_debut_extreme ?? ''}
                      onBlur={(e) =>
                        e.target.value !== (versement.date_debut_extreme ?? '') &&
                        modifier.mutate({ date_debut_extreme: e.target.value || null })
                      }
                    />
                  ) : (
                    dateFr(versement.date_debut_extreme)
                  )}
                </Info2>
                <Info2 libelle="Date de fin extrême" htmlFor={peutModifier ? 'date-fin' : undefined}>
                  {peutModifier ? (
                    <Input
                      id="date-fin"
                      type="date"
                      max={aujourdhui}
                      defaultValue={versement.date_fin_extreme ?? ''}
                      onBlur={(e) =>
                        e.target.value !== (versement.date_fin_extreme ?? '') &&
                        modifier.mutate({ date_fin_extreme: e.target.value || null })
                      }
                    />
                  ) : (
                    dateFr(versement.date_fin_extreme)
                  )}
                </Info2>
                <Info2
                  libelle={versement.dossier_versement_id ? 'Emplacement dans le plan' : 'Dossier de classement proposé'}
                  htmlFor={peutChoisirDossier ? 'dossier-cible' : undefined}
                >
                  {peutChoisirDossier ? (
                    <NativeSelect
                      id="dossier-cible"
                      value={versement.dossier_cible_id ?? ''}
                      disabled={modifier.isPending}
                      onChange={(e) => modifier.mutate({ dossier_cible_id: e.target.value || null })}
                    >
                      <option value="">Aucun</option>
                      {optionsDossiers.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    (dossierCibleLibelle ?? '—')
                  )}
                </Info2>
                <Info2 libelle="Dossier du versement">
                  {versement.dossier_versement_id ? (dossierParId.get(versement.dossier_versement_id) ?? '—') : '—'}
                </Info2>
                <Info2 libelle="Créé le">{dateFr(versement.created_at)}</Info2>
                <Info2 libelle="Soumis le">{dateFr(versement.soumis_le)}</Info2>
                <Info2 libelle="Classé le">{dateFr(versement.classe_le)}</Info2>
                <Info2 libelle="Archivé le">{dateFr(versement.archive_le)}</Info2>
                <div className="sm:col-span-2">
                  <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Description</dt>
                  <dd className="mt-1 whitespace-pre-line text-[14px]">{versement.description || '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Documents du versement
                {nbDocuments > 0 && <span className="ml-2 font-normal text-muted-foreground">{nbDocuments}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chargementDocuments ? (
                <Skeleton className="h-24 w-full" />
              ) : nbDocuments === 0 ? (
                <div className="rounded-lg border border-dashed border-border">
                  <EtatVide
                    icone={FileText}
                    titre="Aucun document"
                    description={versement.brouillon ? 'Ajoutez au moins un document avant de soumettre le versement.' : undefined}
                  >
                    {versement.brouillon && peutModifier && (
                      <Button variant="outline" onClick={() => setAjouterOuvert(true)}>
                        <FilePlus />
                        Ajouter un document
                      </Button>
                    )}
                  </EtatVide>
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {(documents ?? []).map((d) => {
                    const autres = doublons?.[d.id] ?? [];
                    return (
                    <li key={d.id} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/ged/documents/${d.id}`)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-3 text-left hover:bg-muted/60"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                          <FileText className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{d.titre}</span>
                          <span className="block truncate text-[12px] text-muted-foreground">
                            {d.dossier_id ? (dossierParId.get(d.dossier_id) ?? '—') : 'Non classé'}
                          </span>
                        </span>
                        {autres.length > 0 && (
                          <Badge
                            variant="warning"
                            shape="pill"
                            className="shrink-0"
                            title={`Même fichier que : ${autres
                              .map((a) => (a.titre ? `« ${a.titre} »${a.archive ? ' (archivé)' : ''}` : 'un document non visible'))
                              .join(', ')}`}
                          >
                            <Copy className="mr-1 size-3" aria-hidden />
                            Doublon possible
                          </Badge>
                        )}
                        {(d.mots_cles ?? []).length > 0 && (
                          <span className="hidden max-w-[40%] flex-wrap justify-end gap-1 sm:flex">
                            {(d.mots_cles ?? []).slice(0, 3).map((m) => (
                              <Badge key={m} variant="muted">
                                {m}
                              </Badge>
                            ))}
                          </span>
                        )}
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                      {versement.brouillon && peutModifier && (
                        <Confirmation
                          titre="Retirer ce document du versement ?"
                          libelleConfirmer="Retirer"
                          destructif
                          enCours={retirer.isPending}
                          onConfirmer={(fermer) => retirer.mutate(d.id, { onSuccess: fermer })}
                          declencheur={(ouvrir) => (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="mr-2 size-8 shrink-0 text-muted-foreground"
                              onClick={ouvrir}
                              aria-label={`Retirer « ${d.titre} »`}
                              title="Retirer du versement"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        >
                          <p>« {d.titre} » et son fichier seront supprimés de ce brouillon.</p>
                        </Confirmation>
                      )}
                    </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Circuit : en tête sur écran étroit, colonne latérale collante sur grand écran. */}
        <div className="order-1 xl:sticky xl:top-24 xl:order-2">
          {versement.brouillon ? (
            <Card>
              <CardHeader>
                <CardTitle>Circuit de validation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 rounded-lg bg-muted/70 p-4 text-[13px]">
                  <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p>
                    Ce versement est un <b>brouillon</b>. Ajoutez vos documents puis soumettez-le : il sera transmis à
                    l'archiviste pour validation et classement.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <GedWorkflowPanel versement={versement} organisationId={organisationId} />
          )}
        </div>
      </div>

      <BordereauVersementModal
        open={bordereauOuvert}
        onClose={() => setBordereauOuvert(false)}
        organisationId={organisationId}
        versement={versement}
        documents={documents ?? []}
      />

      <DocumentAjouterModal
        open={ajouterOuvert}
        organisationId={organisationId}
        versementId={versement.id}
        onClose={() => setAjouterOuvert(false)}
        onAjoute={() => setAjouterOuvert(false)}
      />
    </div>
  );
}

function Info2({ libelle, htmlFor, children }: { libelle: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
        {htmlFor ? <label htmlFor={htmlFor}>{libelle}</label> : libelle}
      </dt>
      <dd className="mt-1 text-[14px]">{children}</dd>
    </div>
  );
}
