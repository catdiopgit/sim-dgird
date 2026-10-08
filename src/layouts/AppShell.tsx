import {
  Bell,
  ChevronDown,
  ChevronRight,
  Compass,
  FolderOpen,
  Gavel,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu as MenuIcon,
  Moon,
  PanelLeftClose,
  Search,
  Settings,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SimMonogram } from '../components/branding/SimMonogram';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { env } from '../config/env';
import { useOrganisationBranding } from '../hooks/administration/useOrganisationBranding';
import { useBannetteCourriers } from '../hooks/courrier/useCourriers';
import { useEcheancesProchaines } from '../hooks/dashboard/useEcheancesProchaines';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { cn } from '../lib/utils';
import { PeriodSelector } from '../modules/dashboard/PeriodSelector';
import { usePeriodeStore } from '../modules/dashboard/usePeriodeStore';
import { useUiPreferences } from '../stores/uiPreferences';

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

const navSections: { titre: string; items: NavItem[] }[] = [
  { titre: 'Pilotage', items: [{ key: '/', label: 'Tableau de bord', icon: LayoutDashboard }] },
  {
    titre: 'Activité',
    items: [
      { key: '/courriers', label: 'Courriers', icon: Mail },
      { key: '/ged', label: 'GED', icon: FolderOpen },
      { key: '/projets', label: 'Projets', icon: KanbanSquare },
      ...(env.missionsEnabled ? [{ key: '/missions', label: 'Missions', icon: Compass }] : []),
      ...(env.marchesEnabled ? [{ key: '/marches', label: 'Marchés', icon: Gavel }] : []),
    ],
  },
  { titre: 'Système', items: [{ key: '/administration', label: 'Administration', icon: Settings }] },
];

const navItems = navSections.flatMap((s) => s.items);

const labelByPath: Record<string, string> = Object.fromEntries(navItems.map((item) => [item.key, item.label]));

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, can } = useProfile();
  const { sidebarCollapsed, toggleSidebar, themeMode, toggleThemeMode } = useUiPreferences();
  const { periode, setPeriode } = usePeriodeStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Même requête que ThemedApp (couleur de marque) : servie depuis le cache.
  const { data: branding } = useOrganisationBranding();
  const [logoEnErreur, setLogoEnErreur] = useState<string | null>(null);
  const logoOrganisation = branding?.logo_url && branding.logo_url !== logoEnErreur ? branding.logo_url : null;

  const { data: echeances } = useEcheancesProchaines(30);
  const nombreAlertes = echeances?.filter((e) => e.enRetard).length ?? 0;
  // Même clé de requête que la bannette « À traiter » de CourrierListePage :
  // le compteur réutilise le cache au lieu de doubler l'appel.
  const { data: aTraiter } = useBannetteCourriers(can('courrier', 'consulter') ? 'a_traiter' : undefined);
  const badges: Record<string, number | undefined> = { '/courriers': aTraiter?.length };

  const selectedKey = useMemo(() => {
    const match = navItems.find((item) =>
      item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key),
    );
    return match?.key ?? '/';
  }, [location.pathname]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const displayName = profile ? `${profile.prenom} ${profile.nom}`.trim() : user?.email;
  const initials = profile ? `${profile.prenom[0] ?? ''}${profile.nom[0] ?? ''}`.toUpperCase() : '?';
  const estTableauDeBord = selectedKey === '/';
  const replie = sidebarCollapsed && !mobileOpen;

  const seDeconnecter = () => {
    void signOut().then(() => navigate('/login', { replace: true }));
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-svh bg-background text-foreground">
        {/* ------------------------------------------------ Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex h-svh shrink-0 flex-col border-r border-border bg-sidebar transition-[width,transform] duration-200',
            'lg:sticky lg:top-0 lg:translate-x-0',
            'w-[272px]',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
            replie ? 'lg:w-[72px]' : 'lg:w-64',
          )}
        >
          <div className="flex h-16 items-center gap-3 border-b border-border px-4">
            {logoOrganisation ? (
              <img
                src={logoOrganisation}
                alt={branding?.nom ?? ''}
                className="size-9 shrink-0 object-contain"
                onError={() => setLogoEnErreur(logoOrganisation)}
              />
            ) : (
              <SimMonogram size={36} />
            )}
            {!replie && (
              <div className="min-w-0 flex-1 leading-tight">
                <div className="font-serif-title text-[17px] font-semibold">{env.appName}</div>
                <div className="text-[10px] font-medium uppercase leading-snug tracking-[.06em] text-muted-foreground">
                  Système d'Information Managérial
                </div>
              </div>
            )}
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">
              <X />
            </Button>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
            {navSections.map((section) => (
              <div key={section.titre}>
                {!replie && (
                  <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.titre}
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const actif = item.key === selectedKey;
                    const badge = badges[item.key];
                    const Icone = item.icon;
                    const lien = (
                      <Link
                        to={item.key}
                        aria-current={actif ? 'page' : undefined}
                        className={cn(
                          'relative flex h-10 items-center gap-3 rounded-lg px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                          actif && 'bg-accent font-semibold text-accent-foreground hover:bg-accent hover:text-accent-foreground',
                          replie && 'justify-center px-0',
                        )}
                      >
                        {actif && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-gold" />}
                        <Icone className="size-[18px] shrink-0" strokeWidth={1.75} />
                        {!replie && <span className="flex-1 truncate">{item.label}</span>}
                        {!replie && badge ? (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary-foreground">
                            {badge}
                          </span>
                        ) : null}
                        {replie && badge ? <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" /> : null}
                      </Link>
                    );
                    return replie ? (
                      <Tooltip key={item.key}>
                        <TooltipTrigger asChild>{lien}</TooltipTrigger>
                        <TooltipContent side="right">
                          {item.label}
                          {badge ? ` · ${badge}` : ''}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div key={item.key}>{lien}</div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="space-y-2 border-t border-border p-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className={cn(
                'hidden h-9 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground lg:flex',
                replie && 'justify-center px-0',
              )}
              aria-label={replie ? 'Déplier le menu' : 'Replier le menu'}
            >
              <PanelLeftClose className={cn('size-[18px] shrink-0 transition-transform', replie && 'rotate-180')} strokeWidth={1.75} />
              {!replie && <span>Replier le menu</span>}
            </button>
            <div className={cn('flex items-center gap-3 px-2 py-1.5', replie && 'justify-center px-0')}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-semibold text-accent-foreground">
                {initials}
              </span>
              {!replie && (
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-[13px] font-semibold">{displayName}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
        )}

        {/* ------------------------------------------------ Contenu */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur sm:gap-3 sm:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
              <MenuIcon className="size-5" />
            </Button>

            <nav className="hidden min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground md:flex" aria-label="Fil d'Ariane">
              <Link to="/" className="hover:text-foreground">
                {env.appName}
              </Link>
              {!estTableauDeBord && (
                <>
                  <ChevronRight className="size-3.5" />
                  <span className="truncate font-medium text-foreground">{labelByPath[selectedKey]}</span>
                </>
              )}
            </nav>

            <div className="flex min-w-0 flex-1 justify-center px-1">
              <label className="relative w-full max-w-[420px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Rechercher un courrier, un document, un projet…"
                  className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[13px] placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                />
              </label>
            </div>

            {estTableauDeBord && <PeriodSelector periode={periode} onChange={setPeriode} />}

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={nombreAlertes > 0 ? `${nombreAlertes} échéance(s) dépassée(s)` : 'Aucune alerte'}
              title={nombreAlertes > 0 ? `${nombreAlertes} échéance(s) dépassée(s)` : 'Aucune alerte'}
            >
              <Bell className="size-[18px]" strokeWidth={1.75} />
              {nombreAlertes > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-crit px-1 text-[10px] font-bold tabular-nums text-white">
                  {nombreAlertes}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleThemeMode}
              aria-label={themeMode === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              title={themeMode === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
              {themeMode === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 cursor-pointer items-center gap-2 rounded-lg pl-1 pr-2 hover:bg-muted"
                  aria-label="Menu utilisateur"
                >
                  <span className="grid size-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {initials}
                  </span>
                  <span className="hidden max-w-40 truncate text-[13px] font-semibold xl:inline">{displayName}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <div className="px-2.5 py-2">
                  <div className="truncate text-[13px] font-semibold">{displayName}</div>
                  <div className="truncate text-[12px] text-muted-foreground">{user?.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={seDeconnecter}>
                  <LogOut />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
