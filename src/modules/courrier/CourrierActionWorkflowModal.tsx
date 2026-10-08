import dayjs from 'dayjs';
import { Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { ListeCases } from '../../components/ui/checkbox';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useCourrierReferentiel } from '../../hooks/courrier/useCourriers';
import {
  useEntitesImputables,
  useEntitesTransmissibles,
  useImputerCourrier,
  usePersonnesTransmissibles,
} from '../../hooks/courrier/useWorkflow';
import type { Courrier } from '../../services/courrier/courriers';
import type { TypeActionCourrier } from '../../services/courrier/workflow';

interface Props {
  open: boolean;
  onClose: () => void;
  courrier: Courrier;
  organisationId: string;
  typeAction: TypeActionCourrier;
  transitionId: string;
}

const LIBELLE_ACTION: Record<TypeActionCourrier, string> = {
  imputation: 'Imputation',
  affectation: 'Affectation',
  transmission: 'Transmission',
  redirection: 'Redirection',
};

// Fenêtre modale d'action de workflow (Version 5 §3-§9), calquée sur
// documentation/imputation.png : « Imputer à » (entité, ou personne de la
// hiérarchie pour transmission/redirection — l'entité de rattachement est
// alors dérivée automatiquement), « En copie » (entités, multi-sélection),
// « Actions demandées » (référentiel administrable, multi-sélection),
// Priorité, Date limite, Observation. Un seul composant réutilisé pour les
// 4 types d'action — la distinction technique (transmission ne réaffecte
// pas l'entité en charge, cf. fn_imputer_courrier) est gérée côté serveur.
export function CourrierActionWorkflowModal({
  open,
  onClose,
  courrier,
  organisationId,
  typeAction,
  transitionId,
}: Props) {
  const estTransmissionOuRedirection = typeAction === 'transmission' || typeAction === 'redirection';

  const { data: entitesImputables } = useEntitesImputables();
  const { data: entitesTransmissibles } = useEntitesTransmissibles();
  const { data: personnesTransmissibles } = usePersonnesTransmissibles();
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: entitesOrganisation } = useEntites(organisationId);
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const imputer = useImputerCourrier(courrier.id);

  // « Imputer à » : entités du périmètre d'affectation (imputation/
  // affectation) ou de transmission (transmission/redirection), + personnes
  // de la hiérarchie pour ces deux derniers.
  const entitesCibles = estTransmissionOuRedirection ? entitesTransmissibles : entitesImputables;
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const entiteParIdOrganisation = useMemo(
    () => new Map((entitesOrganisation ?? []).map((e) => [e.id, e.libelle])),
    [entitesOrganisation],
  );

  // Agents affectables pour imputation/affectation : tout membre d'une entité du
  // périmètre d'affectation (entitesImputables), pas seulement son responsable —
  // contrairement à personnesTransmissibles (0044), pensé pour transmission/
  // redirection (redirige vers un responsable/supérieur hiérarchique précis, pas
  // n'importe quel agent). Permet de couvrir le 3ᵉ cas demandé (§ imputation V5) :
  // soi-même, un sous-service, ou un agent de sa propre direction.
  const entitesImputablesIds = useMemo(
    () => new Set((entitesImputables ?? []).map((e) => e.id)),
    [entitesImputables],
  );
  const agentsImputables = useMemo(
    () => (utilisateurs ?? []).filter((u) => u.entiteId && entitesImputablesIds.has(u.entiteId)),
    [utilisateurs, entitesImputablesIds],
  );

  const [cibleValeur, setCibleValeur] = useState('');
  const [entitesCopieIds, setEntitesCopieIds] = useState<string[]>([]);
  const [actionsDemandeesIds, setActionsDemandeesIds] = useState<string[]>([]);
  const [prioriteValeurId, setPrioriteValeurId] = useState(courrier.priorite_valeur_id ?? '');
  const [dateLimite, setDateLimite] = useState('');
  const [observation, setObservation] = useState('');

  const reinitialiser = () => {
    setCibleValeur('');
    setEntitesCopieIds([]);
    setActionsDemandeesIds([]);
    setPrioriteValeurId(courrier.priorite_valeur_id ?? '');
    setDateLimite('');
    setObservation('');
  };

  const fermer = () => {
    onClose();
    reinitialiser();
  };

  const onValider = () => {
    if (!cibleValeur) return;
    const [type, id] = cibleValeur.split(':');
    let entiteId: string;
    let agentId: string | null = null;
    if (type === 'personne') {
      if (estTransmissionOuRedirection) {
        const personne = (personnesTransmissibles ?? []).find((p) => p.utilisateur_id === id);
        if (!personne) return;
        entiteId = personne.entite_id;
      } else {
        const agent = agentsImputables.find((u) => u.id === id);
        if (!agent?.entiteId) return;
        entiteId = agent.entiteId;
      }
      agentId = id;
    } else {
      entiteId = id;
    }

    imputer.mutate(
      {
        p_entite_id: entiteId,
        p_agent_id: agentId,
        p_instruction: observation || null,
        p_echeance: dateLimite || null,
        p_transition_id: transitionId,
        p_type_action: typeAction,
        p_entites_copie_ids: entitesCopieIds.length > 0 ? entitesCopieIds : null,
        p_actions_demandees_ids: actionsDemandeesIds.length > 0 ? actionsDemandeesIds : null,
        p_priorite_valeur_id: prioriteValeurId || null,
      },
      { onSuccess: fermer },
    );
  };

  const libelle = LIBELLE_ACTION[typeAction];

  return (
    <FormDialog
      open={open}
      onClose={fermer}
      titre={libelle}
      description={`${courrier.numero} — ${courrier.objet}`}
      onSubmit={(e) => {
        e.preventDefault();
        onValider();
      }}
      enCours={imputer.isPending}
      validerDesactive={!cibleValeur}
      libelleValider={`Valider l'${libelle.toLowerCase()}`}
      largeur="lg"
    >
      <Champ label={estTransmissionOuRedirection ? 'Transmettre à' : 'Imputer à'} htmlFor="action-cible" requis>
        <NativeSelect id="action-cible" autoFocus value={cibleValeur} onChange={(e) => setCibleValeur(e.target.value)}>
          <option value="">Choisir l'entité ou {estTransmissionOuRedirection ? 'la personne' : "l'agent"}</option>
          <optgroup label="Entités">
            {(entitesCibles ?? []).map((e) => (
              <option key={e.id} value={`entite:${e.id}`}>
                {e.libelle}
              </option>
            ))}
          </optgroup>
          {estTransmissionOuRedirection && (personnesTransmissibles ?? []).length > 0 && (
            <optgroup label="Personnes">
              {(personnesTransmissibles ?? []).map((p) => (
                <option key={p.utilisateur_id} value={`personne:${p.utilisateur_id}`}>
                  {utilisateurParId.get(p.utilisateur_id) ?? p.utilisateur_id} ({entiteParIdOrganisation.get(p.entite_id) ?? '—'})
                </option>
              ))}
            </optgroup>
          )}
          {!estTransmissionOuRedirection && agentsImputables.length > 0 && (
            <optgroup label="Agents">
              {agentsImputables.map((u) => (
                <option key={u.id} value={`personne:${u.id}`}>
                  {u.prenom} {u.nom} ({entiteParIdOrganisation.get(u.entiteId!) ?? '—'})
                </option>
              ))}
            </optgroup>
          )}
        </NativeSelect>
      </Champ>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ label="En copie" htmlFor="action-copie" aide={entitesCopieIds.length > 0 ? `${entitesCopieIds.length} entité(s) sélectionnée(s)` : undefined}>
          <ListeCases
            id="action-copie"
            options={(entitesImputables ?? []).map((e) => ({ valeur: e.id, libelle: e.libelle }))}
            valeurs={entitesCopieIds}
            onChange={setEntitesCopieIds}
            vide="Aucune entité disponible"
          />
        </Champ>
        <Champ label="Actions demandées" htmlFor="action-demandees">
          <ListeCases
            id="action-demandees"
            options={(referentiel?.actionsDemandees ?? []).map((v) => ({ valeur: v.id, libelle: v.libelle }))}
            valeurs={actionsDemandeesIds}
            onChange={setActionsDemandeesIds}
            vide="Aucune action configurée (Administration › Paramétrage › Listes de valeurs)."
          />
        </Champ>
        <Champ label="Priorité" htmlFor="action-priorite">
          <NativeSelect id="action-priorite" value={prioriteValeurId} onChange={(e) => setPrioriteValeurId(e.target.value)}>
            <option value="">—</option>
            {(referentiel?.priorites ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.libelle}
              </option>
            ))}
          </NativeSelect>
        </Champ>
        <Champ label="Date limite" htmlFor="action-date-limite">
          <Input
            id="action-date-limite"
            type="date"
            min={dayjs().format('YYYY-MM-DD')}
            value={dateLimite}
            onChange={(e) => setDateLimite(e.target.value)}
          />
        </Champ>
      </div>

      <Champ label="Observation" htmlFor="action-observation">
        <Textarea
          id="action-observation"
          rows={2}
          placeholder="Instruction ou observation concernant cette action"
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
        />
      </Champ>

      {typeAction === 'transmission' && (
        <div className="flex gap-2.5 rounded-lg bg-info/10 p-3 text-[13px]">
          <Info className="mt-0.5 size-4 shrink-0 text-info" />
          La transmission conserve le circuit initial : l'entité actuellement en charge du dossier n'est pas modifiée.
        </div>
      )}
    </FormDialog>
  );
}
