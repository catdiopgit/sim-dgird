import { Alert, Select, Skeleton, Typography } from 'antd';
import { useMemo } from 'react';
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

  if (entitesEnCours || parametresEnCours || definitionsEnCours) return <Skeleton active />;

  return (
    <div>
      <Typography.Title level={5}>Routage des courriers arrivés</Typography.Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, maxWidth: 640 }}
        message="Entité destinataire initiale"
        description={
          <>
            À l'enregistrement d'un courrier arrivé, aucune entité/service/bureau/agent n'est
            demandé à l'utilisateur. Le courrier est automatiquement routé vers l'entité
            sélectionnée ci-dessous. L'affectation définitive (imputation à l'entité/l'agent
            réellement chargé du dossier) se fait ensuite via le workflow.
          </>
        }
      />
      <Select
        style={{ width: 360 }}
        placeholder="Choisir l'entité destinataire initiale"
        allowClear
        disabled={!peutModifier}
        value={entiteDestinataireInitiale}
        loading={upsert.isPending}
        options={(entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))}
        onChange={(entiteId) =>
          upsert.mutate({
            cle: CLE_ENTITE_DESTINATAIRE_INITIALE,
            valeur: entiteId ?? null,
            description: "Entité vers laquelle router automatiquement un courrier arrivé à l'enregistrement.",
          })
        }
      />
      {!entiteDestinataireInitiale && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, maxWidth: 640 }}>
          Tant qu'aucune entité n'est configurée ici, un courrier arrivé enregistré sans entité
          explicite reste « non imputé » jusqu'à sa première imputation manuelle.
        </Typography.Paragraph>
      )}

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Étape après enregistrement (courriers arrivés)
      </Typography.Title>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16, maxWidth: 640 }}
        message="Étape associée après l'enregistrement du courrier d'arrivée"
        description={
          <>
            Étape du workflow sur laquelle un courrier arrivé est automatiquement positionné juste
            après son enregistrement. <strong>Obligatoire</strong> : tant qu'aucune étape n'est
            sélectionnée ici, l'enregistrement d'un courrier arrivé est refusé.
          </>
        }
      />
      <Select
        style={{ width: 360 }}
        placeholder="Choisir l'étape après enregistrement"
        disabled={!peutModifier}
        loading={etapesEnCours || upsert.isPending}
        value={etapeApresEnregistrementEntrant}
        options={etapesTriees.map((e) => ({ value: e.id, label: e.libelle }))}
        onChange={(etapeId) =>
          upsert.mutate({
            cle: CLE_ETAPE_APRES_ENREGISTREMENT_ENTRANT,
            valeur: etapeId,
            description:
              "Étape du workflow sur laquelle un courrier arrivé est positionné juste après son enregistrement.",
          })
        }
      />
      {!etapeApresEnregistrementEntrant && (
        <Typography.Paragraph type="danger" style={{ marginTop: 8, maxWidth: 640 }}>
          Aucune étape n'est configurée : l'enregistrement de tout nouveau courrier arrivé échouera
          tant que ce champ n'est pas renseigné.
        </Typography.Paragraph>
      )}
    </div>
  );
}
