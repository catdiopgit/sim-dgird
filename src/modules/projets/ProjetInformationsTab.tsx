import { Contact, Plus } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { ActionsLigne, BoutonSuppression } from '../../components/form/actions-ligne';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ListeCases } from '../../components/ui/checkbox';
import { NativeSelect } from '../../components/ui/native-select';
import { Tableau } from '../../components/ui/tableau';
import { useContactExecutionMutations, useContactsExecution } from '../../hooks/projets/useContactsExecution';
import { useMembresProjet } from '../../hooks/projets/useMembresProjet';
import { useProjetMutations } from '../../hooks/projets/useProjets';
import { useVisibiliteEntites, useVisibiliteMutations, useVisibiliteUtilisateurs } from '../../hooks/projets/useVisibiliteProjet';
import { cn } from '../../lib/utils';
import type { ContactExecution } from '../../services/projets/contactsExecution';
import type { Projet } from '../../services/projets/projets';
import type { Entite, UtilisateurOption } from '../../services/administration/entites';
import { fr } from '../../utils/dateFr';
import { formatMontant } from '../../utils/format';
import { ContactExecutionFormModal } from './ContactExecutionFormModal';
import { BarreAvancement } from './projetAffichage';

interface Props {
  projet: Projet;
  organisationId: string;
  peutModifier: boolean;
  entiteParId: Map<string, string>;
  utilisateurParId: Map<string, string>;
  entites: Entite[] | undefined;
  utilisateurs: UtilisateurOption[] | undefined;
}

const LIBELLES_PORTEE: Record<Projet['portee_visibilite'], string> = {
  membres: 'Membres du projet uniquement',
  entites: "Agents d'une ou plusieurs entités",
  agents: 'Agents spécifiques',
  tous: 'Tout le monde (organisation)',
};

const LIBELLES_ORGANISME: Record<Projet['organisme_execution_type'], string> = {
  organisation: "L'organisation elle-même",
  consultant: 'Consultant',
  entreprise: 'Entreprise',
  externe: 'Autre organisme externe',
};

function Ligne({ label, children, pleine }: { label: string; children: ReactNode; pleine?: boolean }) {
  return (
    <div className={cn(pleine && 'sm:col-span-2')}>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[14px]">{children ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

const date = (d: string | null) => (d ? fr(d).format('D MMMM YYYY') : null);

// §8 Informations générales, organisme/chargé de l'exécution (§1, §4) et
// visibilité (§5). L'avancement n'est plus qu'affiché : il est calculé
// automatiquement à partir des livrables (app.fn_recalculer_avancement_projet,
// déclenché à chaque changement de livrable — voir migration 0073).
export function ProjetInformationsTab({
  projet,
  organisationId,
  peutModifier,
  entiteParId,
  utilisateurParId,
  entites,
  utilisateurs,
}: Props) {
  const { data: visibiliteEntites } = useVisibiliteEntites(projet.id);
  const { data: visibiliteUtilisateurs } = useVisibiliteUtilisateurs(projet.id);
  const { definirEntites, definirUtilisateurs } = useVisibiliteMutations(projet.id);
  const { data: membres } = useMembresProjet(projet.id);
  const { data: contacts, isLoading: chargementContacts } = useContactsExecution(projet.id);
  const { remove: supprimerContact } = useContactExecutionMutations(projet.id);
  const { update: mettreAJourProjet } = useProjetMutations(organisationId);
  const [contactFormOuvert, setContactFormOuvert] = useState(false);

  const entiteIdsSelectionnees = useMemo(() => (visibiliteEntites ?? []).map((v) => v.entite_id), [visibiliteEntites]);
  const utilisateurIdsSelectionnes = useMemo(
    () => (visibiliteUtilisateurs ?? []).map((v) => v.utilisateur_id),
    [visibiliteUtilisateurs],
  );
  const contactParId = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, c.nom])), [contacts]);

  const valeurChargeExecution = projet.charge_execution_utilisateur_id
    ? `membre:${projet.charge_execution_utilisateur_id}`
    : projet.charge_execution_contact_id
      ? `contact:${projet.charge_execution_contact_id}`
      : '';

  const nomChargeExecution = projet.charge_execution_utilisateur_id
    ? (utilisateurParId.get(projet.charge_execution_utilisateur_id) ?? '—')
    : projet.charge_execution_contact_id
      ? (contactParId.get(projet.charge_execution_contact_id) ?? '—')
      : null;

  const changerChargeExecution = (valeur: string | undefined) => {
    const [type, id] = valeur ? valeur.split(':') : [null, null];
    mettreAJourProjet.mutate({
      id: projet.id,
      patch: {
        charge_execution_utilisateur_id: type === 'membre' ? id : null,
        charge_execution_contact_id: type === 'contact' ? id : null,
      },
    });
  };

  const nomUtilisateur = (id: string | null) => (id ? (utilisateurParId.get(id) ?? '—') : null);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <Ligne label="Référence">
              <span className="font-mono text-[13px]">{projet.code}</span>
            </Ligne>
            <Ligne label="Entité porteuse">{entiteParId.get(projet.entite_id)}</Ligne>
            <Ligne label="Intitulé" pleine>
              <span className="font-medium">{projet.nom}</span>
            </Ligne>
            <Ligne label="Responsable du projet">{nomUtilisateur(projet.responsable_id)}</Ligne>
            <Ligne label="Coordonnateur">{nomUtilisateur(projet.coordonnateur_id)}</Ligne>
            <Ligne label="Date de début">{date(projet.date_debut)}</Ligne>
            <Ligne label="Date de fin prévue">{date(projet.date_fin_prevue)}</Ligne>
            <Ligne label="Budget prévu">
              {projet.budget_prevu != null ? <span className="tabular-nums">{formatMontant(projet.budget_prevu)}</span> : null}
            </Ligne>
            <Ligne label="Budget réel">
              {projet.budget_reel != null ? <span className="tabular-nums">{formatMontant(projet.budget_reel)}</span> : null}
            </Ligne>
            <Ligne label="Financement">{projet.financement || null}</Ligne>
            <Ligne label="Lieu d'exécution">{projet.lieu_execution || null}</Ligne>
            <Ligne label="Avancement (calculé à partir des livrables)" pleine>
              <BarreAvancement pct={projet.avancement_pct} className="max-w-sm" />
            </Ligne>
            <Ligne label="Description" pleine>
              {projet.description ? <p className="whitespace-pre-line">{projet.description}</p> : null}
            </Ligne>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exécution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <Ligne label="Organisme chargé de l'exécution">
              {LIBELLES_ORGANISME[projet.organisme_execution_type]}
              {projet.organisme_execution_type !== 'organisation' && projet.organisme_execution_nom
                ? ` — ${projet.organisme_execution_nom}`
                : ''}
            </Ligne>
            <div>
              <dt className="text-[12px] text-muted-foreground">
                {peutModifier ? <label htmlFor="projet-charge-execution">Chargé de l'exécution</label> : "Chargé de l'exécution"}
              </dt>
              <dd className="mt-1 text-[14px]">
                {peutModifier ? (
                  <NativeSelect
                    id="projet-charge-execution"
                    className="h-9 text-[13px]"
                    value={valeurChargeExecution}
                    disabled={mettreAJourProjet.isPending}
                    onChange={(e) => changerChargeExecution(e.target.value || undefined)}
                  >
                    <option value="">Non désigné</option>
                    <optgroup label="Membres du projet">
                      {(membres ?? []).map((m) => (
                        <option key={m.utilisateur_id} value={`membre:${m.utilisateur_id}`}>
                          {utilisateurParId.get(m.utilisateur_id) ?? m.utilisateur_id}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Contacts d'exécution">
                      {(contacts ?? []).map((c) => (
                        <option key={c.id} value={`contact:${c.id}`}>
                          {c.nom}
                        </option>
                      ))}
                    </optgroup>
                  </NativeSelect>
                ) : (
                  (nomChargeExecution ?? <span className="text-muted-foreground">—</span>)
                )}
              </dd>
            </div>
          </dl>

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h4 className="text-[13px] font-semibold">Contacts d'exécution</h4>
              {peutModifier && (
                <Button variant="outline" size="sm" onClick={() => setContactFormOuvert(true)}>
                  <Plus />
                  Ajouter un contact
                </Button>
              )}
            </div>
            <Tableau<ContactExecution>
              libelle="Contacts d'exécution"
              lignes={contacts}
              cleLigne={(c) => c.id}
              chargement={chargementContacts}
              minLargeur={600}
              vide={{ icone: Contact, titre: 'Aucun contact', description: "Interlocuteurs de l'organisme chargé de l'exécution." }}
              colonnes={[
                { cle: 'nom', titre: 'Nom', rendu: (c) => <span className="font-medium">{c.nom}</span> },
                { cle: 'fonction', titre: 'Fonction', rendu: (c) => c.fonction || <span className="text-muted-foreground">—</span> },
                {
                  cle: 'email',
                  titre: 'Email',
                  rendu: (c) =>
                    c.email ? (
                      <a href={`mailto:${c.email}`} className="text-primary hover:underline">
                        {c.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    ),
                },
                {
                  cle: 'telephone',
                  titre: 'Téléphone',
                  className: 'whitespace-nowrap tabular-nums',
                  rendu: (c) => c.telephone || <span className="text-muted-foreground">—</span>,
                },
                ...(peutModifier
                  ? [
                      {
                        cle: 'actions',
                        titre: <span className="sr-only">Actions</span>,
                        className: 'w-14',
                        rendu: (c: ContactExecution) => (
                          <ActionsLigne>
                            <BoutonSuppression
                              libelle={`Supprimer le contact ${c.nom}`}
                              titre="Supprimer ce contact ?"
                              enCours={supprimerContact.isPending}
                              onConfirmer={(fermer) => supprimerContact.mutate(c.id, { onSuccess: fermer })}
                            >
                              <p>
                                Le contact <strong>{c.nom}</strong> sera supprimé
                                {projet.charge_execution_contact_id === c.id ? " ; il n'y aura plus de chargé de l'exécution." : '.'}
                              </p>
                            </BoutonSuppression>
                          </ActionsLigne>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibilité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[14px]">
            Portée actuelle :{' '}
            <Badge variant="muted" shape="pill">
              {LIBELLES_PORTEE[projet.portee_visibilite]}
            </Badge>
            <span className="text-muted-foreground"> — modifiable depuis le bouton « Modifier » du projet.</span>
          </p>

          {projet.portee_visibilite === 'entites' && (
            <div>
              <h4 className="mb-2 text-[13px] font-semibold">Entités autorisées à consulter ce projet</h4>
              <ListeCases
                libelle="Entités autorisées"
                desactive={!peutModifier || definirEntites.isPending}
                valeurs={entiteIdsSelectionnees}
                onChange={(valeurs) => definirEntites.mutate(valeurs)}
                options={(entites ?? []).map((e) => ({ valeur: e.id, libelle: e.libelle }))}
                vide="Aucune entité."
              />
            </div>
          )}

          {projet.portee_visibilite === 'agents' && (
            <div>
              <h4 className="mb-2 text-[13px] font-semibold">Agents autorisés à consulter ce projet</h4>
              <ListeCases
                libelle="Agents autorisés"
                desactive={!peutModifier || definirUtilisateurs.isPending}
                valeurs={utilisateurIdsSelectionnes}
                onChange={(valeurs) => definirUtilisateurs.mutate(valeurs)}
                options={(utilisateurs ?? []).map((u) => ({ valeur: u.id, libelle: `${u.prenom} ${u.nom}` }))}
                vide="Aucun agent."
              />
            </div>
          )}

          {(projet.portee_visibilite === 'membres' || projet.portee_visibilite === 'tous') && (
            <p className="text-[13px] text-muted-foreground">
              {projet.portee_visibilite === 'membres'
                ? "Aucune sélection nécessaire : seuls les membres de l'équipe (onglet Membres) peuvent consulter ce projet."
                : "Aucune sélection nécessaire : tous les utilisateurs autorisés de l'organisation peuvent consulter ce projet."}
            </p>
          )}
        </CardContent>
      </Card>

      <ContactExecutionFormModal open={contactFormOuvert} projetId={projet.id} onClose={() => setContactFormOuvert(false)} />
    </div>
  );
}
