import { FolderTree } from 'lucide-react';
import { EtatVide, PageHeader } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { useProfile } from '../../hooks/useProfile';
import { PlanClassementManager } from '../administration/parametrage/PlanClassementManager';

// v8.6 : accès direct au plan de classement depuis la GED, pour l'archiviste
// (qui n'a pas forcément accès à l'Administration).
export function PlanClassementPage() {
  const { profile, canEtendu } = useProfile();
  const organisationId = profile?.organisation_id;
  const peutModifier = canEtendu('ged', 'archiver') || canEtendu('administration', 'modifier');

  if (!organisationId) return <Skeleton className="h-64 w-full" />;
  if (!peutModifier) {
    return <EtatVide icone={FolderTree} titre="Accès réservé" description="Le plan de classement est géré par l'archiviste." />;
  }
  return (
    <div className="space-y-5">
      <PageHeader
        retour={{ vers: '/ged', libelle: 'Gestion documentaire' }}
        titre="Plan de classement"
        description="Séries, sous-séries et dossiers de classement des archives"
      />
      <PlanClassementManager organisationId={organisationId} peutModifier={peutModifier} />
    </div>
  );
}
