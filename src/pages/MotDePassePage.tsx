import { useQueryClient } from '@tanstack/react-query';
import { KeyRound, LogOut } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Champ } from '../components/form/champ';
import { Button } from '../components/ui/button';
import { Encart } from '../components/ui/encart';
import { Input } from '../components/ui/input';
import { PageHeader } from '../components/ui/page-header';
import { useAuth } from '../hooks/useAuth';
import { message } from '../lib/notifications';
import { changerMonMotDePasse } from '../services/administration/utilisateurs';

const REGLE = 'Au moins 10 caractères, avec au moins une lettre et un chiffre.';

function controler(nouveau: string, confirmation: string, email: string | undefined): string | null {
  if (nouveau.length < 10 || !/[A-Za-zÀ-ÿ]/.test(nouveau) || !/\d/.test(nouveau)) return REGLE;
  if (email && nouveau.toLowerCase() === email.toLowerCase()) return "Le mot de passe ne peut pas être votre adresse e-mail.";
  if (nouveau !== confirmation) return 'Les deux saisies du nouveau mot de passe ne correspondent pas.';
  return null;
}

// v8.6.5 — changement de son mot de passe. En mode « obligatoire » (première
// connexion ou mot de passe réinitialisé), la page remplace toute
// l'application tant que le changement n'est pas fait.
export function MotDePassePage({ obligatoire = false }: { obligatoire?: boolean }) {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const valider = async (e: FormEvent) => {
    e.preventDefault();
    const probleme = controler(nouveau, confirmation, user?.email);
    if (probleme) return setErreur(probleme);
    setErreur(null);
    setEnCours(true);
    try {
      await changerMonMotDePasse(actuel, nouveau);
      message.success('Mot de passe modifié.');
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (!obligatoire) navigate('/');
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  const formulaire = (
    <form onSubmit={valider} className="space-y-4" noValidate>
      <Champ label="Mot de passe actuel" htmlFor="mdp-actuel" requis aide={obligatoire ? 'Le mot de passe temporaire qui vous a été remis.' : undefined}>
        <Input id="mdp-actuel" type="password" autoComplete="current-password" autoFocus value={actuel} onChange={(e) => setActuel(e.target.value)} />
      </Champ>
      <Champ label="Nouveau mot de passe" htmlFor="mdp-nouveau" requis aide={REGLE}>
        <Input id="mdp-nouveau" type="password" autoComplete="new-password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} />
      </Champ>
      <Champ label="Confirmer le nouveau mot de passe" htmlFor="mdp-confirmation" requis>
        <Input
          id="mdp-confirmation"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </Champ>
      {erreur && (
        <div role="alert" className="rounded-md border border-crit/30 bg-crit/8 px-3 py-2.5 text-[13px] text-crit-text">
          {erreur}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 pt-1">
        {obligatoire ? (
          <Button type="button" variant="ghost" onClick={() => void signOut()}>
            <LogOut />
            Se déconnecter
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={enCours || !actuel || !nouveau || !confirmation}>
          <KeyRound />
          {enCours ? 'Enregistrement…' : 'Changer le mot de passe'}
        </Button>
      </div>
    </form>
  );

  if (obligatoire) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#f4f5f7] px-4 py-10 dark:bg-background">
        <section className="w-full max-w-[440px] rounded-lg border border-border bg-white px-7 py-8 shadow-sm dark:bg-card">
          <h1 className="text-[18px] font-semibold">Choisissez votre mot de passe</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Pour la sécurité de votre compte, remplacez le mot de passe temporaire par un mot de passe personnel, connu de
            vous seul.
          </p>
          <div className="mt-5">{formulaire}</div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader titre="Mon mot de passe" description="Modifier le mot de passe de votre compte" />
      <div className="max-w-md rounded-xl border border-border bg-card p-6">
        <Encart className="mb-4">Ne communiquez jamais votre mot de passe, même à l'administrateur.</Encart>
        {formulaire}
      </div>
    </div>
  );
}
