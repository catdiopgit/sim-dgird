import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  Folder,
  FolderPlus,
  FolderTree,
  Lock,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../../../components/form/confirm-dialog';
import { FormDialog } from '../../../components/form/form-dialog';
import { Arborescence, type NoeudArbre } from '../../../components/ui/arborescence';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { CaseACocher } from '../../../components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Encart } from '../../../components/ui/encart';
import { EnTeteSection, EtatVide } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { useEntites } from '../../../hooks/administration/useEntites';
import {
  useDossiers,
  useEntitesProductrices,
  useImporterPlanDirectionRoutes,
  useModifierDossierGed,
  useSupprimerDossierGed,
} from '../../../hooks/ged/useDossiers';
import { message } from '../../../lib/notifications';
import { DossierFormModal } from '../../ged/DossierFormModal';
import { comparerDossiers, modifierDossierGed, type GedDossier } from '../../../services/ged/dossiers';

interface Props {
  organisationId: string;
  // Archiviste ou administrateur (v8.6).
  peutModifier: boolean;
}

type ModalState =
  | { mode: 'creer'; parentId: string | null; codePropose: string }
  | { mode: 'modifier'; dossier: GedDossier }
  | null;

const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

// Code suivant proposé (modifiable) : chiffres romains sous une série,
// numéros à deux chiffres en dessous ; rien pour une nouvelle série (lettres
// saisies à la main).
function proposerCode(parent: GedDossier | null, freres: GedDossier[], tous: GedDossier[]): string {
  if (!parent) return '';
  const pris = new Set(tous.map((d) => d.code.toLowerCase()));
  for (let n = freres.length + 1; n < freres.length + 50; n++) {
    const suffixe = parent.niveau === 0 ? (ROMAINS[n - 1] ?? String(n)) : String(n).padStart(2, '0');
    const code = `${parent.code}-${suffixe}`;
    if (!pris.has(code.toLowerCase())) return code;
  }
  return `${parent.code}-`;
}

// v8.6 — Plan de classement modifiable par l'archiviste. Règles appliquées par
// le serveur : code verrouillé dès qu'un document est classé dans le dossier
// ou un de ses sous-dossiers (déplacement et suppression aussi) ; intitulé,
// ordre, activation et sous-dossiers toujours modifiables.
export function PlanClassementManager({ organisationId, peutModifier }: Props) {
  const queryClient = useQueryClient();
  const { data: dossiers, isLoading } = useDossiers(organisationId);
  const { data: entites } = useEntites(organisationId);
  const modifier = useModifierDossierGed(organisationId);
  const supprimer = useSupprimerDossierGed(organisationId);
  const importer = useImporterPlanDirectionRoutes(organisationId);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [aSupprimer, setASupprimer] = useState<GedDossier | null>(null);
  const [producteurs, setProducteurs] = useState<GedDossier | null>(null);
  const [deplacement, setDeplacement] = useState(false);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.sigle || e.libelle])), [entites]);

  const enfantsParParent = useMemo(() => {
    const map = new Map<string | null, GedDossier[]>();
    for (const d of dossiers ?? []) {
      const liste = map.get(d.parent_dossier_id) ?? [];
      liste.push(d);
      map.set(d.parent_dossier_id, liste);
    }
    for (const liste of map.values()) liste.sort(comparerDossiers);
    return map;
  }, [dossiers]);

  // Monter / descendre : échange l'ordre avec le dossier voisin (un seul
  // rafraîchissement, sans message pour chaque appel).
  const deplacer = async (d: GedDossier, sens: -1 | 1) => {
    const freres = enfantsParParent.get(d.parent_dossier_id) ?? [];
    const i = freres.findIndex((f) => f.id === d.id);
    const voisin = freres[i + sens];
    if (!voisin) return;
    setDeplacement(true);
    try {
      // Ordres distincts garantis même si les deux valaient la même chose.
      const a = voisin.ordre === d.ordre ? d.ordre + sens : voisin.ordre;
      await modifierDossierGed({ p_dossier_id: d.id, p_ordre: a });
      await modifierDossierGed({ p_dossier_id: voisin.id, p_ordre: d.ordre });
      await queryClient.invalidateQueries({ queryKey: ['ged-dossiers', organisationId] });
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setDeplacement(false);
    }
  };

  const arbre = useMemo<NoeudArbre[]>(() => {
    const tous = dossiers ?? [];
    const construireNoeuds = (parentId: string | null): NoeudArbre[] => {
      const freres = enfantsParParent.get(parentId) ?? [];
      return freres.map((d, index) => {
        const enfants = enfantsParParent.get(d.id) ?? [];
        const producteursNoms = (d.entites_productrices ?? []).map((id) => entiteParId.get(id) ?? '?');
        return {
          id: d.id,
          libelle: `${d.code} ${d.libelle}`,
          contenu: (
            <span className={`flex min-w-0 items-center gap-2 ${d.actif === false ? 'opacity-55' : ''}`}>
              <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="shrink-0 font-mono text-[12px] text-muted-foreground">{d.code}</span>
              <span className="truncate font-medium">{d.libelle}</span>
              {d.verrouille && (
                <span title="Code verrouillé : des documents sont classés dans ce dossier ou ses sous-dossiers">
                  <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Code verrouillé" />
                </span>
              )}
              {(d.nb_documents ?? 0) > 0 && (
                <Badge variant="muted" shape="pill" className="shrink-0 tabular-nums">
                  {d.nb_documents} doc.
                </Badge>
              )}
              {producteursNoms.length > 0 && (
                <Badge variant="outline" shape="pill" className="hidden shrink-0 sm:inline-flex" title={`Entités productrices : ${producteursNoms.join(', ')}`}>
                  <Building2 className="mr-1 size-3" aria-hidden />
                  {producteursNoms.length === 1 ? producteursNoms[0] : `${producteursNoms.length} entités`}
                </Badge>
              )}
              {d.actif === false && (
                <Badge variant="warning" shape="pill" className="shrink-0">
                  Désactivé
                </Badge>
              )}
            </span>
          ),
          actions: peutModifier ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Actions pour ${d.libelle}`}>
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => setModalState({ mode: 'creer', parentId: d.id, codePropose: proposerCode(d, enfants, tous) })}
                >
                  <FolderPlus />
                  Ajouter un sous-dossier
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setModalState({ mode: 'modifier', dossier: d })}>
                  <Pencil />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem disabled={index === 0 || deplacement} onSelect={() => void deplacer(d, -1)}>
                  <ArrowUp />
                  Monter
                </DropdownMenuItem>
                <DropdownMenuItem disabled={index === freres.length - 1 || deplacement} onSelect={() => void deplacer(d, 1)}>
                  <ArrowDown />
                  Descendre
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setProducteurs(d)}>
                  <Building2 />
                  Entités productrices…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => modifier.mutate({ p_dossier_id: d.id, p_actif: d.actif === false })}>
                  {d.actif === false ? <Eye /> : <EyeOff />}
                  {d.actif === false ? 'Réactiver' : 'Désactiver'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={Boolean(d.verrouille) || enfants.length > 0}
                  title={d.verrouille ? 'Contient des documents' : enfants.length > 0 ? 'Contient des sous-dossiers' : undefined}
                  onSelect={() => setASupprimer(d)}
                >
                  <Trash2 />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined,
          enfants: construireNoeuds(d.id),
        };
      });
    };
    return construireNoeuds(null);
  }, [dossiers, enfantsParParent, entiteParId, peutModifier, deplacement, modifier]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const vide = (dossiers ?? []).length === 0;

  return (
    <div>
      <EnTeteSection
        titre="Plan de classement"
        actions={
          peutModifier && (
            <Button variant="outline" onClick={() => setModalState({ mode: 'creer', parentId: null, codePropose: '' })}>
              <FolderPlus />
              Ajouter une série
            </Button>
          )
        }
      />
      <Encart className="mb-4 max-w-3xl">
        Le plan de classement sert au classement des documents par l'archiviste et à la navigation dans les Archives. Les
        codes se saisissent librement ; dès qu'un document est classé dans un dossier, son code et ceux de ses dossiers
        parents sont <b>verrouillés</b> <Lock className="inline size-3.5 align-[-2px]" aria-hidden /> (ainsi que le
        déplacement et la suppression). L'intitulé, l'ordre et les sous-dossiers restent modifiables. Les{' '}
        <b>entités productrices</b> d'une série limitent le dépôt aux agents de ces entités.
      </Encart>

      {vide ? (
        <div className="rounded-lg border border-dashed border-border">
          <EtatVide
            icone={FolderTree}
            titre="Aucun dossier pour le moment"
            description={peutModifier ? 'Importez le plan de classement de la Direction des Routes, ou créez vos séries une à une.' : undefined}
          >
            {peutModifier && (
              <Button onClick={() => importer.mutate()} disabled={importer.isPending}>
                <Download />
                {importer.isPending ? 'Import…' : 'Importer le plan de la Direction des Routes'}
              </Button>
            )}
          </EtatVide>
        </div>
      ) : (
        <Arborescence noeuds={arbre} libelle="Plan de classement" />
      )}

      <DossierFormModal
        open={modalState !== null}
        organisationId={organisationId}
        dossier={modalState?.mode === 'modifier' ? modalState.dossier : null}
        parentDossierId={modalState?.mode === 'creer' ? modalState.parentId : null}
        codePropose={modalState?.mode === 'creer' ? modalState.codePropose : undefined}
        onClose={() => setModalState(null)}
      />

      <ConfirmDialog
        open={aSupprimer !== null}
        onClose={() => setASupprimer(null)}
        titre="Supprimer ce dossier ?"
        libelleConfirmer="Supprimer"
        destructif
        enCours={supprimer.isPending}
        onConfirmer={() => aSupprimer && supprimer.mutate(aSupprimer.id, { onSuccess: () => setASupprimer(null) })}
      >
        <p>
          « {aSupprimer?.code} — {aSupprimer?.libelle} » sera retiré du plan de classement. Cette action est définitive.
        </p>
      </ConfirmDialog>

      <EntitesProductricesModal
        dossier={producteurs}
        organisationId={organisationId}
        entites={(entites ?? []).map((e) => ({ id: e.id, libelle: e.sigle ? `${e.sigle} — ${e.libelle}` : e.libelle }))}
        onClose={() => setProducteurs(null)}
      />
    </div>
  );
}

function EntitesProductricesModal({
  dossier,
  organisationId,
  entites,
  onClose,
}: {
  dossier: GedDossier | null;
  organisationId: string;
  entites: Array<{ id: string; libelle: string }>;
  onClose: () => void;
}) {
  const enregistrer = useEntitesProductrices(organisationId);
  const [choix, setChoix] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (dossier) setChoix(new Set(dossier.entites_productrices ?? []));
  }, [dossier]);

  return (
    <FormDialog
      open={dossier !== null}
      onClose={onClose}
      titre={`Entités productrices — ${dossier?.code ?? ''}`}
      description="Seuls les agents de ces entités (et de leurs sous-entités) pourront proposer ce dossier et ses sous-dossiers lors d'un dépôt. Aucune entité cochée : ouvert à tous. L'archiviste n'est jamais limité."
      enCours={enregistrer.isPending}
      onSubmit={(e) => {
        e.preventDefault();
        if (!dossier) return;
        enregistrer.mutate({ id: dossier.id, entiteIds: [...choix] }, { onSuccess: onClose });
      }}
    >
      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {entites.map((e) => (
          <CaseACocher
            key={e.id}
            checked={choix.has(e.id)}
            onChange={(coche) =>
              setChoix((prev) => {
                const next = new Set(prev);
                if (coche) next.add(e.id);
                else next.delete(e.id);
                return next;
              })
            }
          >
            {e.libelle}
          </CaseACocher>
        ))}
      </div>
    </FormDialog>
  );
}
