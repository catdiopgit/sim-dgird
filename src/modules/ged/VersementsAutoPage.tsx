import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, FileSearch, History, Play, Workflow } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Confirmation } from '../../components/form/confirm-dialog';
import { Champ } from '../../components/form/champ';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { CaseACocher } from '../../components/ui/checkbox';
import { Encart } from '../../components/ui/encart';
import { Input } from '../../components/ui/input';
import { EtatVide, PageHeader } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { Switch } from '../../components/ui/switch';
import { useProfile } from '../../hooks/useProfile';
import { message } from '../../lib/notifications';
import {
  LIBELLES_MODULES,
  apercuVersementsAuto,
  definirParametreVersementsAuto,
  lancerVersementsAuto,
  listLancementsAuto,
  parametreVersementsAuto,
  type ApercuVersementsAuto,
  type ModuleVerse,
} from '../../services/ged/versementsAuto';

const fr = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '—');
const anneePrecedente = new Date().getFullYear() - 1;
const LIMITE = `${anneePrecedente}-12-31`;

// v8.7 — versements automatiques : le SIM prépare les versements des éléments
// clôturés (courriers par direction et par sens, projets par direction et par
// projet, marchés par direction et par type) ; l'archiviste les valide ensuite
// comme d'habitude (réception, contrôle, classement, archivage).
export function VersementsAutoPage() {
  const { canEtendu } = useProfile();
  const autorise = canEtendu('ged', 'archiver') || canEtendu('administration', 'modifier');
  const qc = useQueryClient();
  const [debut, setDebut] = useState(`${anneePrecedente}-01-01`);
  const [fin, setFin] = useState(LIMITE);
  const [modules, setModules] = useState<ModuleVerse[]>(['courrier', 'projet', 'marche']);
  const [apercu, setApercu] = useState<ApercuVersementsAuto | null>(null);

  const lancements = useQuery({ queryKey: ['ged-lancements-auto'], queryFn: listLancementsAuto, enabled: autorise });
  const parametre = useQuery({ queryKey: ['ged-versements-auto-parametre'], queryFn: parametreVersementsAuto, enabled: autorise });
  const majParametre = useMutation({
    mutationFn: definirParametreVersementsAuto,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ged-versements-auto-parametre'] }),
    onError: (e: Error) => message.error(e.message),
  });
  const calculer = useMutation({
    mutationFn: () => apercuVersementsAuto(debut, fin, modules),
    onSuccess: setApercu,
    onError: (e: Error) => message.error(e.message),
  });
  const lancer = useMutation({
    mutationFn: () => lancerVersementsAuto(debut, fin, modules),
    onSuccess: (r) => {
      message.success(`${r.versements.length} versement(s) créé(s) et transmis à l'archiviste.`);
      setApercu(null);
      void qc.invalidateQueries({ queryKey: ['ged-lancements-auto'] });
      void qc.invalidateQueries({ queryKey: ['ged-versements'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (!autorise) {
    return <EtatVide icone={Workflow} titre="Accès réservé" description="Les versements automatiques sont lancés par l'archiviste." />;
  }

  const basculer = (m: ModuleVerse, actif: boolean) => {
    setApercu(null);
    setModules((l) => (actif ? [...new Set([...l, m])] : l.filter((x) => x !== m)));
  };
  const finInvalide = fin > LIMITE;

  return (
    <div className="space-y-5">
      <PageHeader
        retour={{ vers: '/ged', libelle: 'Gestion documentaire' }}
        titre="Versements automatiques"
        description="Préparer les versements des courriers, projets et marchés clôturés"
      />

      <Card>
        <CardHeader>
          <CardTitle>Période et modules</CardTitle>
          <CardDescription>
            Choisissez librement la période : seules les données de l'année en cours sont exclues. Les versements sont créés déjà
            soumis et arrivent dans votre bannette pour validation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <Champ label="Du" htmlFor="va-debut" requis>
              <Input id="va-debut" type="date" max={LIMITE} value={debut} onChange={(e) => { setDebut(e.target.value); setApercu(null); }} />
            </Champ>
            <Champ label="Au" htmlFor="va-fin" requis erreur={finInvalide ? `Au plus le ${fr(LIMITE)}` : undefined}>
              <Input id="va-fin" type="date" max={LIMITE} value={fin} onChange={(e) => { setFin(e.target.value); setApercu(null); }} />
            </Champ>
          </div>
          <div className="flex flex-wrap gap-5">
            {(['courrier', 'projet', 'marche'] as ModuleVerse[]).map((m) => (
              <CaseACocher key={m} checked={modules.includes(m)} onChange={(v) => basculer(m, v)}>
                {LIBELLES_MODULES[m]}
              </CaseACocher>
            ))}
          </div>
          <Encart>
            Courriers : un versement par direction et par sens (arrivée, départ, internes). Projets : un versement par direction et
            par projet. Marchés : un versement par direction et par type de marché. Seuls les éléments clôturés et non encore versés
            sont pris ; la rubrique du plan de classement la plus proche est proposée, vous la confirmez au classement.
          </Encart>
          <Button onClick={() => calculer.mutate()} disabled={calculer.isPending || !modules.length || !debut || !fin || finInvalide || fin < debut}>
            <FileSearch />
            {calculer.isPending ? 'Analyse…' : 'Voir l’aperçu'}
          </Button>
        </CardContent>
      </Card>

      {apercu && (
        <Card>
          <CardHeader>
            <CardTitle>Aperçu — du {fr(debut)} au {fr(fin)}</CardTitle>
            <CardDescription>
              {apercu.totaux.versements} versement(s) · {apercu.totaux.elements} élément(s) · {apercu.totaux.documents} document(s)
              {apercu.totaux.ecartes > 0 ? ` · ${apercu.totaux.ecartes} élément(s) écarté(s)` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {apercu.groupes.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Aucun élément à verser sur cette période.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-[13px]">
                  <thead className="bg-muted/50 text-left text-[12px] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Versement</th>
                      <th className="px-3 py-2 font-medium">Direction</th>
                      <th className="px-3 py-2 font-medium">Rubrique proposée</th>
                      <th className="px-3 py-2 font-medium">Dates extrêmes</th>
                      <th className="px-3 py-2 text-right font-medium">Éléments</th>
                      <th className="px-3 py-2 text-right font-medium">Documents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {apercu.groupes.map((g) => (
                      <tr key={g.cle}>
                        <td className="px-3 py-2">
                          <Badge variant="muted" className="mr-2">{LIBELLES_MODULES[g.type]}</Badge>
                          {g.titre}
                        </td>
                        <td className="px-3 py-2">{g.direction}</td>
                        <td className="px-3 py-2">{g.dossierCible ?? <span className="text-muted-foreground">Au choix de l'archiviste</span>}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">{fr(g.dateDebut)} → {fr(g.dateFin)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{g.nbElements}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{g.nbDocuments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {apercu.ecartes.length > 0 && (
              <details className="rounded-lg border border-border p-3 text-[13px]">
                <summary className="cursor-pointer font-medium">{apercu.ecartes.length} élément(s) écarté(s)</summary>
                <ul className="mt-2 space-y-1">
                  {apercu.ecartes.map((e, i) => (
                    <li key={i}>
                      <span className="text-muted-foreground">{LIBELLES_MODULES[e.type]} · </span>
                      <span className="font-mono">{e.reference}</span> — {e.libelle} : <span className="text-warn-text">{e.motif}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {apercu.groupes.length > 0 && (
              <Confirmation
                titre={`Créer ${apercu.totaux.versements} versement(s) ?`}
                libelleConfirmer="Lancer les versements"
                enCours={lancer.isPending}
                onConfirmer={(fermer) => lancer.mutate(undefined, { onSettled: fermer })}
                declencheur={(ouvrir) => (
                  <Button onClick={ouvrir} disabled={lancer.isPending}>
                    <Play />
                    Lancer les versements
                  </Button>
                )}
              >
                <p>
                  Les {apercu.totaux.versements} versement(s) seront créés et soumis : ils arriveront dans la bannette de l'archiviste
                  pour réception, contrôle, classement et archivage. Les éléments concernés seront marqués « En cours de versement »
                  dans leur module.
                </p>
              </Confirmation>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            Lancement programmé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 text-[13px]">
            <Switch
              checked={parametre.data?.annuelActif ?? false}
              disabled={parametre.isLoading || majParametre.isPending}
              onCheckedChange={(v) => majParametre.mutate(v)}
              aria-label="Préparer automatiquement les versements de l'année écoulée"
            />
            <span>
              Préparer automatiquement, le 2 janvier, les versements de l'année écoulée (tous les modules). L'archiviste est prévenu
              et valide les versements comme d'habitude.
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            Historique des lancements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lancements.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !lancements.data?.length ? (
            <p className="text-[13px] text-muted-foreground">Aucun lancement pour le moment.</p>
          ) : (
            <ul className="divide-y divide-border text-[13px]">
              {lancements.data.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <span className="font-medium">{new Date(l.lance_le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    {' · '}
                    {l.lance_par}
                    {l.programme && <Badge variant="muted" className="ml-2">Programmé</Badge>}
                    <span className="text-muted-foreground">
                      {' · '}du {fr(l.date_debut)} au {fr(l.date_fin)} · {l.modules.map((m) => LIBELLES_MODULES[m]).join(', ')}
                    </span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {l.nb_versements} versement(s) · {l.nb_elements} élément(s) · {l.nb_documents} document(s)
                    {l.nb_ecartes > 0 ? ` · ${l.nb_ecartes} écarté(s)` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12px] text-muted-foreground">
            Les versements créés apparaissent dans <Link to="/ged" className="underline">la liste des versements</Link>, avec la mention « Automatique ».
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
