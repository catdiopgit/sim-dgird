import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useAuditCourrier } from '../../hooks/courrier/useAudit';
import { useContacts } from '../../hooks/courrier/useContacts';
import { useCourrierReferentiel } from '../../hooks/courrier/useCourriers';
import { cn } from '../../lib/utils';
import { fr } from '../../utils/dateFr';

interface Props {
  courrierId: string;
  organisationId: string;
}

const LABEL_ACTION: Record<string, string> = {
  creer: 'Création',
  modifier: 'Modification',
  supprimer: 'Suppression',
};

// Libellés des colonnes de public.courriers renvoyées par le journal (noms
// techniques sinon). Les colonnes absentes restent affichées telles quelles.
const LIBELLE_CHAMP: Record<string, string> = {
  numero: 'Numéro',
  objet: 'Objet',
  sens: 'Sens',
  entite_id: 'Entité en charge',
  type_valeur_id: 'Type',
  priorite_valeur_id: 'Priorité',
  confidentialite_valeur_id: 'Confidentialité',
  mode_transmission_valeur_id: 'Mode de transmission',
  date_courrier: 'Date du courrier',
  date_reception: 'Date de réception',
  date_envoi: "Date d'envoi",
  expediteur_nom: 'Expéditeur',
  expediteur_type_valeur_id: "Type d'expéditeur",
  expediteur_contact_id: 'Expéditeur',
  destinataire_texte: 'Destinataire',
  entite_destinataire_id: 'Entité destinataire',
  agent_destinataire_id: 'Agent destinataire',
  contact_destinataire_id: 'Destinataire',
  statut_reception_valeur_id: 'Statut de réception',
  reference_expediteur: "Référence de l'expéditeur",
  redacteur_id: 'Rédacteur',
  etape_libelle: 'Étape',
  observations: 'Observations',
  verrouille_le: 'Verrouillé le',
  verrouille_par: 'Verrouillé par',
  supprime_le: 'Supprimé le',
};

// Colonnes techniques sans intérêt pour le lecteur (etape_code double
// etape_libelle ; les identifiants internes ne se lisent pas).
const CHAMPS_MASQUES = new Set(['etape_code', 'workflow_instance_id', 'courrier_parent_id', 'id', 'organisation_id', 'created_by', 'created_at']);

const CHAMPS_UTILISATEUR = new Set(['agent_destinataire_id', 'redacteur_id', 'verrouille_par']);
const CHAMPS_ENTITE = new Set(['entite_id', 'entite_destinataire_id']);
const CHAMPS_CONTACT = new Set(['expediteur_contact_id', 'contact_destinataire_id']);
const CHAMPS_DATE = new Set(['date_courrier', 'date_reception', 'date_envoi', 'verrouille_le', 'supprime_le']);
const LABEL_SENS: Record<string, string> = { entrant: 'Arrivé', sortant: 'Départ', interne: 'Interne' };

const RANG_ACTION = (action: string) => ({ creer: 0, modifier: 1, supprimer: 2 })[action] ?? 1;

type ChangementChamp = { champ: string; ancienne_valeur: string | null; nouvelle_valeur: string | null };

function ordonnerParChainage<T extends ChangementChamp>(champs: T[]): T[] {
  const parChamp = new Map<string, T[]>();
  for (const c of champs) parChamp.set(c.champ, [...(parChamp.get(c.champ) ?? []), c]);
  const resultat: T[] = [];
  for (const liste of parChamp.values()) {
    if (liste.length < 2) {
      resultat.push(...liste);
      continue;
    }
    const restants = [...liste];
    const nouvelles = new Set(restants.map((c) => c.nouvelle_valeur));
    // Point de départ : le changement dont l'ancienne valeur n'est la
    // nouvelle d'aucun autre (à défaut, l'ordre reçu est conservé).
    let courant = restants.find((c) => !nouvelles.has(c.ancienne_valeur)) ?? restants[0];
    while (courant) {
      resultat.push(courant);
      restants.splice(restants.indexOf(courant), 1);
      const suivant: T | undefined = restants.find((c) => c.ancienne_valeur === courant!.nouvelle_valeur) ?? restants[0];
      courant = suivant!;
    }
  }
  return resultat;
}

// Historique d'audit du courrier (plan V4 §10) : regroupe les entrées de
// public.fn_journal_audit_courrier par événement (created_at+action) — une
// création affiche un simple résumé, une modification liste les champs
// réellement changés (avant → après).
export function CourrierAuditCard({ courrierId, organisationId }: Props) {
  const { data: entrees, isLoading } = useAuditCourrier(courrierId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: contacts } = useContacts(organisationId);
  const { data: referentiel } = useCourrierReferentiel(organisationId);

  const utilisateurParId = useMemo(
    () => new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`])),
    [utilisateurs],
  );

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const contactParId = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, c.nom])), [contacts]);
  const valeurListeParId = useMemo(
    () => new Map(Object.values(referentiel ?? {}).flat().map((v) => [v.id, v.libelle])),
    [referentiel],
  );

  // Valeur lisible : identifiants résolus, dates formatées, sinon brute.
  const lisible = (champ: string, valeur: string | null) => {
    if (valeur == null || valeur === '') return '—';
    if (champ === 'sens') return LABEL_SENS[valeur] ?? valeur;
    if (champ.endsWith('_valeur_id')) return valeurListeParId.get(valeur) ?? valeur;
    if (CHAMPS_ENTITE.has(champ)) return entiteParId.get(valeur) ?? valeur;
    if (CHAMPS_UTILISATEUR.has(champ)) return utilisateurParId.get(valeur) ?? valeur;
    if (CHAMPS_CONTACT.has(champ)) return contactParId.get(valeur) ?? valeur;
    if (CHAMPS_DATE.has(champ)) {
      const d = fr(valeur);
      return d.isValid() ? d.format(valeur.length > 10 ? 'D MMM YYYY à HH:mm' : 'D MMM YYYY') : valeur;
    }
    return valeur;
  };

  const evenements = useMemo(() => {
    const groupes = new Map<string, { action: string; created_at: string; utilisateur_id: string | null; champs: typeof entrees }>();
    for (const e of entrees ?? []) {
      const cle = `${e.created_at}-${e.action}`;
      const groupe = groupes.get(cle);
      if (groupe) {
        groupe.champs!.push(e);
      } else {
        groupes.set(cle, { action: e.action, created_at: e.created_at, utilisateur_id: e.utilisateur_id, champs: [e] });
      }
    }
    // Plusieurs écritures dans la même transaction partagent le même
    // horodatage : les changements successifs d'un même champ sont remis dans
    // l'ordre en les enchaînant (l'ancienne valeur de l'un = la nouvelle du
    // précédent). À horodatage égal, la création est la plus ancienne.
    for (const g of groupes.values()) g.champs = ordonnerParChainage(g.champs ?? []);
    return Array.from(groupes.values()).sort((a, b) =>
      a.created_at === b.created_at ? RANG_ACTION(b.action) - RANG_ACTION(a.action) : a.created_at < b.created_at ? 1 : -1,
    );
  }, [entrees]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des modifications</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : evenements.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Aucune modification enregistrée.</p>
        ) : (
          <ol>
            {evenements.map((ev, i) => {
              const dernier = i === evenements.length - 1;
              return (
                <li key={`${ev.created_at}-${ev.action}`} className={cn('relative pl-6', !dernier && 'pb-5')}>
                  {!dernier && <span className="absolute bottom-0 left-[5px] top-3 w-px bg-border" aria-hidden />}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-0 top-1.5 size-[11px] rounded-full border-2 border-card ring-1',
                      i === 0 ? 'bg-primary ring-primary' : 'bg-muted-foreground/50 ring-border',
                    )}
                  />
                  <div className="text-[13px]">
                    <span className="font-semibold">{LABEL_ACTION[ev.action] ?? ev.action}</span>
                    {ev.utilisateur_id && (
                      <span className="text-muted-foreground"> · {utilisateurParId.get(ev.utilisateur_id) ?? ev.utilisateur_id}</span>
                    )}
                  </div>
                  <div className="text-[12px] tabular-nums text-muted-foreground">
                    {fr(ev.created_at).format('D MMMM YYYY à HH:mm')}
                  </div>
                  {ev.action === 'modifier' && (
                    <ul className="mt-1.5 space-y-1">
                      {ev.champs!
                        .filter((c) => !CHAMPS_MASQUES.has(c.champ))
                        .map((c, j) => (
                          <li key={j} className="text-[13px]">
                            <span className="font-medium">{LIBELLE_CHAMP[c.champ] ?? c.champ}</span>
                            <span className="text-muted-foreground"> : </span>
                            <span className="break-words text-muted-foreground line-through decoration-muted-foreground/50">
                              {lisible(c.champ, c.ancienne_valeur)}
                            </span>
                            <span className="text-muted-foreground"> → </span>
                            <span className="break-words">{lisible(c.champ, c.nouvelle_valeur)}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
