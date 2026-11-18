import { useState } from 'react';
import { Skeleton } from '../../../components/ui/skeleton';
import { useProfile } from '../../../hooks/useProfile';
import { cn } from '../../../lib/utils';
import { CourrierParametresManager } from './CourrierParametresManager';
import { EnteteDocumentManager } from './EnteteDocumentManager';
import { ListesValeursManager } from './ListesValeursManager';
import { ParametresOrganisationManager } from './ParametresOrganisationManager';
import { PlanClassementManager } from './PlanClassementManager';
import { ReglesNumerotationManager } from './ReglesNumerotationManager';
import { SmtpParametresManager } from './SmtpParametresManager';
import { TypesMarcheManager } from '../../marches/administration/TypesMarcheManager';
import { useAccesAdministration } from '../../../hooks/administration/useAccesAdministration';

type SousSection = 'listes' | 'numerotation' | 'parametres' | 'courrier' | 'entete' | 'smtp' | 'plan-classement' | 'marches';

export function ParametrageTab() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;
  const peutModifier = can('administration', 'modifier');
  // Le plan de classement (catégories GED) suit les droits GED, pas
  // administration : réservé à l'administrateur et à l'archiviste, invisible
  // pour les autres rôles (même en lecture seule).
  const acces = useAccesAdministration();
  const peutGererPlanClassement = acces.parametrage.planClassement;
  // Recette 2026-11 : types de marché et phases → cellule de passation et
  // administrateurs (MarchesAccesService.peutParametrer).
  const peutGererMarches = acces.parametrage.marches;
  const [choix, setChoix] = useState<SousSection | null>(null);

  if (!organisationId) return <Skeleton className="h-64 w-full" />;

  // v8.6.4 : seules les sous-rubriques ouvertes à l'utilisateur s'affichent
  // (l'archiviste ne voit que le plan de classement, la cellule de passation
  // que les marchés).
  const general = acces.parametrage.general;
  const sections: { cle: SousSection; libelle: string }[] = [
    ...(general
      ? ([
          { cle: 'listes', libelle: 'Listes de valeurs' },
          { cle: 'numerotation', libelle: 'Numérotation' },
          { cle: 'parametres', libelle: 'Paramètres' },
          { cle: 'courrier', libelle: 'Courrier' },
          { cle: 'entete', libelle: 'En-tête document' },
          { cle: 'smtp', libelle: 'Notifications (SMTP)' },
        ] as const)
      : []),
    ...(peutGererPlanClassement ? [{ cle: 'plan-classement' as const, libelle: 'Plan de classement' }] : []),
    ...(peutGererMarches || general ? [{ cle: 'marches' as const, libelle: 'Marchés' }] : []),
  ];
  const actif: SousSection | undefined = sections.find((s) => s.cle === choix)?.cle ?? sections[0]?.cle;
  const setActif = setChoix;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Paramétrage" className="flex flex-wrap gap-1.5">
        {sections.map((s) => (
          <button
            key={s.cle}
            type="button"
            role="tab"
            aria-selected={actif === s.cle}
            onClick={() => setActif(s.cle)}
            className={cn(
              'h-8 cursor-pointer rounded-full border px-3 text-[13px] font-medium transition-colors',
              actif === s.cle
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {s.libelle}
          </button>
        ))}
      </div>

      <div>
        {actif === 'listes' && general && <ListesValeursManager organisationId={organisationId} peutModifier={peutModifier} />}
        {actif === 'numerotation' && <ReglesNumerotationManager organisationId={organisationId} peutModifier={peutModifier} />}
        {actif === 'parametres' && <ParametresOrganisationManager organisationId={organisationId} peutModifier={peutModifier} />}
        {actif === 'courrier' && <CourrierParametresManager organisationId={organisationId} peutModifier={peutModifier} />}
        {actif === 'entete' && <EnteteDocumentManager organisationId={organisationId} peutModifier={peutModifier} />}
        {actif === 'smtp' && <SmtpParametresManager organisationId={organisationId} peutModifier={peutModifier} />}
        {actif === 'plan-classement' && peutGererPlanClassement && (
          <PlanClassementManager organisationId={organisationId} peutModifier={peutGererPlanClassement} />
        )}
        {actif === 'marches' && <TypesMarcheManager organisationId={organisationId} peutModifier={peutGererMarches} />}
      </div>
    </div>
  );
}
