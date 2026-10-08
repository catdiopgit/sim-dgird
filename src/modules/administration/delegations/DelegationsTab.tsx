import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { ArrowRight, Plus, UserRoundCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../../components/form/champ';
import { ConfirmDialog } from '../../../components/form/confirm-dialog';
import { FormDialog } from '../../../components/form/form-dialog';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { NativeSelect } from '../../../components/ui/native-select';
import { EtatVide } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { useEntites } from '../../../hooks/administration/useEntites';
import { useModulesActions } from '../../../hooks/administration/useRolesAdmin';
import { useUtilisateurs } from '../../../hooks/administration/useUtilisateurs';
import { useDelegationMutations, useDelegations } from '../../../hooks/administration/useDelegations';
import { useProfile } from '../../../hooks/useProfile';
import { ariaErreur } from '../../../lib/form';
import type { Delegation } from '../../../services/administration/delegations';

const schema = z.object({
  delegantId: z.string().min(1, 'Requis'),
  delegataireId: z.string().min(1, 'Requis'),
  moduleId: z.string().optional(),
  entiteId: z.string().optional(),
  dateDebut: z.string().min(1, 'Requis'),
  dateFin: z.string().optional(),
  motif: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const date = (d: string) => dayjs(d).format('DD/MM/YYYY');

export function DelegationsTab() {
  const { profile } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: delegations, isLoading } = useDelegations(organisationId);
  const { create, revoquer } = useDelegationMutations();
  const { data: utilisateurs } = useUtilisateurs(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { modules } = useModulesActions();
  const [ouvert, setOuvert] = useState(false);
  const [aRevoquer, setARevoquer] = useState<Delegation | null>(null);

  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );
  const moduleParId = useMemo(() => new Map((modules.data ?? []).map((m) => [m.id, m.libelle])), [modules.data]);
  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);

  const valeursVierges = (): FormValues => ({
    delegantId: profile?.id ?? '',
    delegataireId: '',
    moduleId: '',
    entiteId: '',
    dateDebut: dayjs().format('YYYY-MM-DD'),
    dateFin: '',
    motif: '',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valeursVierges(),
  });

  const ouvrir = () => {
    reset(valeursVierges());
    setOuvert(true);
  };

  const onSubmit = (values: FormValues) => {
    create.mutate(
      {
        delegant_id: values.delegantId,
        delegataire_id: values.delegataireId,
        module_id: values.moduleId || null,
        entite_id: values.entiteId || null,
        date_debut: values.dateDebut,
        date_fin: values.dateFin || null,
        motif: values.motif || null,
      },
      { onSuccess: () => setOuvert(false) },
    );
  };

  if (!organisationId) return <Skeleton className="h-64 w-full" />;

  const optionsUtilisateurs = (utilisateurs ?? []).map((u) => (
    <option key={u.id} value={u.id}>
      {u.prenom} {u.nom}
    </option>
  ));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-[13px] text-muted-foreground">
          Une délégation permet à un utilisateur d'agir temporairement avec les permissions d'un autre (par exemple un
          secrétariat agissant pour un directeur absent), dans les workflows et les permissions générales. Elle est
          limitée dans le temps, révocable et tracée dans le journal d'audit.
        </p>
        <Button className="shrink-0" onClick={ouvrir}>
          <Plus />
          Nouvelle délégation
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="py-3 pl-4 pr-4 font-medium">Délégant → délégataire</th>
              <th className="py-3 pr-4 font-medium">Périmètre</th>
              <th className="py-3 pr-4 font-medium">Période</th>
              <th className="py-3 pr-4 font-medium">Statut</th>
              <th className="w-24" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }, (_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td colSpan={5} className="px-4 py-3">
                    <Skeleton className="h-9 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading &&
              (delegations ?? []).map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/60">
                  <td className="py-2.5 pl-4 pr-4">
                    <div className="flex flex-wrap items-center gap-1.5 font-medium">
                      {utilisateurParId.get(d.delegant_id) ?? '—'}
                      <ArrowRight className="size-3.5 text-muted-foreground" aria-label="délègue à" />
                      {utilisateurParId.get(d.delegataire_id) ?? '—'}
                    </div>
                    {d.motif && <div className="text-[12px] text-muted-foreground">{d.motif}</div>}
                  </td>
                  <td className="py-2.5 pr-4">
                    <div>{d.module_id ? (moduleParId.get(d.module_id) ?? '—') : 'Tous les modules'}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {d.entite_id ? (entiteParId.get(d.entite_id) ?? '—') : 'Toutes les entités'}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums">
                    {date(d.date_debut)} → {d.date_fin ? date(d.date_fin) : 'indéterminée'}
                  </td>
                  <td className="py-2.5 pr-4">
                    <Badge variant={d.actif ? 'success' : 'muted'} shape="pill">
                      {d.actif ? 'Active' : 'Révoquée'}
                    </Badge>
                  </td>
                  <td className="pr-3 text-right">
                    {d.actif && (
                      <Button variant="ghost" size="sm" className="text-crit-text hover:text-crit-text" onClick={() => setARevoquer(d)}>
                        Révoquer
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!isLoading && (delegations ?? []).length === 0 && (
          <EtatVide icone={UserRoundCheck} titre="Aucune délégation" description="Les délégations créées apparaîtront ici." />
        )}
      </div>

      <FormDialog
        open={ouvert}
        onClose={() => setOuvert(false)}
        titre="Nouvelle délégation"
        description="Le délégataire agit avec les permissions du délégant pendant la période choisie."
        onSubmit={handleSubmit(onSubmit)}
        enCours={create.isPending}
        libelleValider="Créer la délégation"
        largeur="lg"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Délégant" htmlFor="delegation-delegant" requis aide="Celui qui délègue." erreur={errors.delegantId?.message}>
            <NativeSelect {...ariaErreur('delegation-delegant', errors.delegantId)} {...register('delegantId')}>
              <option value="">Sélectionner</option>
              {optionsUtilisateurs}
            </NativeSelect>
          </Champ>
          <Champ label="Délégataire" htmlFor="delegation-delegataire" requis aide="Celui qui reçoit les droits." erreur={errors.delegataireId?.message}>
            <NativeSelect autoFocus {...ariaErreur('delegation-delegataire', errors.delegataireId)} {...register('delegataireId')}>
              <option value="">Sélectionner</option>
              {optionsUtilisateurs}
            </NativeSelect>
          </Champ>
          <Champ label="Module" htmlFor="delegation-module">
            <NativeSelect id="delegation-module" {...register('moduleId')}>
              <option value="">Tous les modules</option>
              {(modules.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.libelle}
                </option>
              ))}
            </NativeSelect>
          </Champ>
          <Champ label="Entité" htmlFor="delegation-entite">
            <NativeSelect id="delegation-entite" {...register('entiteId')}>
              <option value="">Toutes les entités</option>
              {(entites ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.libelle}
                </option>
              ))}
            </NativeSelect>
          </Champ>
          <Champ label="Date de début" htmlFor="delegation-debut" requis erreur={errors.dateDebut?.message}>
            <Input type="date" {...ariaErreur('delegation-debut', errors.dateDebut)} {...register('dateDebut')} />
          </Champ>
          <Champ label="Date de fin" htmlFor="delegation-fin" aide="Vide = indéterminée.">
            <Input id="delegation-fin" type="date" {...register('dateFin')} />
          </Champ>
        </div>
        <Champ label="Motif" htmlFor="delegation-motif">
          <Input id="delegation-motif" placeholder="Ex. : congé, absence" {...register('motif')} />
        </Champ>
      </FormDialog>

      <ConfirmDialog
        open={aRevoquer !== null}
        onClose={() => setARevoquer(null)}
        titre="Révoquer cette délégation ?"
        libelleConfirmer="Révoquer"
        destructif
        enCours={revoquer.isPending}
        onConfirmer={() => aRevoquer && revoquer.mutate(aRevoquer.id, { onSuccess: () => setARevoquer(null) })}
      >
        {aRevoquer && (
          <>
            {utilisateurParId.get(aRevoquer.delegataire_id) ?? 'Le délégataire'} ne pourra plus agir pour le compte de{' '}
            {utilisateurParId.get(aRevoquer.delegant_id) ?? 'le délégant'}.
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
