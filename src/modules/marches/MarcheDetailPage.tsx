import { CircleCheck, Ellipsis, FileSearch, Pencil, Printer, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/form/confirm-dialog';
import { Button } from '../../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Encart } from '../../components/ui/encart';
import { EtatVide, PageHeader } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { TabBar } from '../../components/ui/tab-bar';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useMarche, useMarcheMutations, useVerifierClotureMarche } from '../../hooks/marches/useMarches';
import { useMarcheCandidats } from '../../hooks/marches/useMarcheCandidats';
import { usePeutModifierMarche } from '../../hooks/marches/usePeutModifierMarche';
import { useTypesMarche } from '../../hooks/marches/useTypesMarche';
import { useProfile } from '../../hooks/useProfile';
import { BadgeStatutMarche } from './marcheAffichage';
import { MarcheAttributionTab } from './MarcheAttributionTab';
import { MarcheCandidatsTab } from './MarcheCandidatsTab';
import { MarcheDocumentsTab } from './MarcheDocumentsTab';
import { MarcheFormModal } from './MarcheFormModal';
import { MarchePhasesTab } from './MarchePhasesTab';
import { MarcheSituationImprimable } from './MarcheSituationImprimable';
import { MarcheVueEnsembleTab } from './MarcheVueEnsembleTab';

type Onglet = 'vue-ensemble' | 'phases' | 'documents' | 'candidats' | 'attribution';

const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: 'vue-ensemble', libelle: "Vue d'ensemble" },
  { cle: 'phases', libelle: 'Phases' },
  { cle: 'documents', libelle: 'Documents' },
  { cle: 'candidats', libelle: 'Entreprises et consultants' },
  { cle: 'attribution', libelle: 'Attribution' },
];

export function MarcheDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  // L'onglet actif vit dans l'URL (?onglet=phases) : lien direct et retour
  // arrière cohérents.
  const [searchParams, setSearchParams] = useSearchParams();
  const ongletUrl = searchParams.get('onglet');
  const onglet: Onglet = ONGLETS.some((o) => o.cle === ongletUrl) ? (ongletUrl as Onglet) : 'vue-ensemble';

  const { data: marche, isLoading, isError } = useMarche(id);
  const { data: types } = useTypesMarche();
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: candidats } = useMarcheCandidats(id);
  const { data: controlesCloture } = useVerifierClotureMarche(id);
  const { remove: supprimerMarche, cloturer } = useMarcheMutations();
  const peutModifier = usePeutModifierMarche(marche, profile?.id, can);

  const [editionOuverte, setEditionOuverte] = useState(false);
  const [impressionOuverte, setImpressionOuverte] = useState(false);
  const [clotureOuverte, setClotureOuverte] = useState(false);
  const [suppressionOuverte, setSuppressionOuverte] = useState(false);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const typeParId = useMemo(() => new Map((types ?? []).map((t) => [t.id, t.libelle])), [types]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const candidatParId = useMemo(() => new Map((candidats ?? []).map((c) => [c.id, c.nom])), [candidats]);

  if (isLoading || !organisationId) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError || !marche) {
    return (
      <EtatVide icone={FileSearch} titre="Marché introuvable" description="Ce marché n'existe pas ou vous n'y avez pas accès.">
        <Button onClick={() => navigate('/marches')}>Retour aux marchés</Button>
      </EtatVide>
    );
  }

  const peutSupprimer = can('marches', 'supprimer', marche.entite_id);
  const peutCloturer = can('marches', 'valider', marche.entite_id) && marche.statut_cloture !== 'cloture';
  const blocagesCloture = (controlesCloture ?? []).filter((c) => c.bloquant);
  const cloture = marche.statut_cloture === 'cloture';

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

  return (
    <div className="space-y-5">
      <PageHeader
        retour={{ vers: '/marches', libelle: 'Marchés' }}
        surtitre={
          <>
            <span className="font-mono text-[12px]">{marche.reference}</span>
            <BadgeStatutMarche statut={marche.statut_cloture} />
          </>
        }
        titre={marche.objet}
        description={[typeParId.get(marche.type_marche_id), entiteParId.get(marche.entite_id)].filter(Boolean).join(' · ')}
        actions={
          <>
            <Button variant="outline" onClick={() => setImpressionOuverte(true)}>
              <Printer className="text-muted-foreground" />
              Imprimer la situation
            </Button>
            {peutModifier && (
              <Button variant="outline" onClick={() => setEditionOuverte(true)}>
                <Pencil className="text-muted-foreground" />
                Modifier
              </Button>
            )}
            {peutCloturer && (
              <Button
                onClick={() => setClotureOuverte(true)}
                disabled={blocagesCloture.length > 0 || cloturer.isPending}
                title={blocagesCloture.length > 0 ? 'Des blocages existent, voir ci-dessous.' : undefined}
              >
                <CircleCheck />
                Clôturer le marché
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
                    Supprimer le marché
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      {peutCloturer && blocagesCloture.length > 0 && (
        <Encart variante="attention" titre="Clôture impossible pour le moment">
          <ul className="list-disc space-y-0.5 pl-4">
            {blocagesCloture.map((c) => (
              <li key={c.code}>{c.message}</li>
            ))}
          </ul>
        </Encart>
      )}

      <TabBar label="Sections du marché" onglets={ONGLETS} actif={onglet} onChange={changerOnglet} />

      <div>
        {onglet === 'vue-ensemble' && (
          <MarcheVueEnsembleTab
            marche={marche}
            entiteParId={entiteParId}
            typeParId={typeParId}
            utilisateurParId={utilisateurParId}
            candidatParId={candidatParId}
          />
        )}
        {onglet === 'phases' && <MarchePhasesTab marcheId={marche.id} peutModifier={peutModifier} cloture={cloture} />}
        {onglet === 'documents' && <MarcheDocumentsTab marcheId={marche.id} peutModifier={peutModifier} />}
        {onglet === 'candidats' && <MarcheCandidatsTab marcheId={marche.id} peutModifier={peutModifier} />}
        {onglet === 'attribution' && <MarcheAttributionTab marcheId={marche.id} peutModifier={peutModifier} />}
      </div>

      <ConfirmDialog
        open={clotureOuverte}
        onClose={() => setClotureOuverte(false)}
        titre="Clôturer ce marché ?"
        libelleConfirmer="Clôturer"
        enCours={cloturer.isPending}
        onConfirmer={() => cloturer.mutate(marche.id, { onSuccess: () => setClotureOuverte(false) })}
      >
        <p>
          Le marché <b>{marche.reference}</b> — {marche.objet} sera clôturé.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={suppressionOuverte}
        onClose={() => setSuppressionOuverte(false)}
        titre="Supprimer ce marché ?"
        libelleConfirmer="Supprimer"
        destructif
        enCours={supprimerMarche.isPending}
        onConfirmer={() => supprimerMarche.mutate(marche.id, { onSuccess: () => navigate('/marches') })}
      >
        <p>
          Le marché <b>{marche.reference}</b> — {marche.objet} sera supprimé.
        </p>
      </ConfirmDialog>

      <MarcheFormModal open={editionOuverte} organisationId={organisationId} marche={marche} onClose={() => setEditionOuverte(false)} />
      <MarcheSituationImprimable
        open={impressionOuverte}
        marche={marche}
        entiteParId={entiteParId}
        typeParId={typeParId}
        utilisateurParId={utilisateurParId}
        candidatParId={candidatParId}
        onClose={() => setImpressionOuverte(false)}
      />
    </div>
  );
}
