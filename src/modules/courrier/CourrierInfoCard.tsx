import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useCourrierReferentiel } from '../../hooks/courrier/useCourriers';
import type { Courrier } from '../../services/courrier/courriers';
import { fr } from '../../utils/dateFr';

interface Props {
  courrier: Courrier;
  organisationId: string;
  entiteLibelle: string;
}

function Ligne({ label, children, pleine }: { label: string; children: ReactNode; pleine?: boolean }) {
  return (
    <div className={pleine ? 'sm:col-span-2' : undefined}>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[14px]">{children ?? '—'}</dd>
    </div>
  );
}

// Présentation seule : l'édition (CourrierEditionModal) est déclenchée depuis
// l'en-tête de la fiche (CourrierDetailPage).
export function CourrierInfoCard({ courrier, organisationId, entiteLibelle }: Props) {
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);

  const libelle = (liste: { id: string; libelle: string }[] | undefined, id: string | null) =>
    id ? liste?.find((v) => v.id === id)?.libelle : undefined;
  const agent = (utilisateurs ?? []).find((u) => u.id === courrier.agent_destinataire_id);
  const dateHeure = (d: string | null) => (d ? fr(d).format('D MMMM YYYY à HH:mm') : undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Ligne label="Entité en charge">{entiteLibelle}</Ligne>
          <Ligne label="Date du courrier">{fr(courrier.date_courrier).format('D MMMM YYYY')}</Ligne>
          <Ligne label="Type">{libelle(referentiel?.types, courrier.type_valeur_id)}</Ligne>
          <Ligne label="Confidentialité">{libelle(referentiel?.confidentialites, courrier.confidentialite_valeur_id)}</Ligne>

          {courrier.sens === 'entrant' && (
            <>
              <Ligne label="Expéditeur">{courrier.expediteur_nom}</Ligne>
              <Ligne label="Référence expéditeur">{courrier.reference_expediteur}</Ligne>
              <Ligne label="Date de réception">{dateHeure(courrier.date_reception)}</Ligne>
              <Ligne label="Statut à la réception">
                {libelle(referentiel?.statutsReception, courrier.statut_reception_valeur_id)}
              </Ligne>
              <Ligne label="Agent destinataire (imputation)">{agent ? `${agent.prenom} ${agent.nom}` : undefined}</Ligne>
            </>
          )}
          {courrier.sens === 'sortant' && (
            <>
              <Ligne label="Destinataire">{courrier.destinataire_texte}</Ligne>
              <Ligne label="Mode de transmission">
                {libelle(referentiel?.modesTransmission, courrier.mode_transmission_valeur_id)}
              </Ligne>
              <Ligne label="Date d'envoi">{dateHeure(courrier.date_envoi)}</Ligne>
            </>
          )}

          <Ligne label="Observations" pleine>
            {courrier.observations ? <p className="whitespace-pre-line">{courrier.observations}</p> : undefined}
          </Ligne>
        </dl>
      </CardContent>
    </Card>
  );
}
