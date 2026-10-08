import { Ellipsis, FileSearch, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/form/confirm-dialog';
import { Button } from '../../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { EtatVide, PageHeader } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { TabBar } from '../../components/ui/tab-bar';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { usePeutModifierProjet } from '../../hooks/projets/usePeutModifierProjet';
import { useProjet, useProjetMutations, useProjetsReferentiel } from '../../hooks/projets/useProjets';
import { useProfile } from '../../hooks/useProfile';
import { fr } from '../../utils/dateFr';
import { BadgeCloture, BadgeValeur, BarreAvancement } from './projetAffichage';
import { ProjetAvenantsTab } from './ProjetAvenantsTab';
import { ProjetClotureTab } from './ProjetClotureTab';
import { ProjetDecaissementsTab } from './ProjetDecaissementsTab';
import { ProjetDocumentsTab } from './ProjetDocumentsTab';
import { ProjetFormModal } from './ProjetFormModal';
import { ProjetHistoriqueTab } from './ProjetHistoriqueTab';
import { ProjetInformationsTab } from './ProjetInformationsTab';
import { ProjetLivrablesTab } from './ProjetLivrablesTab';
import { ProjetMembresTab } from './ProjetMembresTab';
import { ProjetVueEnsembleTab } from './ProjetVueEnsembleTab';

type Onglet =
  | 'vue-ensemble'
  | 'informations'
  | 'livrables'
  | 'decaissements'
  | 'membres'
  | 'documents'
  | 'avenants'
  | 'historique'
  | 'cloture';

const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: 'vue-ensemble', libelle: "Vue d'ensemble" },
  { cle: 'informations', libelle: 'Informations' },
  { cle: 'livrables', libelle: 'Livrables' },
  { cle: 'decaissements', libelle: 'Décaissements' },
  { cle: 'membres', libelle: 'Membres' },
  { cle: 'documents', libelle: 'Documents' },
  { cle: 'avenants', libelle: 'Avenants' },
  { cle: 'historique', libelle: 'Historique' },
  { cle: 'cloture', libelle: 'Clôture' },
];

export function ProjetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  // L'onglet actif vit dans l'URL (?onglet=livrables) : lien direct et
  // retour arrière cohérents.
  const [searchParams, setSearchParams] = useSearchParams();
  const ongletUrl = searchParams.get('onglet');
  const onglet: Onglet = ONGLETS.some((o) => o.cle === ongletUrl) ? (ongletUrl as Onglet) : 'vue-ensemble';

  const { data: projet, isLoading, isError } = useProjet(id);
  const { data: referentiel } = useProjetsReferentiel(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { remove: supprimerProjet } = useProjetMutations(organisationId);
  const peutModifier = usePeutModifierProjet(projet, profile?.id, can);

  const [editionProjetOuverte, setEditionProjetOuverte] = useState(false);
  const [suppressionOuverte, setSuppressionOuverte] = useState(false);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const statutParId = useMemo(() => new Map((referentiel?.statuts ?? []).map((v) => [v.id, v])), [referentiel]);
  const prioriteParId = useMemo(() => new Map((referentiel?.priorites ?? []).map((v) => [v.id, v])), [referentiel]);

  if (isLoading || !organisationId) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError || !projet) {
    return (
      <EtatVide icone={FileSearch} titre="Projet introuvable" description="Ce projet n'existe pas ou vous n'y avez pas accès.">
        <Button onClick={() => navigate('/projets')}>Retour aux projets</Button>
      </EtatVide>
    );
  }

  const peutSupprimer = can('projets', 'supprimer', projet.entite_id);
  const peutDemanderCloture = projet.responsable_id === profile?.id;
  const cloture = projet.cloture_statut === 'confirmee';

  const changerOnglet = (cle: Onglet) =>
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (cle === 'vue-ensemble') p.delete('onglet');
        else p.set('onglet', cle);
        return p;
      },
      { replace: true },
    );

  const periode = [
    projet.date_debut ? `du ${fr(projet.date_debut).format('D MMM YYYY')}` : null,
    projet.date_fin_prevue ? `au ${fr(projet.date_fin_prevue).format('D MMM YYYY')}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-5">
      <PageHeader
        retour={{ vers: '/projets', libelle: 'Projets' }}
        surtitre={
          <>
            <span className="font-mono text-[12px]">{projet.code}</span>
            <BadgeValeur valeur={projet.statut_valeur_id ? statutParId.get(projet.statut_valeur_id) : null} />
            {projet.priorite_valeur_id && <BadgeValeur valeur={prioriteParId.get(projet.priorite_valeur_id)} />}
            <BadgeCloture statut={projet.cloture_statut} />
          </>
        }
        titre={projet.nom}
        description={[
          entiteParId.get(projet.entite_id),
          projet.responsable_id ? `Responsable : ${utilisateurParId.get(projet.responsable_id) ?? '—'}` : null,
          periode || null,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <>
            {peutModifier && (
              <Button variant="outline" onClick={() => setEditionProjetOuverte(true)}>
                <Pencil className="text-muted-foreground" />
                Modifier
              </Button>
            )}
            {peutSupprimer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Plus d'actions">
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onSelect={() => setSuppressionOuverte(true)}>
                    <Trash2 />
                    Supprimer le projet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      <div className="max-w-xl">
        <div className="mb-1.5 flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Avancement global (calculé à partir des livrables)</span>
        </div>
        <BarreAvancement pct={projet.avancement_pct} />
      </div>

      <TabBar label="Sections du projet" onglets={ONGLETS} actif={onglet} onChange={changerOnglet} />

      <div>
        {onglet === 'vue-ensemble' && (
          <ProjetVueEnsembleTab projet={projet} referentiel={referentiel} entiteParId={entiteParId} utilisateurParId={utilisateurParId} />
        )}
        {onglet === 'informations' && (
          <ProjetInformationsTab
            projet={projet}
            organisationId={organisationId}
            peutModifier={peutModifier}
            entiteParId={entiteParId}
            utilisateurParId={utilisateurParId}
            entites={entites}
            utilisateurs={utilisateurs}
          />
        )}
        {onglet === 'livrables' && (
          <ProjetLivrablesTab
            projetId={projet.id}
            organisationId={organisationId}
            peutModifier={peutModifier}
            referentiel={referentiel}
            utilisateurParId={utilisateurParId}
            cloture={cloture}
          />
        )}
        {onglet === 'decaissements' && (
          <ProjetDecaissementsTab
            projetId={projet.id}
            peutModifier={peutModifier}
            cloture={cloture}
            budgetPrevu={projet.budget_prevu}
            utilisateurParId={utilisateurParId}
          />
        )}
        {onglet === 'membres' && (
          <ProjetMembresTab
            projetId={projet.id}
            organisationId={organisationId}
            peutModifier={peutModifier}
            referentiel={referentiel}
            utilisateurParId={utilisateurParId}
          />
        )}
        {onglet === 'documents' && (
          <ProjetDocumentsTab projetId={projet.id} peutModifier={peutModifier} referentiel={referentiel} utilisateurParId={utilisateurParId} />
        )}
        {onglet === 'avenants' && <ProjetAvenantsTab projetId={projet.id} peutModifier={peutModifier} />}
        {onglet === 'historique' && <ProjetHistoriqueTab projetId={projet.id} utilisateurParId={utilisateurParId} />}
        {onglet === 'cloture' && (
          <ProjetClotureTab projet={projet} peutDemander={peutDemanderCloture} utilisateurParId={utilisateurParId} />
        )}
      </div>

      <ConfirmDialog
        open={suppressionOuverte}
        onClose={() => setSuppressionOuverte(false)}
        titre="Supprimer ce projet ?"
        libelleConfirmer="Supprimer"
        destructif
        enCours={supprimerProjet.isPending}
        onConfirmer={() => supprimerProjet.mutate(projet.id, { onSuccess: () => navigate('/projets') })}
      >
        <p>
          Le projet <b>{projet.code}</b> — {projet.nom} sera supprimé.
        </p>
      </ConfirmDialog>

      <ProjetFormModal
        open={editionProjetOuverte}
        organisationId={organisationId}
        projet={projet}
        onClose={() => setEditionProjetOuverte(false)}
      />
    </div>
  );
}
