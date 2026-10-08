import { Award, Banknote, CircleCheck, CircleDashed, Clock, FileText, Layers, TriangleAlert, Users, type LucideIcon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useDocumentsMarche } from '../../hooks/marches/useDocumentsMarche';
import { useMarcheAttribution } from '../../hooks/marches/useMarcheAttribution';
import { useMarcheCandidats } from '../../hooks/marches/useMarcheCandidats';
import { usePhasesMarche } from '../../hooks/marches/usePhasesMarche';
import { BarreAvancement } from '../projets/projetAffichage';
import type { Marche } from '../../services/marches/marches';
import { dateCourte, montantFcfa } from './marcheAffichage';

interface Props {
  marche: Marche;
  entiteParId: Map<string, string>;
  typeParId: Map<string, string>;
  utilisateurParId: Map<string, string>;
  candidatParId: Map<string, string>;
}

function Tuile({ titre, valeur, detail, icone: Icone }: { titre: string; valeur: ReactNode; detail?: ReactNode; icone: LucideIcon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Icone className="size-4" />
        {titre}
      </div>
      <div className="mt-2 text-[24px] font-semibold leading-none tabular-nums">{valeur}</div>
      {detail && <div className="mt-1.5 text-[12px] text-muted-foreground">{detail}</div>}
    </div>
  );
}

function Ligne({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[14px]">{children ?? '—'}</dd>
    </div>
  );
}

const TON_STATUT_GLOBAL = {
  cloture: 'success',
  retard: 'critical',
  avenir: 'muted',
  encours: 'outline',
} as const;

// §21 Vue d'ensemble — état global, progression des phases, prochaines
// échéances et écarts prévu/réel, entreprises/attribution, à l'image de
// ProjetVueEnsembleTab côté Projets.
export function MarcheVueEnsembleTab({ marche, entiteParId, typeParId, utilisateurParId, candidatParId }: Props) {
  const { data: phases } = usePhasesMarche(marche.id);
  const { data: documents } = useDocumentsMarche(marche.id);
  const { data: candidats } = useMarcheCandidats(marche.id);
  const { data: attribution } = useMarcheAttribution(marche.id);

  const repartition = useMemo(() => {
    const compte = { realisees: 0, enCours: 0, enRetard: 0, aVenir: 0, total: phases?.length ?? 0 };
    for (const p of phases ?? []) {
      if (p.statut_calcule.startsWith('realisee')) compte.realisees += 1;
      else if (p.statut_calcule === 'en_cours') compte.enCours += 1;
      else if (p.statut_calcule === 'en_retard') compte.enRetard += 1;
      else compte.aVenir += 1;
    }
    return compte;
  }, [phases]);

  const avancementPct = repartition.total > 0 ? Math.round((repartition.realisees / repartition.total) * 100) : 0;

  const prochaineEcheance = useMemo(
    () =>
      (phases ?? [])
        .filter((p) => !p.date_fin_reelle && p.date_fin_prevue)
        .sort((a, b) => (a.date_fin_prevue! < b.date_fin_prevue! ? -1 : 1))[0] ?? null,
    [phases],
  );

  const statutGlobal = useMemo(() => {
    if (marche.statut_cloture === 'cloture') return { libelle: 'Clôturé', ton: TON_STATUT_GLOBAL.cloture };
    if (repartition.enRetard > 0) return { libelle: 'En retard', ton: TON_STATUT_GLOBAL.retard };
    if (!marche.date_debut_prevue || dayjsAfter(marche.date_debut_prevue)) return { libelle: 'À venir', ton: TON_STATUT_GLOBAL.avenir };
    return { libelle: 'En cours', ton: TON_STATUT_GLOBAL.encours };
  }, [marche, repartition]);

  const segments = [
    { cle: 'realisees', libelle: 'Phases terminées', valeur: repartition.realisees, couleur: 'var(--st-good)', Icone: CircleCheck },
    { cle: 'enCours', libelle: 'Phases en cours', valeur: repartition.enCours, couleur: 'var(--st-info)', Icone: CircleDashed },
    { cle: 'enRetard', libelle: 'Phases en retard', valeur: repartition.enRetard, couleur: 'var(--st-crit)', Icone: TriangleAlert },
    { cle: 'aVenir', libelle: 'Phases à venir', valeur: repartition.aVenir, couleur: 'var(--st-neutral)', Icone: Clock },
  ];
  const visibles = segments.filter((s) => s.valeur > 0);

  return (
    <div className="space-y-5">
      {repartition.enRetard > 0 && (
        <div role="status" className="flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warn-text" />
          <div className="text-[13px]">
            <div className="font-semibold text-warn-text">Points nécessitant une attention</div>
            <p className="mt-1">{repartition.enRetard} phase(s) en retard sur ce marché.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[13px] text-muted-foreground">État global</div>
          <div className="mt-2.5">
            <Badge variant={statutGlobal.ton} shape="pill" className="text-[13px]">
              {statutGlobal.libelle}
            </Badge>
          </div>
        </div>
        <Tuile titre="Progression des phases" valeur={`${avancementPct} %`} icone={CircleCheck} detail={`${repartition.realisees} / ${repartition.total} terminée(s)`} />
        <Tuile titre="Phases" valeur={repartition.total} icone={Layers} />
        <Tuile titre="Documents" valeur={documents?.length ?? 0} icone={FileText} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Avancement des phases</CardTitle>
          </CardHeader>
          <CardContent>
            <BarreAvancement pct={avancementPct} className="mb-5" />
            {repartition.total === 0 ? (
              <p className="py-4 text-center text-[13px] text-muted-foreground">Aucune phase planifiée.</p>
            ) : (
              <>
                <div className="mb-5 flex h-3 gap-[2px]" role="img" aria-label={segments.map((s) => `${s.libelle} ${s.valeur}`).join(', ')}>
                  {visibles.map((s, i) => (
                    <div
                      key={s.cle}
                      title={`${s.libelle} : ${s.valeur}`}
                      className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === visibles.length - 1 ? 'rounded-r-full' : ''}`}
                      style={{ width: `${(s.valeur / repartition.total) * 100}%`, minWidth: 6, background: s.couleur }}
                    />
                  ))}
                </div>
                <ul className="space-y-3">
                  {segments.map(({ cle, libelle, valeur, couleur, Icone }) => (
                    <li key={cle} className="flex items-center gap-3 text-[13px]">
                      <span
                        className="grid size-7 place-items-center rounded-md"
                        style={{ background: `color-mix(in srgb, ${couleur} 14%, transparent)`, color: couleur }}
                      >
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
            <CardTitle>Entreprises / consultants et attribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/60 p-3 sm:col-span-2">
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Award className="size-3.5" />
                  Attributaire
                </div>
                <div className="mt-1.5 text-[15px] font-semibold">
                  {attribution ? (candidatParId.get(attribution.candidat_attributaire_id) ?? '—') : '—'}
                </div>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Users className="size-3.5" />
                  Candidats enregistrés
                </div>
                <div className="mt-1.5 text-[15px] font-semibold tabular-nums">{candidats?.length ?? 0}</div>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Banknote className="size-3.5" />
                  Montant attribué
                </div>
                <div className="mt-1.5 text-[15px] font-semibold tabular-nums">{montantFcfa(attribution?.montant_attribue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Ligne label="Type de marché">{typeParId.get(marche.type_marche_id) ?? '—'}</Ligne>
            <Ligne label="Entité porteuse">{entiteParId.get(marche.entite_id) ?? '—'}</Ligne>
            <Ligne label="Responsable">{marche.responsable_id ? (utilisateurParId.get(marche.responsable_id) ?? '—') : '—'}</Ligne>
            <Ligne label="Montant estimatif">{montantFcfa(marche.montant_estimatif)}</Ligne>
            <Ligne label="Début prévisionnel">{dateCourte(marche.date_debut_prevue)}</Ligne>
            <Ligne label="Fin prévisionnelle">{dateCourte(marche.date_fin_prevue)}</Ligne>
            <Ligne label="Prochaine échéance" className="sm:col-span-2 lg:col-span-3">
              {prochaineEcheance ? `${prochaineEcheance.nom} — ${dateCourte(prochaineEcheance.date_fin_prevue)}` : 'Aucune'}
            </Ligne>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function dayjsAfter(date: string): boolean {
  return new Date(date).getTime() > Date.now();
}
