import { useQuery } from '@tanstack/react-query';
import { Building2, KeyRound, LoaderCircle, Plus, ShieldCheck, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BoutonSuppression } from '../../components/form/actions-ligne';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { NativeSelect } from '../../components/ui/native-select';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useRoles } from '../../hooks/administration/useUtilisateurs';
import { cn } from '../../lib/utils';
import { listActions } from '../../services/administration/permissions';
import {
  useDroitsDocument,
  useOctroyerDroitDocument,
  useRevoquerDroitDocument,
} from '../../hooks/ged/useDroitsGed';

interface Props {
  documentId: string;
  organisationId: string;
}

type TypeBeneficiaire = 'role' | 'utilisateur' | 'entite';

const TYPES: { valeur: TypeBeneficiaire; libelle: string }[] = [
  { valeur: 'role', libelle: 'Rôle' },
  { valeur: 'entite', libelle: 'Entité' },
  { valeur: 'utilisateur', libelle: 'Utilisateur' },
];

// Sous-ensemble pertinent pour un octroi document-par-document — les autres
// actions (creer/supprimer/exporter) se règlent au niveau rôle (Administration
// > Rôles), pas via un droit ponctuel sur un document.
const CODES_ACTIONS_DROIT = ['consulter', 'modifier', 'valider', 'archiver'];

export function DocumentDroitsPanel({ documentId, organisationId }: Props) {
  const { data: droits } = useDroitsDocument(documentId);
  const { data: roles } = useRoles(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: actions } = useQuery({ queryKey: ['actions'], queryFn: listActions, staleTime: 5 * 60_000 });
  const octroyer = useOctroyerDroitDocument(documentId);
  const revoquer = useRevoquerDroitDocument(documentId);

  const [typeBeneficiaire, setTypeBeneficiaire] = useState<TypeBeneficiaire>('role');
  const [beneficiaireId, setBeneficiaireId] = useState('');
  const [actionCode, setActionCode] = useState<string>('consulter');

  const actionsDroit = useMemo(
    () => (actions ?? []).filter((a) => CODES_ACTIONS_DROIT.includes(a.code)),
    [actions],
  );
  const actionParId = useMemo(() => new Map((actions ?? []).map((a) => [a.id, a.libelle])), [actions]);
  const roleParId = useMemo(() => new Map((roles ?? []).map((r) => [r.id, r.libelle])), [roles]);
  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  const optionsBeneficiaire =
    typeBeneficiaire === 'role'
      ? (roles ?? []).map((r) => ({ value: r.id, label: r.libelle }))
      : typeBeneficiaire === 'entite'
        ? (entites ?? []).map((e) => ({ value: e.id, label: e.libelle }))
        : (utilisateurs ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }));

  const beneficiaire = (droit: { role_id: string | null; utilisateur_id: string | null; entite_id: string | null }) => {
    if (droit.role_id) return { icone: ShieldCheck, type: 'Rôle', nom: roleParId.get(droit.role_id) ?? droit.role_id };
    if (droit.entite_id) return { icone: Building2, type: 'Entité', nom: entiteParId.get(droit.entite_id) ?? droit.entite_id };
    if (droit.utilisateur_id)
      return { icone: User, type: 'Utilisateur', nom: utilisateurParId.get(droit.utilisateur_id) ?? droit.utilisateur_id };
    return { icone: KeyRound, type: '', nom: '—' };
  };

  const octroyerDroit = () => {
    if (!beneficiaireId) return;
    octroyer.mutate(
      {
        p_action_code: actionCode,
        p_role_id: typeBeneficiaire === 'role' ? beneficiaireId : null,
        p_utilisateur_id: typeBeneficiaire === 'utilisateur' ? beneficiaireId : null,
        p_entite_id: typeBeneficiaire === 'entite' ? beneficiaireId : null,
      },
      { onSuccess: () => setBeneficiaireId('') },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Droits d'accès</CardTitle>
          <CardDescription className="mt-1">
            Droits ponctuels sur ce document, en plus de ceux hérités du dossier et des rôles.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 lg:flex-row lg:items-center">
          <div role="radiogroup" aria-label="Type de bénéficiaire" className="inline-flex shrink-0 rounded-lg bg-muted p-0.5">
            {TYPES.map((t) => (
              <button
                key={t.valeur}
                type="button"
                role="radio"
                aria-checked={typeBeneficiaire === t.valeur}
                onClick={() => {
                  setTypeBeneficiaire(t.valeur);
                  setBeneficiaireId('');
                }}
                className={cn(
                  'h-8 flex-1 cursor-pointer rounded-md px-3 text-[13px] font-medium transition-colors',
                  typeBeneficiaire === t.valeur ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.libelle}
              </button>
            ))}
          </div>
          <NativeSelect
            aria-label="Bénéficiaire"
            className="h-9 min-w-0 flex-1 bg-card text-[13px]"
            value={beneficiaireId}
            onChange={(e) => setBeneficiaireId(e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {optionsBeneficiaire.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Droit accordé"
            className="h-9 bg-card text-[13px] lg:w-40"
            value={actionCode}
            onChange={(e) => setActionCode(e.target.value)}
          >
            {actionsDroit.map((a) => (
              <option key={a.code} value={a.code}>
                {a.libelle}
              </option>
            ))}
          </NativeSelect>
          <Button disabled={!beneficiaireId || octroyer.isPending} onClick={octroyerDroit}>
            {octroyer.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
            Accorder
          </Button>
        </div>

        {(droits ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
            Aucun droit explicite : l'accès est hérité du dossier.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {(droits ?? []).map((d) => {
              const b = beneficiaire(d);
              const Icone = b.icone;
              return (
                <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
                    <Icone className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">{b.nom}</div>
                    <div className="text-[12px] text-muted-foreground">{b.type}</div>
                  </div>
                  <Badge variant="muted" shape="pill">
                    {actionParId.get(d.action_id) ?? d.action_id}
                  </Badge>
                  <BoutonSuppression
                    libelle={`Révoquer le droit de ${b.nom}`}
                    titre="Révoquer ce droit ?"
                    libelleConfirmer="Révoquer"
                    enCours={revoquer.isPending}
                    onConfirmer={(fermer) => revoquer.mutate(d.id, { onSuccess: fermer })}
                  >
                    <p>
                      {b.nom} perdra le droit « {actionParId.get(d.action_id) ?? d.action_id} » sur ce document, sauf s'il le
                      détient par ailleurs.
                    </p>
                  </BoutonSuppression>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
