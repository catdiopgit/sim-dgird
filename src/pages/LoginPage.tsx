import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  FolderLock,
  Gavel,
  KanbanSquare,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { DrapeauSenegal } from '../components/branding/DrapeauSenegal';
import { env } from '../config/env';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

const loginSchema = z.object({
  email: z.string().min(1, "L'email est requis").email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const modules: { icon: LucideIcon; label: string }[] = [
  { icon: Mail, label: 'Courriers' },
  { icon: FolderLock, label: 'Archives' },
  { icon: KanbanSquare, label: 'Projets' },
  { icon: Gavel, label: 'Passation des marchés' },
];

// Identité institutionnelle de la page de connexion, volontairement
// indépendante de la base (voir documentation/Design page login.txt, §3/§4) —
// contrairement au reste de l'application (en-tête, documents imprimés), qui
// continue d'utiliser l'organisation configurée en base
// (useOrganisationBranding, App.tsx). Ne pas fusionner ces deux sources.
const NOM_ORGANISATION = 'DIRECTION GENERALE DES INSFRASTRUCTURES ROUTIERES ET DU DESCENCLAVEMENT - DGRID';
const SIGLE_ORGANISATION = 'DGIRD';
const NOM_MINISTERE = 'Ministère des Infrastructures';
const LOGO_LOGIN = '/logo-organisation.jpg';
const PAYS_COURANT = {
  nom: 'République du Sénégal',
  devise: 'Un Peuple – Un But – Une Foi',
  Drapeau: DrapeauSenegal,
  couleursNationales: ['#00853F', '#FDEF42', '#E31B23'],
};
const NOM_SYSTEME = 'Système d’Information Managérial';

// Palette fixe pour cette page uniquement (couleurs nationales du Sénégal) :
// volontairement découplée de la couleur de l'organisation en base
// (App.tsx/theme/couleurMarque.ts) pour ne dépendre d'aucune donnée de la base.
// Exposée en variables CSS locales pour les classes Tailwind de la page.
const palette = {
  '--login-primaire': '#00693a',
  '--login-primaire-fonce': '#003d1f',
  '--login-primaire-clair': '#00853F',
  '--login-primaire-hover': '#005a31',
  '--login-accent': '#f3dd5c',
} as CSSProperties;

// Motif « guilloché » discret (papier officiel) dessiné en SVG inline :
// aucune ressource externe.
const GUILLOCHE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='white' stroke-opacity='0.07'>${Array.from(
    { length: 6 },
    (_, i) => `<circle cx='60' cy='60' r='${12 + i * 9}'/>`,
  ).join('')}</g></svg>`,
)}")`;

function Identite({ compact = false }: { compact?: boolean }) {
  const { Drapeau } = PAYS_COURANT;
  return (
    <div className="flex items-center gap-4">
      <img
        src={LOGO_LOGIN}
        alt={`Logo — ${NOM_ORGANISATION}`}
        className={cn(
          'shrink-0 rounded-2xl bg-white object-contain shadow-lg shadow-black/20 ring-1 ring-white/40',
          compact ? 'size-14 p-1.5' : 'size-20 p-2',
        )}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
          <Drapeau width={21} height={14} />
          {PAYS_COURANT.nom}
        </div>
        <p className={cn('mt-0.5 italic text-white/60', compact ? 'text-[12px]' : 'text-[13px]')}>« {PAYS_COURANT.devise} »</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/85">{NOM_MINISTERE}</p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

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
        error === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : error,
      );
    }
  };

  const detecterCapsLock = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState('CapsLock'));

  const champ = (enErreur: boolean) =>
    cn(
      'h-12 w-full rounded-xl border bg-card pl-11 text-[15px] text-foreground shadow-sm transition-colors',
      'placeholder:text-muted-foreground/70 focus:outline-none focus:ring-4',
      enErreur
        ? 'border-crit focus:border-crit focus:ring-crit/15'
        : 'border-input hover:border-muted-foreground/40 focus:border-[var(--login-primaire)] focus:ring-[var(--login-primaire)]/15',
    );

  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row" style={palette}>
      {/* ----------------------------------------------------------- Identité */}
      <aside
        className="relative isolate flex shrink-0 flex-col overflow-hidden text-white lg:w-[52%] xl:w-[56%]"
        style={{ background: 'linear-gradient(150deg, var(--login-primaire-fonce) 0%, var(--login-primaire) 70%, var(--login-primaire-clair) 100%)' }}
      >
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: GUILLOCHE, backgroundSize: '120px 120px' }} aria-hidden />
        <div
          className="absolute -right-40 -bottom-48 -z-10 size-[560px] rounded-full border border-[var(--login-accent)]/20"
          aria-hidden
        />
        <div className="absolute -right-20 -bottom-28 -z-10 size-[360px] rounded-full border border-[var(--login-accent)]/15" aria-hidden />
        {/* Liseré aux couleurs nationales */}
        <div className="flex h-1.5 w-full" aria-hidden>
          {PAYS_COURANT.couleursNationales.map((couleur) => (
            <span key={couleur} className="flex-1" style={{ backgroundColor: couleur }} />
          ))}
        </div>

        {/* Version compacte (mobile / tablette) */}
        <div className="px-6 py-6 sm:px-10 lg:hidden">
          <Identite compact />
          <p className="mt-4 font-serif-title text-[17px] font-semibold leading-snug">{NOM_ORGANISATION}</p>
        </div>

        {/* Version complète (bureau) */}
        <div className="hidden flex-1 flex-col px-12 py-10 lg:flex xl:px-16">
          <Identite />

          <div className="my-auto max-w-xl py-12">
            <span className="mb-6 block h-0.5 w-12 rounded bg-[var(--login-accent)]" aria-hidden />
            <h1 className="font-serif-title text-[34px] font-semibold leading-[1.15] xl:text-[40px]">{NOM_ORGANISATION}</h1>
            <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--login-accent)]">
              {NOM_SYSTEME} – {env.appName}
            </p>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/75">
              Gestion sécurisée du courrier, des documents et du pilotage des activités de l'institution.
            </p>

            <ul className="mt-10 grid max-w-md grid-cols-2 gap-3">
              {modules.map(({ icon: Icone, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[14px] font-medium backdrop-blur-sm"
                >
                  <Icone className="size-[18px] text-[var(--login-accent)]" strokeWidth={1.75} />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between gap-4 text-[12px] text-white/55">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Traçabilité complète · accès maîtrisé par rôle
            </span>
            <span>
              © {new Date().getFullYear()} — {SIGLE_ORGANISATION}
            </span>
          </div>
        </div>
      </aside>

      {/* ----------------------------------------------------------- Formulaire */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--login-primaire)]/10 px-3 py-1 text-[12px] font-semibold tracking-wide text-[var(--login-primaire)] dark:bg-white/10 dark:text-white/85">
              <span className="size-1.5 rounded-full bg-[var(--login-primaire)] dark:bg-[var(--login-accent)]" />
              {env.appName} · Espace sécurisé
            </span>
            <h2 className="mt-4 font-serif-title text-[30px] font-semibold leading-tight">Connexion</h2>
            <p className="mt-1.5 text-[15px] text-muted-foreground">Accédez à votre espace de gestion.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-[13px] font-semibold">
                Identifiant <span className="font-normal text-muted-foreground">(email professionnel)</span>
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="prenom.nom@organisation.fr"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-erreur' : undefined}
                  className={cn(champ(Boolean(errors.email)), 'pr-4')}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p id="email-erreur" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-crit-text">
                  <CircleAlert className="size-3.5 shrink-0" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[13px] font-semibold">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-erreur' : capsLock ? 'capslock' : undefined}
                  onKeyUp={detecterCapsLock}
                  onKeyDown={detecterCapsLock}
                  className={cn(champ(Boolean(errors.password)), 'pr-12')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((v) => !v)}
                  aria-label={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={passwordVisible}
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-[var(--login-primaire)]"
                >
                  {passwordVisible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
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
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-crit/30 bg-crit/8 px-4 py-3 text-[14px] text-crit-text"
              >
                <CircleAlert className="mt-0.5 size-[18px] shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--login-primaire)] text-[15px] font-semibold text-white shadow-lg shadow-[var(--login-primaire)]/25 transition hover:bg-[var(--login-primaire-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--login-primaire)]/30 disabled:cursor-wait disabled:opacity-80"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="size-[18px] animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-3 border-t border-border pt-6 text-[13px] text-muted-foreground">
            <ShieldCheck className="size-5 shrink-0 text-[var(--login-primaire)] dark:text-[var(--login-accent)]" />
            <p>
              Accès réservé aux agents habilités. Besoin d'aide ? Contactez votre administrateur système.
            </p>
          </div>

          <p className="mt-10 text-center text-[12px] text-muted-foreground lg:hidden">
            © {new Date().getFullYear()} — {SIGLE_ORGANISATION}
          </p>
        </div>
      </main>
    </div>
  );
}
