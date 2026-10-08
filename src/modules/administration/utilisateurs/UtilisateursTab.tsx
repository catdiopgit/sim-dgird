import { KeyRound, Pencil, Plus, Search, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { FacetFilter } from '../../../components/ui/facet-filter';
import { EtatVide } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { useEntites } from '../../../hooks/administration/useEntites';
import { useFonctions } from '../../../hooks/administration/useFonctions';
import { useRoles, useUtilisateurs } from '../../../hooks/administration/useUtilisateurs';
import { useProfile } from '../../../hooks/useProfile';
import { champBase } from '../../../lib/styles';
import { cn } from '../../../lib/utils';
import type { Utilisateur } from '../../../services/administration/utilisateurs';
import { UtilisateurFormModal } from './UtilisateurFormModal';
import { UtilisateurRolesDrawer } from './UtilisateurRolesDrawer';

const STATUTS: { valeur: string; libelle: string; variante: 'success' | 'muted' | 'critical' }[] = [
  { valeur: 'actif', libelle: 'Actif', variante: 'success' },
  { valeur: 'inactif', libelle: 'Inactif', variante: 'muted' },
  { valeur: 'suspendu', libelle: 'Suspendu', variante: 'critical' },
];

export function UtilisateursTab() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: utilisateurs, isLoading } = useUtilisateurs(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: fonctions } = useFonctions(organisationId);
  const { data: roles } = useRoles(organisationId);

  const [recherche, setRecherche] = useState('');
  const [statuts, setStatuts] = useState<string[]>([]);
  const [entitesFiltre, setEntitesFiltre] = useState<string[]>([]);
  const [utilisateurEnEdition, setUtilisateurEnEdition] = useState<Utilisateur | 'nouveau' | null>(null);
  const [utilisateurRoles, setUtilisateurRoles] = useState<Utilisateur | null>(null);

  const peutCreer = can('utilisateurs', 'creer');
  const peutModifier = can('utilisateurs', 'modifier');
  const peutAffecter = can('utilisateurs', 'affecter');

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e])), [entites]);
  const fonctionParId = useMemo(() => new Map((fonctions ?? []).map((f) => [f.id, f.libelle])), [fonctions]);

  const donnees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (utilisateurs ?? []).filter(
      (u) =>
        (statuts.length === 0 || statuts.includes(u.statut)) &&
        (entitesFiltre.length === 0 || entitesFiltre.includes(u.entite_id ?? '')) &&
        (!q || `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(q)),
    );
  }, [utilisateurs, statuts, entitesFiltre, recherche]);

  const compter = (cle: (u: Utilisateur) => string) => {
    const m = new Map<string, number>();
    for (const u of utilisateurs ?? []) m.set(cle(u), (m.get(cle(u)) ?? 0) + 1);
    return m;
  };
  const nbStatut = compter((u) => u.statut);
  const nbEntite = compter((u) => u.entite_id ?? '');
  const filtresActifs = recherche !== '' || statuts.length + entitesFiltre.length > 0;

  if (!organisationId) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, prénom ou email…"
            aria-label="Rechercher un utilisateur"
            className={cn(champBase, 'h-9 pl-9 pr-3 text-[13px]')}
          />
        </label>
        <FacetFilter
          titre="Statut"
          selection={statuts}
          onChange={setStatuts}
          options={STATUTS.map((s) => ({ valeur: s.valeur, libelle: s.libelle, nombre: nbStatut.get(s.valeur) ?? 0 }))}
        />
        <FacetFilter
          titre="Entité"
          selection={entitesFiltre}
          onChange={setEntitesFiltre}
          options={(entites ?? [])
            .filter((e) => nbEntite.has(e.id))
            .map((e) => ({ valeur: e.id, libelle: e.sigle ? `${e.sigle} — ${e.libelle}` : e.libelle, nombre: nbEntite.get(e.id) ?? 0 }))}
        />
        {filtresActifs && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setRecherche('');
              setStatuts([]);
              setEntitesFiltre([]);
            }}
          >
            Réinitialiser
            <X className="size-3.5" />
          </Button>
        )}
        {peutCreer && (
          <Button className="ml-auto" onClick={() => setUtilisateurEnEdition('nouveau')}>
            <Plus />
            Nouvel utilisateur
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[600px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="py-3 pl-4 pr-4 font-medium">Utilisateur</th>
              <th className="py-3 pr-4 font-medium">Entité</th>
              <th className="py-3 pr-4 font-medium">Fonction</th>
              <th className="py-3 pr-4 font-medium">Statut</th>
              <th className="w-24" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td colSpan={5} className="px-4 py-3">
                    <Skeleton className="h-9 w-full" />
                  </td>
                </tr>
              ))
            ) : donnees.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EtatVide icone={Users} titre={filtresActifs ? 'Aucun utilisateur ne correspond' : 'Aucun utilisateur'} />
                </td>
              </tr>
            ) : (
              donnees.map((u) => {
                const statut = STATUTS.find((s) => s.valeur === u.statut);
                const entite = u.entite_id ? entiteParId.get(u.entite_id) : undefined;
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/60">
                    <td className="py-2.5 pl-4 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-semibold text-accent-foreground">
                          {`${u.prenom[0] ?? ''}${u.nom[0] ?? ''}`.toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {u.prenom} {u.nom}
                          </div>
                          <div className="truncate text-[12px] text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4" title={entite?.libelle}>
                      {entite ? (entite.sigle ?? entite.libelle) : '—'}
                    </td>
                    <td className="py-2.5 pr-4">{u.fonction_id ? (fonctionParId.get(u.fonction_id) ?? '—') : '—'}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={statut?.variante ?? 'muted'} shape="pill">
                        {statut?.libelle ?? u.statut}
                      </Badge>
                    </td>
                    <td className="pr-3">
                      <div className="flex justify-end gap-1">
                        {peutAffecter && (
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setUtilisateurRoles(u)} aria-label={`Rôles de ${u.prenom} ${u.nom}`} title="Rôles">
                            <KeyRound />
                          </Button>
                        )}
                        {peutModifier && (
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setUtilisateurEnEdition(u)} aria-label={`Modifier ${u.prenom} ${u.nom}`} title="Modifier">
                            <Pencil />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] tabular-nums text-muted-foreground">
        {donnees.length} utilisateur{donnees.length > 1 ? 's' : ''}
      </p>

      <UtilisateurFormModal
        open={utilisateurEnEdition !== null}
        utilisateur={utilisateurEnEdition === 'nouveau' ? undefined : (utilisateurEnEdition ?? undefined)}
        organisationId={organisationId}
        entites={entites ?? []}
        fonctions={fonctions ?? []}
        onClose={() => setUtilisateurEnEdition(null)}
      />

      <UtilisateurRolesDrawer
        open={utilisateurRoles !== null}
        utilisateur={utilisateurRoles}
        roles={roles ?? []}
        entites={entites ?? []}
        onClose={() => setUtilisateurRoles(null)}
      />
    </div>
  );
}
