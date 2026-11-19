import { KeyRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Champ } from '../components/form/champ';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useOrganisationBranding } from '../hooks/administration/useOrganisationBranding';
import { CLE_MOTIF_DECONNEXION } from '../hooks/useDeconnexionInactivite';
import { activerCompte, verifierLienActivation } from '../services/administration/utilisateurs';

const REGLE = 'Au moins 10 caractères, avec au moins une lettre et un chiffre.';

// v8.6.9 — page publique ouverte depuis le lien d'activation reçu par e-mail :
// l'agent choisit son mot de passe, puis se connecte normalement.
export function ActivationPage() {
  const [params] = useSearchParams();
  const jeton = params.get('jeton') ?? '';
  const navigate = useNavigate();
  const { data: branding } = useOrganisationBranding();
  const [compte, setCompte] = useState<{ email: string; prenom: string } | null>(null);
  const [lienInvalide, setLienInvalide] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!jeton) {
      setLienInvalide("Ce lien est incomplet. Ouvrez à nouveau le lien reçu par e-mail.");
      return;
    }
    verifierLienActivation(jeton)
      .then(setCompte)
      .catch((e: Error) => setLienInvalide(e.message));
  }, [jeton]);

  const valider = async (e: FormEvent) => {
    e.preventDefault();
    if (nouveau.length < 10 || !/[A-Za-zÀ-ÿ]/.test(nouveau) || !/\d/.test(nouveau)) return setErreur(REGLE);
    if (compte && nouveau.toLowerCase() === compte.email.toLowerCase()) return setErreur('Le mot de passe ne peut pas être votre adresse e-mail.');
    if (nouveau !== confirmation) return setErreur('Les deux saisies ne correspondent pas.');
    setErreur(null);
    setEnCours(true);
    try {
      await activerCompte(jeton, nouveau);
      try {
        sessionStorage.setItem(CLE_MOTIF_DECONNEXION, 'Votre compte est activé. Connectez-vous avec votre adresse e-mail et le mot de passe que vous venez de choisir.');
      } catch {
        /* stockage indisponible : sans conséquence */
      }
      navigate('/login', { replace: true });
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#f4f5f7] px-4 py-10 dark:bg-background">
      <section className="w-full max-w-[440px] rounded-lg border border-border bg-white px-7 py-8 shadow-sm dark:bg-card">
        {branding?.logo_url && <img src={branding.logo_url} alt="" className="mx-auto mb-4 h-16 w-auto" />}
        <h1 className="text-center text-[18px] font-semibold">Activation de votre compte</h1>
        {lienInvalide ? (
          <div className="mt-5 space-y-4">
            <div role="alert" className="rounded-md border border-crit/30 bg-crit/8 px-3 py-2.5 text-[13px] text-crit-text">
              {lienInvalide}
            </div>
            <Link to="/login" className="block text-center text-[13px] text-primary underline">
              Aller à la page de connexion
            </Link>
          </div>
        ) : !compte ? (
          <p className="mt-4 text-center text-[13px] text-muted-foreground">Vérification du lien…</p>
        ) : (
          <>
            <p className="mt-1.5 text-center text-[13px] text-muted-foreground">
              Bonjour {compte.prenom}, choisissez le mot de passe de votre compte <b>{compte.email}</b>.
            </p>
            <form onSubmit={valider} className="mt-5 space-y-4" noValidate>
              <Champ label="Mot de passe" htmlFor="act-nouveau" requis aide={REGLE}>
                <Input id="act-nouveau" type="password" autoComplete="new-password" autoFocus value={nouveau} onChange={(e) => setNouveau(e.target.value)} />
              </Champ>
              <Champ label="Confirmer le mot de passe" htmlFor="act-confirmation" requis>
                <Input id="act-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
              </Champ>
              {erreur && (
                <div role="alert" className="rounded-md border border-crit/30 bg-crit/8 px-3 py-2.5 text-[13px] text-crit-text">
                  {erreur}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={enCours || !nouveau || !confirmation}>
                <KeyRound />
                {enCours ? 'Activation…' : 'Activer mon compte'}
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
