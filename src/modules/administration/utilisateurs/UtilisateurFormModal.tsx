import { zodResolver } from '@hookform/resolvers/zod';
import { Check, CircleCheck, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../../components/form/champ';
import { FormDialog } from '../../../components/form/form-dialog';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { NativeSelect } from '../../../components/ui/native-select';
import { useCreerUtilisateur, useUpdateUtilisateur } from '../../../hooks/administration/useUtilisateurs';
import { ariaErreur } from '../../../lib/form';
import type { Entite } from '../../../services/administration/entites';
import type { Fonction } from '../../../services/administration/fonctions';
import type { CreerUtilisateurResultat, Utilisateur } from '../../../services/administration/utilisateurs';

const schema = z.object({
  email: z.string().min(1, 'Requis').email('Email invalide'),
  nom: z.string().min(1, 'Requis'),
  prenom: z.string().min(1, 'Requis'),
  entiteId: z.string().optional(),
  fonctionId: z.string().optional(),
  matricule: z.string().optional(),
  telephone: z.string().optional(),
  statut: z.enum(['actif', 'inactif', 'suspendu']),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  utilisateur?: Utilisateur;
  organisationId: string;
  entites: Entite[];
  fonctions: Fonction[];
  onClose: () => void;
}

function ResultatCreation({ resultat, onClose }: { resultat: CreerUtilisateurResultat; onClose: () => void }) {
  const [copie, setCopie] = useState(false);
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(resultat.motDePasseTemporaire);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Utilisateur créé</DialogTitle>
          <DialogDescription>Communiquez ces identifiants à l'utilisateur : le mot de passe ne sera plus affiché ensuite.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex items-center gap-2.5 rounded-lg bg-good/10 p-3 text-[13px] font-medium text-good-text">
            <CircleCheck className="size-4 shrink-0" />
            Compte créé avec succès
          </div>
          <dl className="space-y-3 text-[14px]">
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="mt-1 font-medium">{resultat.email}</dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Mot de passe temporaire</dt>
              <dd className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 font-mono text-[14px]">{resultat.motDePasseTemporaire}</code>
                <Button variant="outline" size="icon" onClick={() => void copier()} aria-label="Copier le mot de passe" title="Copier">
                  {copie ? <Check className="text-good-text" /> : <Copy />}
                </Button>
              </dd>
            </div>
          </dl>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UtilisateurFormModal({ open, utilisateur, organisationId, entites, fonctions, onClose }: Props) {
  const estModification = Boolean(utilisateur);
  const creer = useCreerUtilisateur(organisationId);
  const modifier = useUpdateUtilisateur(organisationId);
  const [resultatCreation, setResultatCreation] = useState<CreerUtilisateurResultat | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      nom: '',
      prenom: '',
      entiteId: '',
      fonctionId: '',
      matricule: '',
      telephone: '',
      statut: 'actif',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        email: utilisateur?.email ?? '',
        nom: utilisateur?.nom ?? '',
        prenom: utilisateur?.prenom ?? '',
        entiteId: utilisateur?.entite_id ?? '',
        fonctionId: utilisateur?.fonction_id ?? '',
        matricule: utilisateur?.matricule ?? '',
        telephone: utilisateur?.telephone ?? '',
        statut: (utilisateur?.statut as FormValues['statut']) ?? 'actif',
      });
      setResultatCreation(null);
    }
  }, [open, utilisateur, reset]);

  const onSubmit = (values: FormValues) => {
    if (estModification && utilisateur) {
      modifier.mutate(
        {
          id: utilisateur.id,
          patch: {
            nom: values.nom,
            prenom: values.prenom,
            entite_id: values.entiteId || null,
            fonction_id: values.fonctionId || null,
            matricule: values.matricule || null,
            telephone: values.telephone || null,
            statut: values.statut,
          },
        },
        { onSuccess: () => onClose() },
      );
    } else {
      creer.mutate(
        {
          email: values.email,
          nom: values.nom,
          prenom: values.prenom,
          entiteId: values.entiteId || null,
          fonctionId: values.fonctionId || null,
          matricule: values.matricule || null,
          telephone: values.telephone || null,
        },
        { onSuccess: (resultat) => setResultatCreation(resultat) },
      );
    }
  };

  if (open && resultatCreation) return <ResultatCreation resultat={resultatCreation} onClose={onClose} />;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre={estModification ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
      description={estModification ? utilisateur?.email : 'Un mot de passe temporaire sera généré et affiché une seule fois.'}
      onSubmit={handleSubmit(onSubmit)}
      enCours={creer.isPending || modifier.isPending}
      libelleValider={estModification ? 'Enregistrer' : "Créer l'utilisateur"}
      largeur="lg"
    >
      <Champ label="Email" htmlFor="utilisateur-email" requis={!estModification} erreur={errors.email?.message} aide={estModification ? "L'email de connexion n'est pas modifiable." : undefined}>
        <Input type="email" autoFocus={!estModification} disabled={estModification} {...ariaErreur('utilisateur-email', errors.email)} {...register('email')} />
      </Champ>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ label="Prénom" htmlFor="utilisateur-prenom" requis erreur={errors.prenom?.message}>
          <Input autoFocus={estModification} {...ariaErreur('utilisateur-prenom', errors.prenom)} {...register('prenom')} />
        </Champ>
        <Champ label="Nom" htmlFor="utilisateur-nom" requis erreur={errors.nom?.message}>
          <Input {...ariaErreur('utilisateur-nom', errors.nom)} {...register('nom')} />
        </Champ>
        <Champ label="Entité" htmlFor="utilisateur-entite">
          <NativeSelect id="utilisateur-entite" {...register('entiteId')}>
            <option value="">Aucune</option>
            {entites.map((e) => (
              <option key={e.id} value={e.id}>
                {e.sigle ? `${e.sigle} — ${e.libelle}` : e.libelle}
              </option>
            ))}
          </NativeSelect>
        </Champ>
        <Champ label="Fonction" htmlFor="utilisateur-fonction">
          <NativeSelect id="utilisateur-fonction" {...register('fonctionId')}>
            <option value="">Aucune</option>
            {fonctions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.libelle}
              </option>
            ))}
          </NativeSelect>
        </Champ>
        <Champ label="Matricule" htmlFor="utilisateur-matricule">
          <Input id="utilisateur-matricule" {...register('matricule')} />
        </Champ>
        <Champ label="Téléphone" htmlFor="utilisateur-telephone">
          <Input id="utilisateur-telephone" type="tel" {...register('telephone')} />
        </Champ>
        {estModification && (
          <Champ label="Statut" htmlFor="utilisateur-statut">
            <NativeSelect id="utilisateur-statut" {...register('statut')}>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="suspendu">Suspendu</option>
            </NativeSelect>
          </Champ>
        )}
      </div>
    </FormDialog>
  );
}
