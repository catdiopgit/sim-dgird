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

type SousSection = 'listes' | 'numerotation' | 'parametres' | 'courrier' | 'entete' | 'smtp' | 'plan-classement' | 'marches';

export function ParametrageTab() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;
  const peutModifier = can('administration', 'modifier');
  // Le plan de classement (catégories GED) suit les droits GED, pas
  // administration : réservé à l'administrateur et à l'archiviste, invisible
  // pour les autres rôles (même en lecture seule).
  const peutGererPlanClassement = can('ged', 'modifier');
  const peutGererMarches = can('marches', 'modifier');
  const [actif, setActif] = useState<SousSection>('listes');

  if (!organisationId) return <Skeleton className="h-64 w-full" />;

  const sections: { cle: SousSection; libelle: string }[] = [
    { cle: 'listes', libelle: 'Listes de valeurs' },
    { cle: 'numerotation', libelle: 'Numérotation' },
    { cle: 'parametres', libelle: 'Paramètres' },
    { cle: 'courrier', libelle: 'Courrier' },
    { cle: 'entete', libelle: 'En-tête document' },
    { cle: 'smtp', libelle: 'Notifications (SMTP)' },
    ...(peutGererPlanClassement ? [{ cle: 'plan-classement' as const, libelle: 'Plan de classement' }] : []),
    { cle: 'marches', libelle: 'Marchés' },
  ];

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
        {actif === 'listes' && <ListesValeursManager organisationId={organisationId} peutModifier={peutModifier} />}
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
