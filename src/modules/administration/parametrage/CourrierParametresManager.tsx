import { LoaderCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Champ } from '../../../components/form/champ';
import { Encart } from '../../../components/ui/encart';
import { NativeSelect } from '../../../components/ui/native-select';
import { EnTeteSection } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { useEntites } from '../../../hooks/administration/useEntites';
import {
  useParametreOrganisationMutations,
  useParametresOrganisation,
} from '../../../hooks/administration/useParametrage';
import { useModulesActions } from '../../../hooks/administration/useRolesAdmin';
import { useWorkflowDefinitions, useWorkflowEtapes } from '../../../hooks/administration/useWorkflowsAdmin';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

const CLE_ENTITE_DESTINATAIRE_INITIALE = 'courrier.entite_destinataire_initiale_id';
const CLE_ETAPE_APRES_ENREGISTREMENT_ENTRANT = 'courrier.etape_apres_enregistrement_entrant_id';

// Réglages enregistrés dès le changement de sélection (paramètres
// d'organisation, upsert), comme auparavant : pas de bouton Enregistrer.
export function CourrierParametresManager({ organisationId, peutModifier }: Props) {
  const { data: entites, isLoading: entitesEnCours } = useEntites(organisationId);
  const { data: parametres, isLoading: parametresEnCours } = useParametresOrganisation(organisationId);
  const { upsert } = useParametreOrganisationMutations(organisationId);
  const { modules } = useModulesActions();
  const moduleCourrierId = useMemo(
    () => modules.data?.find((m) => m.code === 'courrier')?.id,
    [modules.data],
  );
  const { data: definitions, isLoading: definitionsEnCours } = useWorkflowDefinitions(
    organisationId,
    moduleCourrierId,
  );
  // Doit correspondre exactement à la définition que WorkflowEngineService.demarrerWorkflow
  // sélectionne à l'enregistrement (organisation_id + module_id + est_defaut + actif) : si
  // plusieurs workflows existent pour le module courrier, prendre le premier de la liste
  // (triée par code) peut désigner un workflow différent de celui réellement démarré, et
  // l'étape choisie ci-dessous serait alors rejetée par deplacerVersEtapeInitialeEntrant.
  const workflowDefinitionId =
    definitions?.find((d) => d.est_defaut && d.actif)?.id ?? definitions?.[0]?.id;
  const { data: etapes, isLoading: etapesEnCours } = useWorkflowEtapes(workflowDefinitionId);

  const entiteDestinataireInitiale = useMemo(() => {
    const p = (parametres ?? []).find((p) => p.cle === CLE_ENTITE_DESTINATAIRE_INITIALE);
    const valeur = p?.valeur;
    return typeof valeur === 'string' ? valeur : undefined;
  }, [parametres]);

  const etapeApresEnregistrementEntrant = useMemo(() => {
    const p = (parametres ?? []).find((p) => p.cle === CLE_ETAPE_APRES_ENREGISTREMENT_ENTRANT);
    const valeur = p?.valeur;
    return typeof valeur === 'string' ? valeur : undefined;
  }, [parametres]);

  const etapesTriees = useMemo(
    () => [...(etapes ?? [])].sort((a, b) => a.ordre - b.ordre),
    [etapes],
  );

  if (entitesEnCours || parametresEnCours || definitionsEnCours) return <Skeleton className="h-80 w-full" />;

  const enregistrement = upsert.isPending && (
    <span className="ml-2 inline-flex items-center gap-1 text-[12px] font-normal text-muted-foreground">
      <LoaderCircle className="size-3.5 animate-spin" />
      Enregistrement…
    </span>
  );

  return (
    <div className="max-w-2xl space-y-8">
      <section>
        <EnTeteSection titre="Routage des courriers arrivés" />
        <Encart titre="Entité destinataire initiale" className="mb-4">
          À l'enregistrement d'un courrier arrivé, aucune entité, service, bureau ou agent n'est demandé. Le courrier est
          routé automatiquement vers l'entité choisie ci-dessous ; l'affectation définitive (imputation) se fait ensuite
          via le workflow.
        </Encart>
        <Champ
          label={<>Entité destinataire initiale{enregistrement}</>}
          htmlFor="courrier-entite-initiale"
          aide={
            !entiteDestinataireInitiale
              ? "Sans entité configurée, un courrier arrivé reste « non imputé » jusqu'à sa première imputation manuelle."
              : "Enregistré dès la sélection."
          }
        >
          <NativeSelect
            id="courrier-entite-initiale"
            className="sm:max-w-sm"
            disabled={!peutModifier || upsert.isPending}
            value={entiteDestinataireInitiale ?? ''}
            onChange={(e) =>
              upsert.mutate({
                cle: CLE_ENTITE_DESTINATAIRE_INITIALE,
                valeur: e.target.value || null,
                description: "Entité vers laquelle router automatiquement un courrier arrivé à l'enregistrement.",
              })
            }
          >
            <option value="">Aucune (non imputé)</option>
            {(entites ?? []).map((en) => (
              <option key={en.id} value={en.id}>
                {en.libelle}
              </option>
            ))}
          </NativeSelect>
        </Champ>
      </section>

      <section>
        <EnTeteSection titre="Étape après enregistrement (courriers arrivés)" />
        <Encart variante="attention" titre="Réglage obligatoire" className="mb-4">
          Étape du workflow sur laquelle un courrier arrivé est positionné juste après son enregistrement. Tant qu'aucune
          étape n'est choisie, l'enregistrement d'un courrier arrivé est refusé.
        </Encart>
        <Champ
          label={<>Étape après enregistrement{enregistrement}</>}
          htmlFor="courrier-etape-initiale"
          requis
          erreur={
            !etapeApresEnregistrementEntrant
              ? "Aucune étape configurée : l'enregistrement de tout nouveau courrier arrivé échouera."
              : undefined
          }
        >
          <NativeSelect
            id="courrier-etape-initiale"
            className="sm:max-w-sm"
            disabled={!peutModifier || upsert.isPending || etapesEnCours}
            aria-invalid={!etapeApresEnregistrementEntrant}
            aria-describedby={!etapeApresEnregistrementEntrant ? 'courrier-etape-initiale-erreur' : undefined}
            value={etapeApresEnregistrementEntrant ?? ''}
            onChange={(e) => {
              if (!e.target.value) return;
              upsert.mutate({
                cle: CLE_ETAPE_APRES_ENREGISTREMENT_ENTRANT,
                valeur: e.target.value,
                description:
                  "Étape du workflow sur laquelle un courrier arrivé est positionné juste après son enregistrement.",
              });
            }}
          >
            {!etapeApresEnregistrementEntrant && <option value="">Choisir une étape</option>}
            {etapesTriees.map((et) => (
              <option key={et.id} value={et.id}>
                {et.libelle}
              </option>
            ))}
          </NativeSelect>
        </Champ>
      </section>
    </div>
  );
}
