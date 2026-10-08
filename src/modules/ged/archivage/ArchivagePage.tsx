import dayjs, { type Dayjs } from 'dayjs';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Compass,
  FolderArchive,
  KanbanSquare,
  Mail,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../../../components/form/confirm-dialog';
import { PlageDates } from '../../../components/form/plage-dates';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { EtatVide, PageHeader } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  useArchivageCompteurs,
  useArchivageElements,
  useArchivageMutations,
  useOperationEnPreparation,
} from '../../../hooks/ged/useArchivage';
import { useProfile } from '../../../hooks/useProfile';
import type { ArchivageElement } from '../../../services/ged/archivage';


const LABEL_TYPE: Record<ArchivageElement['type_element'], string> = {
  courrier: 'Courrier',
  projet: 'Projet',
  mission: 'Mission',
};
const TAILLE_PAGE = 20;

interface Classement {
  annee?: number;
  typeCourrierLibelle?: string;
  entiteLibelle?: string;
}

function formatClassement(element: ArchivageElement): string {
  const c = (element.classement ?? {}) as Classement;
  const parties = [c.annee?.toString()];
  if (element.type_element === 'courrier') parties.push(c.typeCourrierLibelle ?? '—');
  parties.push(c.entiteLibelle ?? '—');
  return parties.filter(Boolean).join(' / ');
}

function anneeParDefaut(): [Dayjs, Dayjs] {
  const annee = dayjs().year() - 1;
  return [dayjs(`${annee}-01-01`), dayjs(`${annee}-12-31`)];
}

// 0 et "donnée indisponible" ne signifient pas la même chose (§9 du brief
// dashboard, même principe ici) : distinct de compteurs undefined (chargement
// en cours ou échec de récupération), jamais confondu avec un vrai zéro.
function Compteur({ titre, valeur, chargement, icone: Icone }: { titre: string; valeur: number | undefined; chargement: boolean; icone: LucideIcon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icone className="size-4" />
        </span>
        <span className="text-[13px] font-medium">{titre}</span>
      </div>
      {chargement ? (
        <Skeleton className="mt-4 h-8 w-16" />
      ) : valeur === undefined ? (
        <div className="mt-3">
          <div className="text-[28px] font-semibold leading-none text-muted-foreground">—</div>
          <div className="mt-1 text-[12px] text-muted-foreground">Données indisponibles</div>
        </div>
      ) : (
        <div className="mt-3 text-[28px] font-semibold leading-none tabular-nums">{valeur}</div>
      )}
    </div>
  );
}

// Page GED → Archives → Archivage (documentation/Archivage Automatique.txt) :
// l'archiviste prépare en un clic (détection automatique des courriers/
// projets/missions clôturés depuis ≥1 an), revoit la liste, puis confirme —
// seule cette confirmation classe définitivement (§3 du brief : aucun élément
// n'est considéré comme archivé avant confirmation explicite).
export function ArchivagePage() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const [periode, setPeriode] = useState<[Dayjs, Dayjs]>(anneeParDefaut);
  const [modalConfirmationOuvert, setModalConfirmationOuvert] = useState(false);
  const [page, setPage] = useState(1);

  const dateDebut = periode[0].format('YYYY-MM-DD');
  const dateFin = periode[1].format('YYYY-MM-DD');

  const { data: compteurs, isLoading: chargementCompteurs } = useArchivageCompteurs(dateDebut, dateFin);
  const { data: operation } = useOperationEnPreparation(organisationId);
  const { data: elements, isLoading: chargementElements } = useArchivageElements(operation?.id);
  const { preparer, definirSelection, confirmer } = useArchivageMutations(organisationId);

  const peutConsulter = can('ged', 'consulter');
  const peutArchiver = can('ged', 'archiver');
  const peutValider = can('ged', 'valider');

  const eligibles = useMemo(() => (elements ?? []).filter((e) => e.etat === 'eligible'), [elements]);
  const anomalies = useMemo(() => (elements ?? []).filter((e) => e.etat === 'anomalie'), [elements]);
  const selectionnes = eligibles.filter((e) => e.selectionne);
  const nbCourriersSelectionnes = selectionnes.filter((e) => e.type_element === 'courrier').length;
  const nbProjetsSelectionnes = selectionnes.filter((e) => e.type_element === 'projet').length;
  const nbMissionsSelectionnes = selectionnes.filter((e) => e.type_element === 'mission').length;

  const nbPages = Math.max(1, Math.ceil(eligibles.length / TAILLE_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const lignesPage = eligibles.slice((pageCourante - 1) * TAILLE_PAGE, pageCourante * TAILLE_PAGE);
  const toutesPageSelectionnees = lignesPage.length > 0 && lignesPage.every((e) => e.selectionne);
  const certainesPageSelectionnees = lignesPage.some((e) => e.selectionne);

  if (!organisationId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!peutConsulter) {
    return (
      <EtatVide icone={ShieldAlert} titre="Accès restreint" description="Vous n'avez pas accès à l'archivage GED." />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        retour={{ vers: '/ged', libelle: 'Gestion documentaire' }}
        titre="Archivage annuel"
        description="Détection des courriers, projets et missions clôturés, revue puis versement définitif aux archives"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Compteur titre="Courriers à archiver" valeur={compteurs?.courriers} chargement={chargementCompteurs} icone={Mail} />
        <Compteur titre="Projets à archiver" valeur={compteurs?.projets} chargement={chargementCompteurs} icone={KanbanSquare} />
        <Compteur titre="Missions à archiver" valeur={compteurs?.missions} chargement={chargementCompteurs} icone={Compass} />
        <Compteur titre="Déjà archivés" valeur={compteurs?.dejaArchives} chargement={chargementCompteurs} icone={FolderArchive} />
      </div>

      {(peutArchiver || compteurs?.derniereOperation) && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Préparer une opération</CardTitle>
              <CardDescription className="mt-1">
                {compteurs?.derniereOperation ? (
                  <>
                    Dernière opération : {dayjs(compteurs.derniereOperation.dateDebut).format('DD/MM/YYYY')} →{' '}
                    {dayjs(compteurs.derniereOperation.dateFin).format('DD/MM/YYYY')} ·{' '}
                    {compteurs.derniereOperation.statut === 'confirmee' ? 'Terminée' : 'En préparation'}
                    {compteurs.derniereOperation.confirmeLe &&
                      ` (confirmée le ${dayjs(compteurs.derniereOperation.confirmeLe).format('DD/MM/YYYY')})`}
                  </>
                ) : (
                  'Aucune opération précédente.'
                )}
              </CardDescription>
            </div>
          </CardHeader>
          {peutArchiver && (
            <CardContent className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] font-medium">Période</span>
              <PlageDates libelle="Période à archiver" valeur={periode} onChange={(v) => v && setPeriode(v)} />
              <Button onClick={() => preparer.mutate({ dateDebut, dateFin })} disabled={preparer.isPending}>
                <Archive />
                {preparer.isPending ? 'Préparation…' : "Préparer l'archivage annuel"}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {operation && (
        <>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Éléments détectés</CardTitle>
                <CardDescription className="mt-1">
                  Période du {dayjs(operation.date_debut).format('DD/MM/YYYY')} au {dayjs(operation.date_fin).format('DD/MM/YYYY')}
                  {eligibles.length > 0 && ` · ${selectionnes.length} sélectionné${selectionnes.length > 1 ? 's' : ''} sur ${eligibles.length}`}
                </CardDescription>
              </div>
              {peutValider && (
                <Button disabled={selectionnes.length === 0} onClick={() => setModalConfirmationOuvert(true)}>
                  Confirmer l'archivage
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {chargementElements ? (
                <div className="px-5 pb-5">
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : eligibles.length === 0 ? (
                <EtatVide icone={FolderArchive} titre="Aucun élément éligible pour cette période" />
              ) : (
                <>
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full min-w-[760px] text-[13px]">
                      <thead>
                        <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                          <th className="w-10 py-3 pl-5">
                            <input
                              type="checkbox"
                              aria-label="Sélectionner toute la page"
                              checked={toutesPageSelectionnees}
                              ref={(el) => {
                                if (el) el.indeterminate = certainesPageSelectionnees && !toutesPageSelectionnees;
                              }}
                              onChange={(e) =>
                                lignesPage
                                  .filter((r) => r.selectionne !== e.target.checked)
                                  .forEach((r) => definirSelection.mutate({ elementId: r.id, selectionne: e.target.checked }))
                              }
                              className="size-4 rounded accent-[var(--primary)]"
                            />
                          </th>
                          <th className="py-3 pr-4 font-medium">Type</th>
                          <th className="py-3 pr-4 font-medium">Référence</th>
                          <th className="py-3 pr-4 font-medium">Libellé</th>
                          <th className="py-3 pr-4 font-medium">Clôture</th>
                          <th className="py-3 pr-5 font-medium">Classement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lignesPage.map((e) => (
                          <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/60">
                            <td className="py-2.5 pl-5">
                              <input
                                type="checkbox"
                                aria-label={`Sélectionner ${e.reference}`}
                                checked={e.selectionne}
                                onChange={(ev) => definirSelection.mutate({ elementId: e.id, selectionne: ev.target.checked })}
                                className="size-4 rounded accent-[var(--primary)]"
                              />
                            </td>
                            <td className="py-2.5 pr-4">
                              <Badge variant="muted">{LABEL_TYPE[e.type_element]}</Badge>
                            </td>
                            <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-[12px]">{e.reference}</td>
                            <td className="max-w-[360px] truncate py-2.5 pr-4" title={e.libelle}>
                              {e.libelle}
                            </td>
                            <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums">{dayjs(e.date_cloture).format('DD/MM/YYYY')}</td>
                            <td className="py-2.5 pr-5 text-muted-foreground">{formatClassement(e)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {nbPages > 1 && (
                    <div className="flex items-center justify-end gap-1 border-t border-border px-5 py-3 text-[13px] text-muted-foreground">
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
                </>
              )}
            </CardContent>
          </Card>

          {anomalies.length > 0 && (
            <Card className="border-warn/40">
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TriangleAlert className="size-4 text-warn-text" />
                    Éléments nécessitant une intervention
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Corrigez l'information manquante depuis le module concerné, puis relancez la préparation.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {anomalies.map((a) => (
                    <li key={a.id} className="px-4 py-3 text-[13px]">
                      <div className="font-medium">
                        {LABEL_TYPE[a.type_element]} <span className="font-mono text-[12px]">{a.reference}</span> — {a.libelle}
                      </div>
                      <div className="mt-0.5 text-warn-text">{a.motif_anomalie}</div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <ConfirmDialog
        open={modalConfirmationOuvert}
        onClose={() => setModalConfirmationOuvert(false)}
        titre="Confirmer l'archivage"
        libelleConfirmer="Confirmer l'archivage"
        enCours={confirmer.isPending}
        onConfirmer={() => {
          if (!operation) return;
          confirmer.mutate(operation.id, { onSuccess: () => setModalConfirmationOuvert(false) });
        }}
      >
        <p>
          Vous êtes sur le point d'archiver {nbCourriersSelectionnes} courrier(s), {nbProjetsSelectionnes} projet(s) et{' '}
          {nbMissionsSelectionnes} mission(s) pour la période du {dayjs(dateDebut).format('DD/MM/YYYY')} au{' '}
          {dayjs(dateFin).format('DD/MM/YYYY')}.
        </p>
        <p>Après confirmation, ces éléments seront intégrés aux archives selon le plan de classement défini.</p>
        <p className="font-semibold">Confirmez-vous cette opération ?</p>
      </ConfirmDialog>
    </div>
  );
}
