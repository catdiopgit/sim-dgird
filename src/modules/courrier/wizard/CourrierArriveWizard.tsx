import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { CircleCheck, LoaderCircle, Printer } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../../components/form/champ';
import { LigneRecap, WizardDialog } from '../../../components/form/wizard-dialog';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input, Textarea } from '../../../components/ui/input';
import { NativeSelect } from '../../../components/ui/native-select';
import { useContacts } from '../../../hooks/courrier/useContacts';
import { useCourrierReferentiel, useCreerCourrier } from '../../../hooks/courrier/useCourriers';
import { ariaErreur } from '../../../lib/form';
import type { Courrier } from '../../../services/courrier/courriers';
import { uploadPieceJointe } from '../../../services/courrier/piecesJointes';
import { fr } from '../../../utils/dateFr';
import { FicheExploitationModal } from '../FicheExploitationModal';
import { ContactRapide } from './ContactRapide';
import { PiecesJointesStagingList, type PieceJointeStagee } from './PiecesJointesStagingList';

const schema = z.object({
  objet: z.string().min(1, 'Requis'),
  typeValeurId: z.string().optional(),
  prioriteValeurId: z.string().optional(),
  confidentialiteValeurId: z.string().optional(),
  dateCourrier: z.string().optional(),
  dateReception: z.string().optional(),
  contactExpediteurId: z.string().optional(),
  referenceExpediteur: z.string().optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const defauts = (): FormValues => ({
  objet: '',
  typeValeurId: '',
  prioriteValeurId: '',
  confidentialiteValeurId: '',
  dateCourrier: dayjs().format('YYYY-MM-DD'),
  dateReception: dayjs().format('YYYY-MM-DDTHH:mm'),
  contactExpediteurId: '',
  referenceExpediteur: '',
  observations: '',
});

const ETAPES = ['Informations', 'Pièces jointes', 'Récapitulatif', 'Confirmation'];

interface Props {
  open: boolean;
  organisationId: string;
  onClose: () => void;
  onTermine: (courrier: Courrier) => void;
}

// Assistant en 4 étapes pour l'enregistrement d'un courrier arrivé (plan V3
// §2, §E ; enrichi V5 §2-§5) : on ne demande volontairement ni entité, ni
// service, ni bureau, ni agent destinataire à la saisie — le routage initial
// est automatique (fn_creer_courrier) et l'affectation réelle se fait ensuite
// via l'imputation (workflow) ; l'étape de workflow appliquée juste après
// l'enregistrement est elle aussi automatique, configurée en Administration.
// L'expéditeur est un contact existant (module contacts V3, réutilisé tel
// quel), pas un texte libre. Le courrier n'est créé en base qu'à la
// validation finale du récapitulatif.
export function CourrierArriveWizard({ open, organisationId, onClose, onTermine }: Props) {
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const { data: contacts } = useContacts(organisationId);
  const creer = useCreerCourrier(organisationId);

  const [etape, setEtape] = useState(0);
  const [fichiers, setFichiers] = useState<PieceJointeStagee[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [courrierCree, setCourrierCree] = useState<Courrier | null>(null);
  const [ficheOuverte, setFicheOuverte] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    reset,
    setValue,
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
    setCourrierCree(null);
    setFicheOuverte(false);
    reset(defauts());
  };

  const libelleValeur = (liste: { id: string; libelle: string }[] | undefined, id?: string) =>
    liste?.find((v) => v.id === id)?.libelle;
  const libelleContact = (id?: string) => contacts?.find((c) => c.id === id)?.nom;

  const suivant = async () => {
    if (etape === 0) {
      const valide = await trigger(['objet']);
      if (!valide) return;
    }
    setEtape((e) => e + 1);
  };
  const precedent = () => setEtape((e) => e - 1);

  const valider = handleSubmit(async (values) => {
    setEnCours(true);
    try {
      const courrier = await creer.mutateAsync({
        p_sens: 'entrant',
        p_objet: values.objet,
        p_type_valeur_id: values.typeValeurId || null,
        p_priorite_valeur_id: values.prioriteValeurId || null,
        p_confidentialite_valeur_id: values.confidentialiteValeurId || null,
        p_date_courrier: values.dateCourrier || null,
        p_date_reception: values.dateReception ? dayjs(values.dateReception).toISOString() : null,
        p_expediteur_contact_id: values.contactExpediteurId || null,
        p_reference_expediteur: values.referenceExpediteur || null,
        p_observations: values.observations || null,
      });

      for (const f of fichiers) {
        await uploadPieceJointe(courrier.id, f.file, f.estScan);
      }

      setCourrierCree(courrier);
      setEtape(3);
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

  const pied =
    etape === 3 ? (
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
        {etape < 2 && <Button onClick={() => void suivant()}>Suivant</Button>}
        {etape === 2 && (
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
      titre="Nouveau courrier arrivé"
      etapes={ETAPES}
      courante={etape}
      pied={pied}
      bloquerFermeture={enCours}
    >
      {etape === 0 && (
        <div className="space-y-4">
          <Champ label="Objet" htmlFor="arrive-objet" requis erreur={errors.objet?.message}>
            <Input autoFocus {...ariaErreur('arrive-objet', errors.objet)} {...register('objet')} />
          </Champ>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Champ label="Type de courrier" htmlFor="arrive-type">
              <NativeSelect id="arrive-type" {...register('typeValeurId')}>
                <option value="">—</option>
                {options(referentiel?.types)}
              </NativeSelect>
            </Champ>
            <Champ label="Priorité" htmlFor="arrive-priorite">
              <NativeSelect id="arrive-priorite" {...register('prioriteValeurId')}>
                <option value="">—</option>
                {options(referentiel?.priorites)}
              </NativeSelect>
            </Champ>
            <Champ label="Confidentialité" htmlFor="arrive-confidentialite">
              <NativeSelect id="arrive-confidentialite" {...register('confidentialiteValeurId')}>
                <option value="">—</option>
                {options(referentiel?.confidentialites)}
              </NativeSelect>
            </Champ>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Champ label="Date du courrier" htmlFor="arrive-date">
              <Input id="arrive-date" type="date" {...register('dateCourrier')} />
            </Champ>
            <Champ label="Date et heure de réception" htmlFor="arrive-reception">
              <Input id="arrive-reception" type="datetime-local" {...register('dateReception')} />
            </Champ>
          </div>
          <Champ label="Expéditeur" htmlFor="arrive-expediteur" aide="Contact existant, ou créez-le en un clic.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <NativeSelect id="arrive-expediteur" className="min-w-0 flex-1" {...register('contactExpediteurId')}>
                <option value="">Sélectionner un contact</option>
                {(contacts ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </NativeSelect>
              <ContactRapide organisationId={organisationId} onCree={(c) => setValue('contactExpediteurId', c.id)} />
            </div>
          </Champ>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Champ label="Référence de l'expéditeur" htmlFor="arrive-reference">
              <Input id="arrive-reference" placeholder="Référence indiquée sur le courrier" {...register('referenceExpediteur')} />
            </Champ>
          </div>
          <Champ label="Observations" htmlFor="arrive-observations">
            <Textarea id="arrive-observations" rows={2} {...register('observations')} />
          </Champ>
        </div>
      )}

      {etape === 1 && <PiecesJointesStagingList fichiers={fichiers} onChange={setFichiers} />}

      {etape === 2 && (
        <div>
          <dl className="rounded-lg border border-border px-4">
            <LigneRecap label="Objet">{valeurs.objet}</LigneRecap>
            <LigneRecap label="Type">{libelleValeur(referentiel?.types, valeurs.typeValeurId)}</LigneRecap>
            <LigneRecap label="Priorité">{libelleValeur(referentiel?.priorites, valeurs.prioriteValeurId)}</LigneRecap>
            <LigneRecap label="Confidentialité">{libelleValeur(referentiel?.confidentialites, valeurs.confidentialiteValeurId)}</LigneRecap>
            <LigneRecap label="Date du courrier">{valeurs.dateCourrier ? fr(valeurs.dateCourrier).format('D MMMM YYYY') : null}</LigneRecap>
            <LigneRecap label="Réception">{valeurs.dateReception ? fr(valeurs.dateReception).format('D MMMM YYYY à HH:mm') : null}</LigneRecap>
            <LigneRecap label="Expéditeur">{libelleContact(valeurs.contactExpediteurId)}</LigneRecap>
            <LigneRecap label="Référence expéditeur">{valeurs.referenceExpediteur}</LigneRecap>
            <LigneRecap label="Observations">{valeurs.observations}</LigneRecap>
            <LigneRecap label="Pièces jointes">
              {fichiers.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {fichiers.map((f) => (
                    <Badge key={f.id} variant={f.estScan ? 'primary' : 'muted'}>
                      {f.file.name}
                      {f.estScan ? ' · scan' : ''}
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

      {etape === 3 && courrierCree && (
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
