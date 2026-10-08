import { FileSearch, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { EtatVide, PageHeader } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { useEntites } from '../../hooks/administration/useEntites';
import { useTracerConsultation } from '../../hooks/ged/useConsultations';
import { useDocument } from '../../hooks/ged/useDocuments';
import { useDossiers } from '../../hooks/ged/useDossiers';
import { useConfidentialitesGed } from '../../hooks/ged/useGedReferentiel';
import { useVersement } from '../../hooks/ged/useVersements';
import { useProfile } from '../../hooks/useProfile';
import { couleurReferentiel } from '../../utils/couleurReferentiel';
import { fr } from '../../utils/dateFr';
import { estConfidentiel } from '../courrier/courrierAffichage';
import { DocumentDroitsPanel } from './DocumentDroitsPanel';
import { DocumentVersionsPanel } from './DocumentVersionsPanel';

function Ligne({ label, children, pleine }: { label: string; children: ReactNode; pleine?: boolean }) {
  return (
    <div className={pleine ? 'sm:col-span-2' : undefined}>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[14px]">{children ?? '—'}</dd>
    </div>
  );
}

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const { data: document, isLoading, isError } = useDocument(id);
  const { data: versement } = useVersement(document?.versement_id ?? undefined);
  const { data: entites } = useEntites(organisationId);
  const { data: dossiers } = useDossiers(organisationId);
  const { data: confidentialites } = useConfidentialitesGed(organisationId);
  useTracerConsultation(document?.id);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const dossierParId = useMemo(() => new Map((dossiers ?? []).map((d) => [d.id, d.libelle])), [dossiers]);
  const confidentialiteParId = useMemo(
    () => new Map((confidentialites ?? []).map((c) => [c.id, c])),
    [confidentialites],
  );

  if (isLoading || !organisationId) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !document) {
    return (
      <EtatVide icone={FileSearch} titre="Document introuvable" description="Ce document n'existe pas ou vous n'y avez pas accès.">
        <Button onClick={() => navigate('/ged')}>Retour à la GED</Button>
      </EtatVide>
    );
  }

  const peutGererDroits = can('ged', 'modifier', document.entite_id);
  const confidentialite = document.confidentialite_valeur_id
    ? confidentialiteParId.get(document.confidentialite_valeur_id)
    : null;
  const motsCles = document.mots_cles ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        retour={
          document.versement_id
            ? { vers: `/ged/versements/${document.versement_id}`, libelle: 'Retour au versement' }
            : { vers: '/ged/archives', libelle: 'Archives' }
        }
        surtitre={
          <>
            <span className="font-medium">Document</span>
            {versement?.etape_libelle && (
              <Badge variant="muted" shape="pill">
                {versement.etape_libelle}
              </Badge>
            )}
            {confidentialite && (
              <Badge variant={estConfidentiel(confidentialite.code) ? 'warning' : 'outline'} shape="pill">
                {estConfidentiel(confidentialite.code) ? (
                  <Lock />
                ) : (
                  <span className="size-2 rounded-full" style={{ background: couleurReferentiel(confidentialite.couleur) ?? 'var(--st-neutral)' }} />
                )}
                {confidentialite.libelle}
              </Badge>
            )}
          </>
        }
        titre={document.titre}
        description={`Versé le ${fr(document.date_versement).format('D MMMM YYYY')}${document.dossier_id ? ` · ${dossierParId.get(document.dossier_id) ?? ''}` : ' · non classé'}`}
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <Ligne label="Versement">
                {versement ? (
                  <Link to={`/ged/versements/${versement.id}`} className="text-primary hover:underline">
                    {versement.objet}
                  </Link>
                ) : undefined}
              </Ligne>
              <Ligne label="Dossier">{document.dossier_id ? (dossierParId.get(document.dossier_id) ?? '—') : 'Non classé'}</Ligne>
              <Ligne label="Entité">{document.entite_id ? entiteParId.get(document.entite_id) : undefined}</Ligne>
              <Ligne label="Date de versement">{fr(document.date_versement).format('D MMMM YYYY')}</Ligne>
              <Ligne label="Mots-clés" pleine>
                {motsCles.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {motsCles.map((m) => (
                      <Badge key={m} variant="muted">
                        {m}
                      </Badge>
                    ))}
                  </span>
                ) : undefined}
              </Ligne>
              <Ligne label="Description" pleine>
                {document.description ? <p className="whitespace-pre-line">{document.description}</p> : undefined}
              </Ligne>
            </dl>
          </CardContent>
        </Card>

        <DocumentVersionsPanel documentId={document.id} versionCouranteId={document.version_courante_id} />

        {peutGererDroits && (
          <div className="xl:col-span-2">
            <DocumentDroitsPanel documentId={document.id} organisationId={organisationId} />
          </div>
        )}
      </div>
    </div>
  );
}
