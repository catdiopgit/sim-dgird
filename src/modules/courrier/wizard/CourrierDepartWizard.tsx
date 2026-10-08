import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { Building2, CircleCheck, Contact, LoaderCircle, Plus, Printer, User, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../../components/form/champ';
import { LigneRecap, WizardDialog } from '../../../components/form/wizard-dialog';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input, Textarea } from '../../../components/ui/input';
import { NativeSelect } from '../../../components/ui/native-select';
import { useEntites, useUtilisateursOptions } from '../../../hooks/administration/useEntites';
import { useContacts } from '../../../hooks/courrier/useContacts';
import { useCourrierReferentiel, useCreerCourrier } from '../../../hooks/courrier/useCourriers';
import { ariaErreur } from '../../../lib/form';
import { cn } from '../../../lib/utils';
import type { Courrier } from '../../../services/courrier/courriers';
import { ajouterDestinataire } from '../../../services/courrier/destinataires';
import { uploadPieceJointe } from '../../../services/courrier/piecesJointes';
import { fr } from '../../../utils/dateFr';
import { FicheExploitationModal } from '../FicheExploitationModal';
import { ContactRapide } from './ContactRapide';
import { PiecesJointesStagingList, type PieceJointeStagee } from './PiecesJointesStagingList';

const schema = z.object({
  objet: z.string().min(1, 'Requis'),
  entiteId: z.string().min(1, 'Requis'),
  reference: z.string().optional(),
  typeValeurId: z.string().optional(),
  dateCourrier: z.string().optional(),
  dateEnvoi: z.string().optional(),
  modeTransmissionValeurId: z.string().optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const defauts = (): FormValues => ({
  objet: '',
  entiteId: '',
  reference: '',
  typeValeurId: '',
  dateCourrier: dayjs().format('YYYY-MM-DD'),
  dateEnvoi: '',
  modeTransmissionValeurId: '',
  observations: '',
});

type AmpliataireType = 'entite' | 'utilisateur' | 'contact';
interface Ampliataire {
  id: string;
  type: AmpliataireType;
  cibleId: string;
  cibleLabel: string;
  interne: boolean;
}

const ETAPES = ['Informations', 'Pièces jointes', 'Destinataires', 'Récapitulatif', 'Confirmation'];
const TYPES_AMPLIATAIRE: { valeur: AmpliataireType; libelle: string; Icone: typeof Building2 }[] = [
  { valeur: 'entite', libelle: 'Entité (interne)', Icone: Building2 },
  { valeur: 'utilisateur', libelle: 'Utilisateur (interne)', Icone: User },
  { valeur: 'contact', libelle: 'Contact (externe)', Icone: Contact },
];

interface Props {
  open: boolean;
  organisationId: string;
  onClose: () => void;
  onTermine: (courrier: Courrier) => void;
}

// Assistant en 5 étapes pour l'enregistrement d'un courrier départ (plan V3
// §9-11, §E) : informations → pièces jointes → destinataires (principal +
// ampliataires internes/externes, contacts recherchables/créables à la
// volée) → récapitulatif → confirmation avec numéro généré.
export function CourrierDepartWizard({ open, organisationId, onClose, onTermine }: Props) {
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: contacts } = useContacts(organisationId);
  const creer = useCreerCourrier(organisationId);

  const [etape, setEtape] = useState(0);
  const [fichiers, setFichiers] = useState<PieceJointeStagee[]>([]);
  const [contactPrincipalId, setContactPrincipalId] = useState('');
  const [ampliataires, setAmpliataires] = useState<Ampliataire[]>([]);
  const [ampliCibleType, setAmpliCibleType] = useState<AmpliataireType>('entite');
  const [ampliCibleId, setAmpliCibleId] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [courrierCree, setCourrierCree] = useState<Courrier | null>(null);
  const [ficheOuverte, setFicheOuverte] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defauts(),
  });
  const valeurs = watch();

  const fermer = () => {
    onClose();
    setEtape(0);
    setFichiers([]);
    setContactPrincipalId('');
    setAmpliataires([]);
    setAmpliCibleId('');
    setCourrierCree(null);
    setFicheOuverte(false);
    reset(defauts());
  };

  const libelleValeur = (liste: { id: string; libelle: string }[] | undefined, id?: string) =>
    liste?.find((v) => v.id === id)?.libelle;
  const libelleEntite = (id?: string) => entites?.find((e) => e.id === id)?.libelle ?? '—';
  const libelleContact = (id?: string) => contacts?.find((c) => c.id === id)?.nom ?? '—';

  const suivant = async () => {
    if (etape === 0) {
      const valide = await trigger(['objet', 'entiteId']);
      if (!valide) return;
    }
    setEtape((e) => e + 1);
  };
  const precedent = () => setEtape((e) => e - 1);

  const ajouterAmpliataire = (type: AmpliataireType, cibleId: string, libelleForce?: string) => {
    if (!cibleId) return;
    const label =
      libelleForce ??
      (type === 'entite'
        ? libelleEntite(cibleId)
        : type === 'utilisateur'
          ? (() => {
              const u = utilisateurs?.find((u) => u.id === cibleId);
              return u ? `${u.prenom} ${u.nom}` : '—';
            })()
          : libelleContact(cibleId));
    setAmpliataires((a) => [...a, { id: crypto.randomUUID(), type, cibleId, cibleLabel: label, interne: type !== 'contact' }]);
    setAmpliCibleId('');
  };

  const valider = handleSubmit(async (values) => {
    setEnCours(true);
    try {
      const courrier = await creer.mutateAsync({
        p_sens: 'sortant',
        p_objet: values.objet,
        p_entite_id: values.entiteId,
        p_type_valeur_id: values.typeValeurId || null,
        p_date_courrier: values.dateCourrier || null,
        p_date_envoi: values.dateEnvoi ? dayjs(values.dateEnvoi).toISOString() : null,
        p_mode_transmission_valeur_id: values.modeTransmissionValeurId || null,
        p_destinataire_texte: contactPrincipalId ? libelleContact(contactPrincipalId) : null,
        p_contact_destinataire_id: contactPrincipalId || null,
        p_observations: values.observations || null,
      });

      for (const f of fichiers) {
        await uploadPieceJointe(courrier.id, f.file, f.estScan);
      }

      for (const a of ampliataires) {
        await ajouterDestinataire({
          courrier_id: courrier.id,
          entite_id: a.type === 'entite' ? a.cibleId : null,
          utilisateur_id: a.type === 'utilisateur' ? a.cibleId : null,
          contact_id: a.type === 'contact' ? a.cibleId : null,
          type_diffusion: 'copie',
        });
      }

      setCourrierCree(courrier);
      setEtape(4);
    } finally {
      setEnCours(false);
    }
  });

  const options = (liste: { id: string; libelle: string }[] | undefined) =>
    (liste ?? []).map((v) => (
      <option key={v.id} value={v.id}>
        {v.libelle}
      </option>
    ));

  const optionsAmpliataire =
    ampliCibleType === 'entite'
      ? (entites ?? []).map((e) => ({ valeur: e.id, libelle: e.libelle }))
      : ampliCibleType === 'utilisateur'
        ? (utilisateurs ?? []).map((u) => ({ valeur: u.id, libelle: `${u.prenom} ${u.nom}` }))
        : (contacts ?? []).map((c) => ({ valeur: c.id, libelle: c.nom }));

  const pied =
    etape === 4 ? (
      <>
        <Button variant="outline" onClick={fermer}>
          Fermer
        </Button>
        <Button onClick={() => courrierCree && onTermine(courrierCree)}>Voir le courrier</Button>
      </>
    ) : (
      <>
        <Button variant="ghost" className="sm:mr-auto" onClick={fermer} disabled={enCours}>
          Annuler
        </Button>
        {etape > 0 && (
          <Button variant="outline" onClick={precedent} disabled={enCours}>
            Précédent
          </Button>
        )}
        {etape < 3 && <Button onClick={() => void suivant()}>Suivant</Button>}
        {etape === 3 && (
          <Button onClick={() => void valider()} disabled={enCours}>
            {enCours && <LoaderCircle className="animate-spin" />}
            Valider l'enregistrement
          </Button>
        )}
      </>
    );

  return (
    <WizardDialog
      open={open}
      onClose={fermer}
      titre="Nouveau courrier départ"
      etapes={ETAPES}
      courante={etape}
      pied={pied}
      bloquerFermeture={enCours}
    >
      {etape === 0 && (
        <div className="space-y-4">
          <Champ label="Objet" htmlFor="depart-objet" requis erreur={errors.objet?.message}>
            <Input autoFocus {...ariaErreur('depart-objet', errors.objet)} {...register('objet')} />
          </Champ>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Champ label="Entité en charge" htmlFor="depart-entite" requis erreur={errors.entiteId?.message}>
              <NativeSelect {...ariaErreur('depart-entite', errors.entiteId)} {...register('entiteId')}>
                <option value="">Sélectionner une entité</option>
                {(entites ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.sigle ? `${e.sigle} — ${e.libelle}` : e.libelle}
                  </option>
                ))}
              </NativeSelect>
            </Champ>
            <Champ label="Type de courrier" htmlFor="depart-type">
              <NativeSelect id="depart-type" {...register('typeValeurId')}>
                <option value="">—</option>
                {options(referentiel?.types)}
              </NativeSelect>
            </Champ>
            <Champ label="Référence" htmlFor="depart-reference">
              <Input id="depart-reference" {...register('reference')} />
            </Champ>
            <Champ label="Mode de transmission" htmlFor="depart-transmission">
              <NativeSelect id="depart-transmission" {...register('modeTransmissionValeurId')}>
                <option value="">—</option>
                {options(referentiel?.modesTransmission)}
              </NativeSelect>
            </Champ>
            <Champ label="Date du courrier" htmlFor="depart-date">
              <Input id="depart-date" type="date" {...register('dateCourrier')} />
            </Champ>
            <Champ label="Date et heure d'envoi" htmlFor="depart-envoi">
              <Input id="depart-envoi" type="datetime-local" {...register('dateEnvoi')} />
            </Champ>
          </div>
          <Champ label="Observations" htmlFor="depart-observations">
            <Textarea id="depart-observations" rows={2} {...register('observations')} />
          </Champ>
        </div>
      )}

      {etape === 1 && <PiecesJointesStagingList fichiers={fichiers} onChange={setFichiers} />}

      {etape === 2 && (
        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-[14px] font-semibold">Destinataire principal</h3>
            <div className="flex flex-col gap-2 sm:flex-row">
              <NativeSelect
                aria-label="Destinataire principal"
                className="min-w-0 flex-1"
                value={contactPrincipalId}
                onChange={(e) => setContactPrincipalId(e.target.value)}
              >
                <option value="">Sélectionner un contact</option>
                {(contacts ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </NativeSelect>
              <ContactRapide organisationId={organisationId} onCree={(c) => setContactPrincipalId(c.id)} />
            </div>
          </section>

          <section>
            <h3 className="text-[14px] font-semibold">Ampliataires</h3>
            <p className="mb-3 text-[13px] text-muted-foreground">Destinataires en copie, internes ou externes.</p>
            <div role="radiogroup" aria-label="Type d'ampliataire" className="mb-3 flex flex-wrap gap-1.5">
              {TYPES_AMPLIATAIRE.map(({ valeur, libelle, Icone }) => (
                <button
                  key={valeur}
                  type="button"
                  role="radio"
                  aria-checked={ampliCibleType === valeur}
                  onClick={() => {
                    setAmpliCibleType(valeur);
                    setAmpliCibleId('');
                  }}
                  className={cn(
                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium',
                    ampliCibleType === valeur
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Icone className="size-3.5" />
                  {libelle}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <NativeSelect
                aria-label="Ampliataire à ajouter"
                className="min-w-0 flex-1"
                value={ampliCibleId}
                onChange={(e) => setAmpliCibleId(e.target.value)}
              >
                <option value="">Choisir…</option>
                {optionsAmpliataire.map((o) => (
                  <option key={o.valeur} value={o.valeur}>
                    {o.libelle}
                  </option>
                ))}
              </NativeSelect>
              <Button type="button" variant="outline" disabled={!ampliCibleId} onClick={() => ajouterAmpliataire(ampliCibleType, ampliCibleId)}>
                <Plus />
                Ajouter
              </Button>
              {ampliCibleType === 'contact' && (
                <ContactRapide
                  organisationId={organisationId}
                  libelle="Nouveau contact"
                  onCree={(c) => ajouterAmpliataire('contact', c.id, c.nom)}
                />
              )}
            </div>
            {ampliataires.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {ampliataires.map((a) => (
                  <li key={a.id}>
                    <Badge variant={a.interne ? 'muted' : 'outline'} shape="pill" className="py-1 pl-2.5 pr-1">
                      {a.cibleLabel}
                      <span className="text-muted-foreground">{a.interne ? 'interne' : 'externe'}</span>
                      <button
                        type="button"
                        onClick={() => setAmpliataires((list) => list.filter((x) => x.id !== a.id))}
                        className="grid size-5 cursor-pointer place-items-center rounded-full hover:bg-foreground/10"
                        aria-label={`Retirer ${a.cibleLabel}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {etape === 3 && (
        <div>
          <dl className="rounded-lg border border-border px-4">
            <LigneRecap label="Objet">{valeurs.objet}</LigneRecap>
            <LigneRecap label="Entité en charge">{libelleEntite(valeurs.entiteId)}</LigneRecap>
            <LigneRecap label="Type">{libelleValeur(referentiel?.types, valeurs.typeValeurId)}</LigneRecap>
            <LigneRecap label="Date du courrier">{valeurs.dateCourrier ? fr(valeurs.dateCourrier).format('D MMMM YYYY') : null}</LigneRecap>
            <LigneRecap label="Envoi">{valeurs.dateEnvoi ? fr(valeurs.dateEnvoi).format('D MMMM YYYY à HH:mm') : null}</LigneRecap>
            <LigneRecap label="Mode de transmission">{libelleValeur(referentiel?.modesTransmission, valeurs.modeTransmissionValeurId)}</LigneRecap>
            <LigneRecap label="Destinataire principal">{contactPrincipalId ? libelleContact(contactPrincipalId) : null}</LigneRecap>
            <LigneRecap label="Ampliataires">
              {ampliataires.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {ampliataires.map((a) => (
                    <Badge key={a.id} variant="muted">
                      {a.cibleLabel}
                    </Badge>
                  ))}
                </span>
              )}
            </LigneRecap>
            <LigneRecap label="Observations">{valeurs.observations}</LigneRecap>
            <LigneRecap label="Pièces jointes">
              {fichiers.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {fichiers.map((f) => (
                    <Badge key={f.id} variant={f.estScan ? 'primary' : 'muted'}>
                      {f.file.name}
                    </Badge>
                  ))}
                </span>
              )}
            </LigneRecap>
          </dl>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Vous pouvez revenir en arrière pour corriger une information avant de valider définitivement l'enregistrement.
          </p>
        </div>
      )}

      {etape === 4 && courrierCree && (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-good/15">
            <CircleCheck className="size-7 text-good-text" />
          </div>
          <h3 className="mt-4 text-[18px] font-semibold">Courrier enregistré</h3>
          <p className="mt-1 text-muted-foreground">
            Numéro attribué : <span className="font-mono font-semibold text-foreground">{courrierCree.numero}</span>
          </p>
          <Button variant="outline" className="mt-5" onClick={() => setFicheOuverte(true)}>
            <Printer />
            Imprimer la fiche d'exploitation
          </Button>
        </div>
      )}

      {courrierCree && (
        <FicheExploitationModal
          courrierId={courrierCree.id}
          organisationId={organisationId}
          open={ficheOuverte}
          onClose={() => setFicheOuverte(false)}
        />
      )}
    </WizardDialog>
  );
}
