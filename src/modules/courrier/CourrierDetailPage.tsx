import { ArrowLeft, Ellipsis, FileLock, FileSearch, Lock, Pencil, Printer, ShieldAlert, Trash2, Unlock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Champ } from '../../components/form/champ';
import { ConfirmDialog } from '../../components/form/confirm-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Skeleton } from '../../components/ui/skeleton';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useCourrier, useCourrierReferentiel, useSupprimerCourrier } from '../../hooks/courrier/useCourriers';
import { useDeverrouillerCourrier } from '../../hooks/courrier/useDecharge';
import { useProfile } from '../../hooks/useProfile';
import { cn } from '../../lib/utils';
import { couleurReferentiel } from '../../utils/couleurReferentiel';
import { fr } from '../../utils/dateFr';
import { CourrierAuditCard } from './CourrierAuditCard';
import { CourrierDechargeModal } from './CourrierDechargeModal';
import { CourrierEditionModal } from './CourrierEditionModal';
import { CourrierImputationPanel } from './CourrierImputationPanel';
import { CourrierInfoCard } from './CourrierInfoCard';
import { CourrierPiecesJointes } from './CourrierPiecesJointes';
import { CourrierWorkflowPanel } from './CourrierWorkflowPanel';
import { estConfidentiel, ICONE_SENS, LABEL_SENS } from './courrierAffichage';
import { FicheExploitationModal } from './FicheExploitationModal';

export function CourrierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const { data: courrier, isLoading, isError } = useCourrier(id);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const supprimer = useSupprimerCourrier();
  const deverrouiller = useDeverrouillerCourrier(id);
  const [ficheOuverte, setFicheOuverte] = useState(false);
  const [dechargeOuverte, setDechargeOuverte] = useState(false);
  const [editionOuverte, setEditionOuverte] = useState(false);
  const [suppressionOuverte, setSuppressionOuverte] = useState(false);
  const [motifDeverrouillage, setMotifDeverrouillage] = useState<string | null>(null);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e])), [entites]);
  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  if (isLoading || !organisationId) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !courrier) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <div className="mb-4 grid size-14 place-items-center rounded-full bg-muted">
          <FileSearch className="size-6 text-muted-foreground" />
        </div>
        <h1 className="font-serif-title text-[24px] font-semibold">Courrier introuvable</h1>
        <p className="mt-1 text-muted-foreground">Ce courrier n'existe pas ou vous n'y avez pas accès.</p>
        <Button className="mt-6" onClick={() => navigate('/courriers')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  const estVerrouille = courrier.verrouille_le !== null;
  const peutModifier =
    !estVerrouille && (courrier.created_by === profile?.id || can('courrier', 'modifier', courrier.entite_id));
  const peutSupprimer = !estVerrouille && can('courrier', 'supprimer', courrier.entite_id);
  const peutDeverrouiller = can('courrier', 'deverrouiller', courrier.entite_id);
  const peutAjouterDecharge = !estVerrouille && courrier.sens === 'sortant' && peutModifier;

  const entite = courrier.entite_id ? entiteParId.get(courrier.entite_id) : undefined;
  const priorite = (referentiel?.priorites ?? []).find((v) => v.id === courrier.priorite_valeur_id);
  const confidentialite = (referentiel?.confidentialites ?? []).find((v) => v.id === courrier.confidentialite_valeur_id);
  const { icone: IconeSens, classe: classeSens } = ICONE_SENS[courrier.sens];

  return (
    <div className="space-y-5">
      <Link to="/courriers" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Courriers
      </Link>

      {estVerrouille && (
        <div role="status" className="flex flex-col gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4 sm:flex-row sm:items-center">
          <Lock className="size-5 shrink-0 text-warn-text" />
          <div className="flex-1 text-[13px]">
            <div className="font-semibold text-warn-text">Courrier verrouillé</div>
            <div className="text-foreground/80">
              Définitivement verrouillé suite à l'ajout d'une décharge
              {courrier.verrouille_par ? ` par ${utilisateurParId.get(courrier.verrouille_par) ?? '—'}` : ''}
              {courrier.verrouille_le ? ` le ${new Date(courrier.verrouille_le).toLocaleString('fr-FR')}` : ''}. Aucune
              modification n'est possible.
            </div>
          </div>
          {peutDeverrouiller && (
            <Button variant="outline" size="sm" onClick={() => setMotifDeverrouillage('')}>
              <Unlock />
              Déverrouiller (exceptionnel)
            </Button>
          )}
        </div>
      )}

      {/* En-tête */}
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <IconeSens className={cn('size-4', classeSens)} />
              Courrier {LABEL_SENS[courrier.sens].toLowerCase()}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-[12px]">{courrier.numero}</span>
            {courrier.etape_libelle && (
              <Badge variant="muted" shape="pill">
                {courrier.etape_libelle}
              </Badge>
            )}
            {priorite && (
              <Badge shape="pill">
                <span className="size-2 rounded-full" style={{ background: couleurReferentiel(priorite.couleur) ?? 'var(--st-neutral)' }} />
                {priorite.libelle}
              </Badge>
            )}
            {estConfidentiel(confidentialite?.code) && (
              <Badge variant="warning" shape="pill">
                <Lock />
                {confidentialite?.libelle}
              </Badge>
            )}
          </div>
          <h1 className="mt-2 font-serif-title text-[26px] font-semibold leading-tight sm:text-[28px]">{courrier.objet}</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {entite ? (entite.sigle ? `${entite.sigle} — ${entite.libelle}` : entite.libelle) : 'Non imputé'} · daté du{' '}
            {fr(courrier.date_courrier).format('D MMMM YYYY')} · enregistré le {fr(courrier.created_at).format('D MMMM YYYY')}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {peutModifier && (
            <Button variant="outline" onClick={() => setEditionOuverte(true)}>
              <Pencil className="text-muted-foreground" />
              Modifier
            </Button>
          )}
          <Button variant="outline" onClick={() => setFicheOuverte(true)}>
            <Printer className="text-muted-foreground" />
            Fiche d'exploitation
          </Button>
          {peutAjouterDecharge && (
            <Button onClick={() => setDechargeOuverte(true)}>
              <FileLock />
              Ajouter une décharge
            </Button>
          )}
          {peutSupprimer && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Plus d'actions">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onSelect={() => setSuppressionOuverte(true)}>
                  <Trash2 />
                  Supprimer le courrier
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_380px]">
        <div className="order-2 min-w-0 space-y-5 xl:order-1">
          <CourrierInfoCard
            courrier={courrier}
            organisationId={organisationId}
            entiteLibelle={entite?.libelle ?? 'Non imputé'}
          />
          <CourrierPiecesJointes courrierId={courrier.id} peutModifier={peutModifier} />
          {/* Version 5 §3/§13 : sur un courrier arrivé, l'imputation se fait
              désormais via les actions modales du workflow (CourrierWorkflowPanel)
              — le panneau statique ci-dessous reste utile pour départ/interne. */}
          {courrier.sens !== 'entrant' && (
            <CourrierImputationPanel courrier={courrier} organisationId={organisationId} peutModifier={peutModifier} />
          )}
          <CourrierAuditCard courrierId={courrier.id} organisationId={organisationId} />
        </div>
        {/* Étape actuelle et actions : en tête sur écran étroit, colonne latérale collante sur grand écran. */}
        <div className="order-1 xl:sticky xl:top-24 xl:order-2">
          <CourrierWorkflowPanel courrier={courrier} organisationId={organisationId} />
        </div>
      </div>

      <CourrierEditionModal
        courrier={courrier}
        organisationId={organisationId}
        open={editionOuverte}
        onClose={() => setEditionOuverte(false)}
      />

      <FicheExploitationModal
        courrierId={courrier.id}
        organisationId={organisationId}
        open={ficheOuverte}
        onClose={() => setFicheOuverte(false)}
      />

      <CourrierDechargeModal courrierId={courrier.id} open={dechargeOuverte} onClose={() => setDechargeOuverte(false)} />

      <ConfirmDialog
        open={suppressionOuverte}
        onClose={() => setSuppressionOuverte(false)}
        titre="Supprimer ce courrier ?"
        libelleConfirmer="Supprimer"
        destructif
        enCours={supprimer.isPending}
        onConfirmer={() => supprimer.mutate(courrier.id, { onSuccess: () => navigate('/courriers') })}
      >
        <p>
          Le courrier <b>{courrier.numero}</b> sera retiré de la liste.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={motifDeverrouillage !== null}
        onClose={() => setMotifDeverrouillage(null)}
        titre="Déverrouiller le courrier (procédure exceptionnelle)"
        libelleConfirmer="Déverrouiller"
        destructif
        enCours={deverrouiller.isPending}
        confirmerDesactive={!motifDeverrouillage?.trim()}
        onConfirmer={() => motifDeverrouillage && deverrouiller.mutate(motifDeverrouillage, { onSuccess: () => setMotifDeverrouillage(null) })}
      >
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-crit/10 p-3 text-[13px] font-medium text-crit-text">
          <ShieldAlert className="size-4 shrink-0" />
          Cette action est journalisée et tracée nominativement.
        </div>
        <Champ label="Motif du déverrouillage" htmlFor="motif-deverrouillage" requis>
          <Textarea
            id="motif-deverrouillage"
            rows={3}
            autoFocus
            value={motifDeverrouillage ?? ''}
            onChange={(e) => setMotifDeverrouillage(e.target.value)}
          />
        </Champ>
      </ConfirmDialog>
    </div>
  );
}
