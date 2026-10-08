import { Archive, FolderTree } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { PageHeader } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { useDossiers } from '../../hooks/ged/useDossiers';
import { useProfile } from '../../hooks/useProfile';
import type { Document } from '../../services/ged/documents';
import { ArchivesContent } from './ArchivesContent';
import { ArchivesToolbar, type TriArchives, type VueArchives } from './ArchivesToolbar';
import { ArchivesTreePanel } from './ArchivesTreePanel';
import { DocumentPreviewModal } from './DocumentPreviewModal';

// Explorateur documentaire "Archives" (GED V2, refonte inspirée de Google
// Drive) : plan de classement à gauche (navigation seule, aucune gestion —
// cf. Administration > Paramétrage et le panneau Classement), contenu du
// dossier sélectionné à droite (sous-dossiers puis documents en cartes),
// recherche globale, prévisualisation et téléchargement tracés.
export function ArchivesPage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const { data: dossiers } = useDossiers(organisationId);

  const [dossierSelectionneId, setDossierSelectionneId] = useState<string | null>(null);
  const [saisie, setSaisie] = useState('');
  const [texteRecherche, setTexteRecherche] = useState('');
  const [vue, setVue] = useState<VueArchives>('grille');
  const [tri, setTri] = useState<TriArchives>('nom');
  const [documentAffiche, setDocumentAffiche] = useState<Document | null>(null);
  const [arbreMobileOuvert, setArbreMobileOuvert] = useState(false);

  // La recherche interroge le serveur (fn_rechercher_documents) : on attend
  // une courte pause de frappe plutôt qu'un appel par caractère.
  useEffect(() => {
    const t = setTimeout(() => setTexteRecherche(saisie), 300);
    return () => clearTimeout(t);
  }, [saisie]);

  if (!organisationId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const naviguer = (id: string | null) => {
    setDossierSelectionneId(id);
    setSaisie('');
    setTexteRecherche('');
    setArbreMobileOuvert(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        retour={{ vers: '/ged', libelle: 'Gestion documentaire' }}
        titre="Archives"
        description="Documents archivés, rangés selon le plan de classement"
        actions={
          <>
            <Button variant="outline" className="lg:hidden" onClick={() => setArbreMobileOuvert((o) => !o)} aria-expanded={arbreMobileOuvert}>
              <FolderTree className="text-muted-foreground" />
              Dossiers
            </Button>
            {can('ged', 'consulter') && (
              <Button variant="outline" onClick={() => navigate('/ged/archivage')}>
                <Archive className="text-muted-foreground" />
                Archivage
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[280px_1fr]">
        <aside
          className={`${arbreMobileOuvert ? 'block' : 'hidden'} rounded-xl border border-border bg-card p-2 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100svh-8rem)] lg:overflow-y-auto`}
        >
          <ArchivesTreePanel organisationId={organisationId} dossierSelectionneId={dossierSelectionneId} onSelectionner={naviguer} />
        </aside>

        <div className="min-w-0 space-y-4">
          <ArchivesToolbar
            dossiers={dossiers ?? []}
            dossierSelectionneId={dossierSelectionneId}
            onNaviguer={naviguer}
            texteRecherche={saisie}
            onChangeRecherche={setSaisie}
            vue={vue}
            onChangeVue={setVue}
            tri={tri}
            onChangeTri={setTri}
          />

          <ArchivesContent
            organisationId={organisationId}
            dossierSelectionneId={dossierSelectionneId}
            onNaviguerDossier={(id) => setDossierSelectionneId(id)}
            texteRecherche={texteRecherche}
            vue={vue}
            tri={tri}
            onOuvrirDocument={setDocumentAffiche}
          />
        </div>
      </div>

      <DocumentPreviewModal document={documentAffiche} onClose={() => setDocumentAffiche(null)} />
    </div>
  );
}
