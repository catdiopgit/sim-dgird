import { Forward } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import {
  useEntitesImputables,
  useImputerCourrier,
  useTransitionsDisponiblesCourrier,
} from '../../hooks/courrier/useWorkflow';
import type { Courrier } from '../../services/courrier/courriers';

interface Props {
  courrier: Courrier;
  organisationId: string;
  peutModifier: boolean;
}

// Panneau dédié à l'imputation (plan V3 §6/§E) : distinct de la mise en copie
// (CourrierDestinataires) — impute réellement le courrier à une entité/agent
// (met à jour courriers.entite_id/agent_destinataire_id) et peut déclencher
// dans la foulée une transition de workflow (typiquement "affecter").
export function CourrierImputationPanel({ courrier, organisationId, peutModifier }: Props) {
  const { data: entites } = useEntitesImputables();
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: transitionsDisponibles } = useTransitionsDisponiblesCourrier(courrier.id);
  const imputer = useImputerCourrier(courrier.id);

  const [entiteId, setEntiteId] = useState(courrier.entite_id ?? '');
  const [agentId, setAgentId] = useState(courrier.agent_destinataire_id ?? '');
  const [instruction, setInstruction] = useState('');
  const [echeance, setEcheance] = useState('');
  const [transitionId, setTransitionId] = useState('');

  if (!peutModifier) return null;

  const onImputer = () => {
    if (!entiteId) return;
    imputer.mutate(
      {
        p_entite_id: entiteId,
        p_agent_id: agentId || null,
        p_instruction: instruction || null,
        p_echeance: echeance || null,
        p_transition_id: transitionId || null,
      },
      {
        onSuccess: () => {
          setInstruction('');
          setEcheance('');
          setTransitionId('');
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Imputation</CardTitle>
          <CardDescription className="mt-1">
            Affecte le courrier à l'entité (et éventuellement l'agent) chargée du dossier. Seules les entités de votre
            périmètre hiérarchique sont proposées.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="imputation-entite" className="mb-1.5 block text-[13px] font-medium">
              Entité <span className="text-crit-text">*</span>
            </label>
            <NativeSelect id="imputation-entite" value={entiteId} onChange={(e) => setEntiteId(e.target.value)}>
              <option value="">Choisir l'entité</option>
              {(entites ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.libelle}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label htmlFor="imputation-agent" className="mb-1.5 block text-[13px] font-medium">
              Agent <span className="font-normal text-muted-foreground">(facultatif)</span>
            </label>
            <NativeSelect id="imputation-agent" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">—</option>
              {(utilisateurs ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="imputation-instruction" className="mb-1.5 block text-[13px] font-medium">
              Instruction
            </label>
            <Input
              id="imputation-instruction"
              placeholder="Action demandée"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="imputation-echeance" className="mb-1.5 block text-[13px] font-medium">
              Échéance
            </label>
            <Input id="imputation-echeance" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
          </div>
          <div>
            <label htmlFor="imputation-transition" className="mb-1.5 block text-[13px] font-medium">
              Action de workflow associée <span className="font-normal text-muted-foreground">(facultatif)</span>
            </label>
            <NativeSelect id="imputation-transition" value={transitionId} onChange={(e) => setTransitionId(e.target.value)}>
              <option value="">Aucune</option>
              {(transitionsDisponibles ?? []).map((t) => (
                <option key={t.transition_id} value={t.transition_id}>
                  {t.libelle_action}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={onImputer} disabled={!entiteId || imputer.isPending}>
            <Forward />
            {imputer.isPending ? 'Imputation…' : 'Imputer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
