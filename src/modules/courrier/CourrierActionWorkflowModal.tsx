import dayjs from 'dayjs';
import { Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { ListeCases } from '../../components/ui/checkbox';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useCourrierReferentiel } from '../../hooks/courrier/useCourriers';
import { useDestinataires } from '../../hooks/courrier/useDestinataires';
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
  const { data: destinataires } = useDestinataires(open ? courrier.id : undefined);

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
  // « En copie » mélange entités et personnes : valeurs préfixées entite:/personne:.
  const [copieValeurs, setCopieValeurs] = useState<string[]>([]);
  const [actionsDemandeesIds, setActionsDemandeesIds] = useState<string[]>([]);
  const [prioriteValeurId, setPrioriteValeurId] = useState(courrier.priorite_valeur_id ?? '');
  const [dateLimite, setDateLimite] = useState('');
  const [observation, setObservation] = useState('');

  // Date limite proposée = échéance de l'étape précédente (ex. celle fixée par
  // le DG à l'imputation), modifiable. Seulement si elle n'est pas dépassée.
  const echeancePrecedente = useMemo(() => {
    const avecEcheance = (destinataires ?? []).filter((d) => d.type_diffusion === 'principal' && d.echeance);
    const derniere = avecEcheance.at(-1)?.echeance ?? '';
    return derniere && !dayjs(derniere).isBefore(dayjs(), 'day') ? derniere.slice(0, 10) : '';
  }, [destinataires]);
  useEffect(() => {
    if (open && echeancePrecedente) setDateLimite((actuelle) => actuelle || echeancePrecedente);
  }, [open, echeancePrecedente]);

  const reinitialiser = () => {
    setCibleValeur('');
    setCopieValeurs([]);
    setActionsDemandeesIds([]);
    setPrioriteValeurId(courrier.priorite_valeur_id ?? '');
    setDateLimite('');
    setObservation('');
  };

  const fermer = () => {
    onClose();
    reinitialiser();
  };

  const idsCopie = (prefixe: 'entite' | 'personne') =>
    copieValeurs.filter((v) => v.startsWith(`${prefixe}:`)).map((v) => v.slice(prefixe.length + 1));

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
        p_entites_copie_ids: idsCopie('entite').length > 0 ? idsCopie('entite') : null,
        p_utilisateurs_copie_ids: idsCopie('personne').length > 0 ? idsCopie('personne') : null,
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
      <Champ
        label={estTransmissionOuRedirection ? 'Transmettre à' : typeAction === 'affectation' ? 'Affecter à' : 'Imputer à'}
        htmlFor="action-cible"
        requis
      >
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
        <Champ
          label="En copie"
          htmlFor="action-copie"
          aide={copieValeurs.length > 0 ? `${copieValeurs.length} destinataire(s) en copie` : 'Entités ou personnes'}
        >
          <ListeCases
            id="action-copie"
            options={[
              ...(entitesImputables ?? []).map((e) => ({ valeur: `entite:${e.id}`, libelle: e.libelle })),
              ...agentsImputables
                .filter((u) => `personne:${u.id}` !== cibleValeur)
                .map((u) => ({
                  valeur: `personne:${u.id}`,
                  libelle: `${u.prenom} ${u.nom} (${entiteParIdOrganisation.get(u.entiteId!) ?? '—'})`,
                })),
            ]}
            valeurs={copieValeurs}
            onChange={setCopieValeurs}
            vide="Aucun destinataire disponible"
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
