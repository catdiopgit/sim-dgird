import { Banknote, CircleCheck, CircleDashed, CircleX, FileSignature, Package, TriangleAlert, Wallet, type LucideIcon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAvenants } from '../../hooks/projets/useAvenants';
import { useContactsExecution } from '../../hooks/projets/useContactsExecution';
import { useDecaissements } from '../../hooks/projets/useDecaissements';
import { useDocumentsProjet } from '../../hooks/projets/useDocumentsProjet';
import { useLivrables } from '../../hooks/projets/useLivrables';
import type { Projet } from '../../services/projets/projets';
import type { ProjetsReferentiel } from '../../services/projets/referentiel';
import { fr } from '../../utils/dateFr';
import { formatMontant, montantCourt } from '../../utils/format';

interface Props {
  projet: Projet;
  referentiel: ProjetsReferentiel | undefined;
  entiteParId: Map<string, string>;
  utilisateurParId: Map<string, string>;
}

const LIBELLES_ORGANISME: Record<Projet['organisme_execution_type'], string> = {
  organisation: "L'organisation elle-même",
  consultant: 'Consultant',
  entreprise: 'Entreprise',
  externe: 'Autre organisme externe',
};

function Tuile({ titre, valeur, detail, icone: Icone, ton }: { titre: string; valeur: ReactNode; detail?: ReactNode; icone: LucideIcon; ton?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Icone className="size-4" style={ton ? { color: ton } : undefined} />
        {titre}
      </div>
      <div className="mt-2 text-[24px] font-semibold leading-none tabular-nums">{valeur}</div>
      {detail && <div className="mt-1.5 text-[12px] text-muted-foreground">{detail}</div>}
    </div>
  );
}

function Ligne({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[14px]">{children ?? '—'}</dd>
    </div>
  );
}

// §7 Vue d'ensemble : tableau de pilotage du projet — avancement (calculé
// automatiquement à partir des livrables, §6), situation financière
// (décaissements vs budget), équipe de direction, et alertes sur les points
// nécessitant une attention (poids des livrables, retards, justificatifs
// manquants, dépassement budgétaire).
export function ProjetVueEnsembleTab({ projet, referentiel, entiteParId, utilisateurParId }: Props) {
  const { data: livrables } = useLivrables(projet.id);
  const { data: documents } = useDocumentsProjet(projet.id);
  const { data: avenants } = useAvenants(projet.id);
  const { data: decaissements } = useDecaissements(projet.id);
  const { data: contacts } = useContactsExecution(projet.id);

  const statutLivrableParId = useMemo(
    () => new Map((referentiel?.statutsLivrable ?? []).map((v) => [v.id, v])),
    [referentiel],
  );
  const contactParId = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, c.nom])), [contacts]);

  const repartitionLivrables = useMemo(() => {
    const compte = { realises: 0, enCours: 0, nonRealises: 0, total: livrables?.length ?? 0, poidsTotal: 0 };
    for (const l of livrables ?? []) {
      compte.poidsTotal += l.poids_pct;
      const code = l.statut_valeur_id ? statutLivrableParId.get(l.statut_valeur_id)?.code : null;
      if (code === 'realise' || code === 'valide') compte.realises += 1;
      else if (code === 'en-cours') compte.enCours += 1;
      else compte.nonRealises += 1;
    }
    return compte;
  }, [livrables, statutLivrableParId]);

  const cumulPct = useMemo(() => (decaissements ?? []).reduce((s, d) => s + d.pourcentage, 0), [decaissements]);
  const cumulMontant = useMemo(() => (decaissements ?? []).reduce((s, d) => s + d.montant, 0), [decaissements]);
  const cumulContrat = useMemo(
    () => (decaissements ?? []).filter((d) => !d.avenant_id).reduce((s, d) => s + d.montant, 0),
    [decaissements],
  );
  const cumulAvenants = useMemo(
    () => (decaissements ?? []).filter((d) => d.avenant_id).reduce((s, d) => s + d.montant, 0),
    [decaissements],
  );
  // §3 (V3 bis) : le montant contractuel consolidé intègre les avenants —
  // le contrat d'origine seul ne suffit plus à représenter l'engagement
  // financier réel du projet une fois des avenants signés.
  const montantAvenants = useMemo(() => (avenants ?? []).reduce((s, a) => s + (a.montant ?? 0), 0), [avenants]);
  const montantContractuel =
    projet.budget_prevu != null || montantAvenants > 0 ? (projet.budget_prevu ?? 0) + montantAvenants : null;
  const solde = montantContractuel != null ? montantContractuel - cumulMontant : null;
  const dernierDecaissement = useMemo(
    () => (decaissements ?? [])[0] ?? null, // déjà trié par date_decaissement desc côté service
    [decaissements],
  );
  const pctFinancier = montantContractuel ? Math.round((cumulMontant / montantContractuel) * 10000) / 100 : cumulPct;

  const nomChargeExecution = projet.charge_execution_utilisateur_id
    ? (utilisateurParId.get(projet.charge_execution_utilisateur_id) ?? '—')
    : projet.charge_execution_contact_id
      ? (contactParId.get(projet.charge_execution_contact_id) ?? '—')
      : null;

  const alertes = useMemo(() => {
    const liste: string[] = [];
    if ((livrables?.length ?? 0) > 0 && repartitionLivrables.poidsTotal !== 100) {
      liste.push(`La somme des quote-parts des livrables est de ${repartitionLivrables.poidsTotal}% (devrait être 100%).`);
    }
    const enRetard = (livrables ?? []).filter(
      (l) => (l.statut_valeur_id ? statutLivrableParId.get(l.statut_valeur_id)?.code : null) === 'en-retard',
    ).length;
    if (enRetard > 0) liste.push(`${enRetard} livrable(s) en retard.`);
    const sansJustificatif = (livrables ?? []).filter((l) => {
      const code = l.statut_valeur_id ? statutLivrableParId.get(l.statut_valeur_id)?.code : null;
      if (code !== 'realise' && code !== 'valide') return false;
      return !(documents ?? []).some((d) => d.livrable_id === l.id);
    }).length;
    if (sansJustificatif > 0) liste.push(`${sansJustificatif} livrable(s) réalisé(s) sans document justificatif.`);
    if (montantContractuel != null && cumulMontant > montantContractuel) {
      liste.push('Le cumul des décaissements dépasse le montant contractuel (contrat + avenants).');
    }
    return liste;
  }, [livrables, repartitionLivrables, statutLivrableParId, documents, montantContractuel, cumulMontant]);

  const total = repartitionLivrables.total;
  const segments = [
    { cle: 'realises', libelle: 'Réalisés', valeur: repartitionLivrables.realises, couleur: 'var(--st-good)', Icone: CircleCheck },
    { cle: 'enCours', libelle: 'En cours', valeur: repartitionLivrables.enCours, couleur: 'var(--st-info)', Icone: CircleDashed },
    { cle: 'nonRealises', libelle: 'Non réalisés', valeur: repartitionLivrables.nonRealises, couleur: 'var(--st-crit)', Icone: CircleX },
  ];
  const visibles = segments.filter((s) => s.valeur > 0);

  return (
    <div className="space-y-5">
      {alertes.length > 0 && (
        <div role="status" className="flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warn-text" />
          <div className="text-[13px]">
            <div className="font-semibold text-warn-text">Points nécessitant une attention</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {alertes.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tuile titre="Livrables" valeur={total} icone={Package} detail={`${repartitionLivrables.realises} réalisé${repartitionLivrables.realises > 1 ? 's' : ''}`} />
        <Tuile titre="Avenants" valeur={avenants?.length ?? 0} icone={FileSignature} detail={montantAvenants > 0 ? `${montantCourt(montantAvenants)} FCFA` : undefined} />
        <Tuile
          titre="Montant du projet"
          valeur={montantContractuel != null ? montantCourt(montantContractuel) : '—'}
          icone={Wallet}
          detail={montantContractuel != null ? 'FCFA · contrat + avenants' : undefined}
        />
        <Tuile
          titre="Solde restant"
          valeur={solde != null ? montantCourt(solde) : '—'}
          icone={Banknote}
          detail={solde != null ? 'FCFA à décaisser' : undefined}
          ton={solde != null && solde < 0 ? 'var(--st-crit)' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Livrables</CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">Aucun livrable défini.</p>
            ) : (
              <>
                <div className="mb-5 flex h-3 gap-[2px]" role="img" aria-label={segments.map((s) => `${s.libelle} ${s.valeur}`).join(', ')}>
                  {visibles.map((s, i) => (
                    <div
                      key={s.cle}
                      title={`${s.libelle} : ${s.valeur}`}
                      className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === visibles.length - 1 ? 'rounded-r-full' : ''}`}
                      style={{ width: `${(s.valeur / total) * 100}%`, minWidth: 6, background: s.couleur }}
                    />
                  ))}
                </div>
                <ul className="space-y-3">
                  {segments.map(({ cle, libelle, valeur, couleur, Icone }) => (
                    <li key={cle} className="flex items-center gap-3 text-[13px]">
                      <span className="grid size-7 place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${couleur} 14%, transparent)`, color: couleur }}>
                        <Icone className="size-3.5" />
                      </span>
                      <span className="flex-1">{libelle}</span>
                      <span className="font-semibold tabular-nums">{valeur}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Situation financière</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[30px] font-semibold leading-none tabular-nums">
              {pctFinancier.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %
            </div>
            <div className="mt-1.5 text-[13px] text-muted-foreground">
              décaissés · <span className="font-medium text-foreground">{formatMontant(cumulMontant)}</span>
              {montantContractuel != null && <> sur {formatMontant(montantContractuel)}</>}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={pctFinancier > 100 ? 'h-full rounded-full bg-crit' : 'h-full rounded-full bg-primary'}
                style={{ width: `${Math.min(100, pctFinancier)}%` }}
              />
            </div>
            <dl className="mt-5 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
              <div className="rounded-lg bg-muted/70 p-3">
                <dt className="text-[12px] text-muted-foreground">Décaissé sur le contrat d'origine</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{formatMontant(cumulContrat)}</dd>
              </div>
              <div className="rounded-lg bg-muted/70 p-3">
                <dt className="text-[12px] text-muted-foreground">Décaissé sur avenants</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{formatMontant(cumulAvenants)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-[12px] text-muted-foreground">
              Dernier décaissement :{' '}
              {dernierDecaissement
                ? `${formatMontant(dernierDecaissement.montant)} le ${fr(dernierDecaissement.date_decaissement).format('D MMMM YYYY')}`
                : 'aucun'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pilotage</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <Ligne label="Entité porteuse">{entiteParId.get(projet.entite_id)}</Ligne>
            <Ligne label="Responsable du projet">{projet.responsable_id ? utilisateurParId.get(projet.responsable_id) : undefined}</Ligne>
            <Ligne label="Organisme chargé de l'exécution">
              {LIBELLES_ORGANISME[projet.organisme_execution_type]}
              {projet.organisme_execution_type !== 'organisation' && projet.organisme_execution_nom
                ? ` — ${projet.organisme_execution_nom}`
                : ''}
            </Ligne>
            <Ligne label="Chargé de l'exécution">{nomChargeExecution ?? undefined}</Ligne>
            <Ligne label="Date de début">{projet.date_debut ? fr(projet.date_debut).format('D MMMM YYYY') : undefined}</Ligne>
            <Ligne label="Date de fin prévue">{projet.date_fin_prevue ? fr(projet.date_fin_prevue).format('D MMMM YYYY') : undefined}</Ligne>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
