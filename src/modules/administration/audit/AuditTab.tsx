import { ChevronLeft, ChevronRight, History, ShieldCheck } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { NativeSelect } from '../../../components/ui/native-select';
import { EtatVide } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { useUtilisateursOptions } from '../../../hooks/administration/useEntites';
import { useJournalAudit } from '../../../hooks/courrier/useAudit';
import { useProfile } from '../../../hooks/useProfile';
import { cn } from '../../../lib/utils';
import { fr } from '../../../utils/dateFr';

const LABEL_OBJET: Record<string, string> = {
  courriers: 'Courrier',
  documents: 'Document',
  missions: 'Mission',
  projets: 'Projet',
  utilisateurs: 'Utilisateur',
  roles: 'Rôle',
  permissions: 'Permission',
  workflow_instances: 'Workflow',
  parametres_organisation: 'Paramètre organisation',
  ged_versements: 'Versement GED',
  ged_dossiers: 'Dossier GED',
  livrables: 'Livrable',
  decaissements: 'Décaissement',
  avenants: 'Avenant',
  entites: 'Entité',
  delegations: 'Délégation',
};
const TAILLE_PAGE = 20;

// Vue d'ensemble en lecture seule du journal d'audit (plan V4 §10, ligne
// dépliable ancienne/nouvelle valeur ajoutée V5 §13) — lecture directe de
// journal_audit (0013), déjà protégée par la policy RLS journal_audit_select
// (has_permission('administration','consulter')) : un utilisateur sans ce
// droit ne reçoit simplement aucune ligne.
export function AuditTab() {
  const { profile } = useProfile();
  const organisationId = profile?.organisation_id;
  const [objetType, setObjetType] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());
  const { data: entrees, isLoading } = useJournalAudit(organisationId, { objetType });
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);

  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  if (!organisationId) return <Skeleton className="h-64 w-full" />;

  const lignes = entrees ?? [];
  const nbPages = Math.max(1, Math.ceil(lignes.length / TAILLE_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const lignesPage = lignes.slice((pageCourante - 1) * TAILLE_PAGE, pageCourante * TAILLE_PAGE);

  const basculer = (id: string) =>
    setOuvertes((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" />
          Créations, modifications et suppressions sur les objets sensibles. Journal non modifiable.
        </p>
        <NativeSelect
          aria-label="Filtrer par type d'objet"
          className="w-56 [&_select]:h-9 [&_select]:text-[13px]"
          value={objetType ?? ''}
          onChange={(e) => {
            setObjetType(e.target.value || undefined);
            setPage(1);
          }}
        >
          <option value="">Tous les objets</option>
          {Object.entries(LABEL_OBJET).map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[680px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="w-10" aria-hidden />
              <th className="py-3 pr-4 font-medium">Date</th>
              <th className="py-3 pr-4 font-medium">Utilisateur</th>
              <th className="py-3 pr-4 font-medium">Objet</th>
              <th className="py-3 pr-4 font-medium">Identifiant</th>
              <th className="py-3 pr-4 font-medium">Adresse IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td colSpan={6} className="px-4 py-3">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            ) : lignesPage.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EtatVide icone={History} titre="Aucune entrée dans le journal" />
                </td>
              </tr>
            ) : (
              lignesPage.map((e) => {
                const detail = Boolean(e.ancienne_valeur || e.nouvelle_valeur);
                const ouverte = ouvertes.has(e.id);
                return (
                  <Fragment key={e.id}>
                    <tr className={cn('border-b border-border', detail && 'cursor-pointer hover:bg-muted/60')} onClick={() => detail && basculer(e.id)}>
                      <td className="pl-3">
                        {detail && (
                          <button
                            type="button"
                            aria-expanded={ouverte}
                            aria-label={ouverte ? 'Masquer le détail' : 'Afficher le détail'}
                            className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground hover:text-foreground"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              basculer(e.id);
                            }}
                          >
                            <ChevronRight className={cn('size-4 transition-transform', ouverte && 'rotate-90')} />
                          </button>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums">{fr(e.created_at).format('DD/MM/YYYY HH:mm:ss')}</td>
                      <td className="whitespace-nowrap py-2.5 pr-4">{e.utilisateur_id ? (utilisateurParId.get(e.utilisateur_id) ?? e.utilisateur_id) : 'Système'}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="muted">{LABEL_OBJET[e.objet_type] ?? e.objet_type}</Badge>
                      </td>
                      <td className="max-w-[240px] truncate py-2.5 pr-4 font-mono text-[11px] text-muted-foreground" title={e.objet_id ?? undefined}>
                        {e.objet_id ?? '—'}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-[12px] text-muted-foreground">{e.adresse_ip ?? '—'}</td>
                    </tr>
                    {ouverte && (
                      <tr className="border-b border-border bg-muted/40">
                        <td />
                        <td colSpan={5} className="py-3 pr-4">
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {(
                              [
                                ['Ancienne valeur', e.ancienne_valeur],
                                ['Nouvelle valeur', e.nouvelle_valeur],
                              ] as const
                            ).map(([titre, valeur]) => (
                              <div key={titre} className="min-w-0">
                                <div className="mb-1 text-[12px] font-semibold">{titre}</div>
                                <pre className="max-h-72 overflow-auto rounded-md border border-border bg-card p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                                  {valeur ? JSON.stringify(valeur, null, 2) : '—'}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <span className="tabular-nums">
          {lignes.length} entrée{lignes.length > 1 ? 's' : ''}
        </span>
        {nbPages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" disabled={pageCourante === 1} onClick={() => setPage(pageCourante - 1)} aria-label="Page précédente">
              <ChevronLeft />
            </Button>
            <span className="px-2 tabular-nums">
              Page {pageCourante} / {nbPages}
            </span>
            <Button variant="outline" size="icon" className="size-8" disabled={pageCourante === nbPages} onClick={() => setPage(pageCourante + 1)} aria-label="Page suivante">
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
