import { Skeleton, Tabs } from 'antd';
import { useProfile } from '../../../hooks/useProfile';
import { TypesMarcheManager } from '../../marches/administration/TypesMarcheManager';
import { CourrierParametresManager } from './CourrierParametresManager';
import { EnteteDocumentManager } from './EnteteDocumentManager';
import { ListesValeursManager } from './ListesValeursManager';
import { ParametresOrganisationManager } from './ParametresOrganisationManager';
import { PlanClassementManager } from './PlanClassementManager';
import { ReglesNumerotationManager } from './ReglesNumerotationManager';
import { SmtpParametresManager } from './SmtpParametresManager';

export function ParametrageTab() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;
  const peutModifier = can('administration', 'modifier');
  const peutGererMarches = can('marches', 'modifier');
  // Le plan de classement (catégories GED) suit les droits GED, pas
  // administration : réservé à l'administrateur et à l'archiviste, invisible
  // pour les autres rôles (même en lecture seule).
  const peutGererPlanClassement = can('ged', 'modifier');

  if (!organisationId) return <Skeleton active />;

  return (
    <Tabs
      type="card"
      items={[
        {
          key: 'listes',
          label: 'Listes de valeurs',
          children: <ListesValeursManager organisationId={organisationId} peutModifier={peutModifier} />,
        },
        {
          key: 'numerotation',
          label: 'Numérotation',
          children: <ReglesNumerotationManager organisationId={organisationId} peutModifier={peutModifier} />,
        },
        {
          key: 'parametres',
          label: 'Paramètres',
          children: <ParametresOrganisationManager organisationId={organisationId} peutModifier={peutModifier} />,
        },
        {
          key: 'courrier',
          label: 'Courrier',
          children: <CourrierParametresManager organisationId={organisationId} peutModifier={peutModifier} />,
        },
        {
          key: 'entete',
          label: 'En-tête document',
          children: <EnteteDocumentManager organisationId={organisationId} peutModifier={peutModifier} />,
        },
        {
          key: 'smtp',
          label: 'Notifications (SMTP)',
          children: <SmtpParametresManager organisationId={organisationId} peutModifier={peutModifier} />,
        },
        {
          key: 'marches',
          label: 'Marchés',
          children: <TypesMarcheManager organisationId={organisationId} peutModifier={peutGererMarches} />,
        },
        ...(peutGererPlanClassement
          ? [
              {
                key: 'plan-classement',
                label: 'Plan de classement',
                children: (
                  <PlanClassementManager organisationId={organisationId} peutModifier={peutGererPlanClassement} />
                ),
              },
            ]
          : []),
      ]}
    />
  );
}
