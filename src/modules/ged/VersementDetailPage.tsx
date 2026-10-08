import { ChevronRight, FilePlus, FileSearch, FileText, Info, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Confirmation } from '../../components/form/confirm-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { NativeSelect } from '../../components/ui/native-select';
import { EtatVide, PageHeader } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { useDocumentsVersement } from '../../hooks/ged/useDocuments';
import { useDossiers, useOptionsDossiersGed } from '../../hooks/ged/useDossiers';
import { useModifierVersement, useSoumettreVersement, useVersement } from '../../hooks/ged/useVersements';
import { useProfile } from '../../hooks/useProfile';
import { fr } from '../../utils/dateFr';
import { ClassementPanel } from './ClassementPanel';
import { DocumentAjouterModal } from './DocumentAjouterModal';
import { StatutVersement } from './gedAffichage';
import { GedWorkflowPanel } from './GedWorkflowPanel';

export function VersementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const { data: versement, isLoading, isError } = useVersement(id);
  const { data: documents, isLoading: chargementDocuments } = useDocumentsVersement(id);
  const { data: dossiers } = useDossiers(organisationId);
  const optionsDossiers = useOptionsDossiersGed(organisationId);
  const soumettre = useSoumettreVersement(id);
  const modifier = useModifierVersement(id);
  const [ajouterOuvert, setAjouterOuvert] = useState(false);

  const dossierParId = useMemo(() => new Map((dossiers ?? []).map((d) => [d.id, d.libelle])), [dossiers]);

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

  const peutModifier = versement.redacteur_id === profile?.id || can('ged', 'modifier', versement.entite_id);
  const peutClasser = can('ged', 'modifier', versement.entite_id) && versement.etape_code === 'classement';
  const dossierCibleLibelle = versement.dossier_cible_id ? (dossierParId.get(versement.dossier_cible_id) ?? null) : null;
  const peutChoisirDossier = (versement.brouillon && peutModifier) || peutClasser;
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
            {versement.brouillon && peutModifier && (
              <Button variant="outline" onClick={() => setAjouterOuvert(true)}>
                <FilePlus className="text-muted-foreground" />
                Ajouter un document
              </Button>
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
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <div>
                  <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                    <label htmlFor="dossier-cible">Dossier de classement cible</label>
                  </dt>
                  <dd className="mt-1 text-[14px]">
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
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Documents</dt>
                  <dd className="mt-1 text-[14px] tabular-nums">{nbDocuments}</dd>
                </div>
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
                  {(documents ?? []).map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/ged/documents/${d.id}`)}
                        className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left hover:bg-muted/60"
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
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {peutClasser && (
            <ClassementPanel
              organisationId={organisationId}
              documents={documents ?? []}
              dossierCibleId={versement.dossier_cible_id}
              dossierCibleLibelle={dossierCibleLibelle}
            />
          )}
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
