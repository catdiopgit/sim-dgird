import { Building2, GitBranch, History, KeyRound, SlidersHorizontal, UserRoundCog, Users, type LucideIcon } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/page-header';
import { TabBar } from '../../components/ui/tab-bar';
import { cn } from '../../lib/utils';

type Section = 'organisation' | 'utilisateurs' | 'roles' | 'workflows' | 'delegations' | 'parametrage' | 'audit';

const SECTIONS: { cle: Section; libelle: string; description: string; icone: LucideIcon }[] = [
  { cle: 'organisation', libelle: 'Organisation', description: 'Identité, entités, fonctions', icone: Building2 },
  { cle: 'utilisateurs', libelle: 'Utilisateurs', description: 'Comptes et affectations', icone: Users },
  { cle: 'roles', libelle: 'Rôles & Permissions', description: 'Droits par module', icone: KeyRound },
  { cle: 'workflows', libelle: 'Workflows', description: 'Circuits de traitement', icone: GitBranch },
  { cle: 'delegations', libelle: 'Délégations', description: 'Intérims et suppléances', icone: UserRoundCog },
  { cle: 'parametrage', libelle: 'Paramétrage', description: 'Listes, numérotation, SMTP…', icone: SlidersHorizontal },
  { cle: 'audit', libelle: 'Audit', description: 'Journal des opérations', icone: History },
];

// Page « paramètres » : navigation par sections (routes enfants inchangées,
// /administration/<section>) — liste verticale sur grand écran, onglets
// défilants sur mobile.
export function AdministrationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const actif: Section = SECTIONS.find((s) => location.pathname.endsWith(`/${s.cle}`))?.cle ?? 'organisation';
  const section = SECTIONS.find((s) => s.cle === actif)!;

  return (
    <div className="space-y-5">
      <PageHeader titre="Administration" description="Organisation, accès, circuits et paramètres de l'application" />

      <div className="lg:hidden">
        <TabBar label="Sections" onglets={SECTIONS} actif={actif} onChange={(cle) => navigate(cle)} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Sections de l'administration" className="hidden space-y-1 lg:sticky lg:top-24 lg:block">
          {SECTIONS.map(({ cle, libelle, description, icone: Icone }) => {
            const estActif = cle === actif;
            return (
              <Link
                key={cle}
                to={cle}
                aria-current={estActif ? 'page' : undefined}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
                  estActif ? 'bg-card shadow-sm ring-1 ring-border' : 'hover:bg-muted',
                )}
              >
                <Icone className={cn('mt-0.5 size-4 shrink-0', estActif ? 'text-primary' : 'text-muted-foreground')} strokeWidth={1.75} />
                <span className="min-w-0">
                  <span className={cn('block text-[13px]', estActif ? 'font-semibold' : 'font-medium')}>{libelle}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">{description}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <section aria-labelledby="section-admin" className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-5 border-b border-border pb-4">
            <h2 id="section-admin" className="text-[17px] font-semibold">
              {section.libelle}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{section.description}</p>
          </div>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
