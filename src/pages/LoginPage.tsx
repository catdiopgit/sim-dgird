import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { DrapeauSenegal } from '../components/branding/DrapeauSenegal';
import { useOrganisationBranding } from '../hooks/administration/useOrganisationBranding';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

const loginSchema = z.object({
  email: z.string().min(1, "L'adresse e-mail est requise").email('Adresse e-mail invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Page de connexion sobre et institutionnelle (v8.6.1) : en-tête République /
// Ministère, logo et nom de l'organisation, formulaire, mention d'accès
// réservé. Le logo et le nom viennent du paramétrage de l'organisation
// (Administration → Organisation), lus via la route publique « branding ».
const NOM_PAR_DEFAUT = 'Direction Générale des Infrastructures Routières et du Désenclavement';
const SIGLE = 'DGIRD';
const MINISTERE = 'Ministère des Infrastructures';
const PAYS = { nom: 'République du Sénégal', devise: 'Un Peuple – Un But – Une Foi' };
const COULEURS_NATIONALES = ['#00853F', '#FDEF42', '#E31B23'];
const COULEUR_PAR_DEFAUT = '#124fa4';

export function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const location = useLocation();
  const { data: branding } = useOrganisationBranding();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [logoEnErreur, setLogoEnErreur] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (!loading && session) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    setSubmitting(true);
    const { error } = await signIn(values.email, values.password);
    setSubmitting(false);
    if (error) {
      setSubmitError(
        error === 'Identifiants invalides' || error === 'Invalid login credentials'
          ? 'Adresse e-mail ou mot de passe incorrect.'
          : error,
      );
    }
  };

  const detecterCapsLock = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState('CapsLock'));

  const nomOrganisation = branding?.nom || NOM_PAR_DEFAUT;
  const logoUrl = branding?.logo_url && !logoEnErreur ? branding.logo_url : null;
  const style = { '--login-couleur': branding?.couleur_primaire || COULEUR_PAR_DEFAUT } as CSSProperties;

  const champ = (enErreur: boolean) =>
    cn(
      'h-11 w-full rounded-md border bg-white px-3 text-[15px] text-foreground transition-colors dark:bg-card',
      'focus:outline-none focus:ring-2',
      enErreur
        ? 'border-crit focus:ring-crit/20'
        : 'border-input focus:border-[var(--login-couleur)] focus:ring-[var(--login-couleur)]/20',
    );

  return (
    <div className="flex min-h-svh flex-col bg-[#f4f5f7] dark:bg-background" style={style}>
      <div className="flex h-1 w-full shrink-0" aria-hidden>
        {COULEURS_NATIONALES.map((c) => (
          <span key={c} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px]">
          {/* En-tête institutionnel */}
          <header className="text-center">
            <div className="flex items-center justify-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-foreground/80">
              <DrapeauSenegal width={21} height={14} />
              {PAYS.nom}
            </div>
            <p className="mt-0.5 text-[12px] italic text-muted-foreground">{PAYS.devise}</p>
            <span className="mx-auto mt-2 block h-px w-10 bg-border" aria-hidden />
            <p className="mt-2 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{MINISTERE}</p>
          </header>

          <section className="mt-6 rounded-lg border border-border bg-white px-7 py-8 shadow-sm sm:px-9 dark:bg-card">
            <div className="flex flex-col items-center text-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`Logo — ${SIGLE}`}
                  onError={() => setLogoEnErreur(true)}
                  className="h-16 w-auto max-w-[260px] object-contain"
                />
              ) : (
                <span className="font-serif-title text-[26px] font-semibold tracking-wide text-[var(--login-couleur)]">{SIGLE}</span>
              )}
              <h1 className="mt-4 text-[15px] font-semibold leading-snug text-foreground">{nomOrganisation}</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">Système d’Information Managérial (SIM)</p>
            </div>

            <hr className="my-6 border-border" />

            <h2 className="text-[17px] font-semibold">Connexion</h2>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium">
                  Adresse e-mail
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoFocus
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-erreur' : undefined}
                  className={champ(Boolean(errors.email))}
                  {...register('email')}
                />
                {errors.email && (
                  <p id="email-erreur" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-crit-text">
                    <CircleAlert className="size-3.5 shrink-0" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'password-erreur' : capsLock ? 'capslock' : undefined}
                    onKeyUp={detecterCapsLock}
                    onKeyDown={detecterCapsLock}
                    className={cn(champ(Boolean(errors.password)), 'pr-11')}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((v) => !v)}
                    aria-label={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    aria-pressed={passwordVisible}
                    className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {passwordVisible ? <EyeOff className="size-[17px]" /> : <Eye className="size-[17px]" />}
                  </button>
                </div>
                {errors.password ? (
                  <p id="password-erreur" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-crit-text">
                    <CircleAlert className="size-3.5 shrink-0" />
                    {errors.password.message}
                  </p>
                ) : (
                  capsLock && (
                    <p id="capslock" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-warn-text">
                      <CircleAlert className="size-3.5 shrink-0" />
                      La touche Verr. Maj est activée.
                    </p>
                  )
                )}
              </div>

              {submitError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-md border border-crit/30 bg-crit/8 px-3 py-2.5 text-[13px] text-crit-text">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--login-couleur)] text-[15px] font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--login-couleur)]/40 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="size-[18px] animate-spin" />
                    Connexion…
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>
          </section>

          <footer className="mt-6 space-y-1 text-center text-[12px] text-muted-foreground">
            <p>Accès réservé aux agents habilités. En cas de difficulté, contactez l'administrateur du système.</p>
            <p>
              © {new Date().getFullYear()} — {SIGLE}
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
