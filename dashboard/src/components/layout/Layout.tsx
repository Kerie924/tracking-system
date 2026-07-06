import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  Monitor,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEV_ALL_ADMIN } from '@/lib/config';
import { useTranslation } from '@/contexts/LanguageContext';
import { signOut } from '@/services/auth';
import { Button } from '@/components/ui/Button';
import appIcon from '@/assets/app-icon-1024.png';

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { t } = useTranslation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t.nav.dashboard },
    { to: '/departures', icon: FileText, label: t.nav.serviceSheets },
    { to: '/analytics', icon: BarChart3, label: t.nav.analytics },
    ...(isAdmin || DEV_ALL_ADMIN
      ? [{ to: '/users', icon: Users, label: t.nav.userManagement }]
      : []),
    { to: '/profile', icon: UserCircle, label: t.nav.profile },
    { to: '/tv', icon: Monitor, label: t.nav.tvMode },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-surface-200 bg-white transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0'
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-surface-200 px-4">
        <img src={appIcon} alt='layout-logo' className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" />
        {!collapsed && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="truncate text-sm font-bold text-surface-900">
              {t.appName}
            </h1>
            <p className="truncate text-xs text-surface-800/50">
              {t.appSubtitle}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onMobileClose}
          className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 md:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive =
            to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand-50 text-brand-700 shadow-sm'
                  : 'text-surface-800/60 hover:bg-surface-50 hover:text-surface-900'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  isActive ? 'text-brand-600' : 'text-surface-400'
                )}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="hidden border-t border-surface-200 p-3 md:block">
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="flex w-full items-center justify-center rounded-xl p-2 text-surface-400 hover:bg-surface-50 hover:text-surface-600"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const { user, profile } = useAuth();
  const { t, locale } = useTranslation();
  const now = new Date();
  const displayName = profile?.name ?? user?.displayName ?? '—';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-surface-200 bg-white/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-xl p-2 text-surface-600 hover:bg-surface-100 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-surface-900 sm:text-xl">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-surface-800/50 sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden text-right lg:block">
            <p className="text-sm font-medium text-surface-900">
              {now.toLocaleDateString(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            <p className="text-xs text-surface-800/50">
              {now.toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <Link
            to="/profile"
            className="hidden text-right md:block hover:opacity-80"
          >
            <p className="max-w-[120px] truncate text-sm font-medium text-surface-900 lg:max-w-[160px]">
              {displayName}
            </p>
            <p className="max-w-[120px] truncate text-xs text-surface-800/50 lg:max-w-[160px]">
              {user?.email}
            </p>
          </Link>
          <Link
            to="/profile"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 sm:h-10 sm:w-10 sm:text-sm"
          >
            {initials}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            title={t.auth.signOut}
            className="px-2 sm:px-3"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export function Layout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-surface-50">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-surface-900/50 md:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          'ml-0',
          collapsed ? 'md:ml-[72px]' : 'md:ml-64'
        )}
      >
        <Header
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setMobileOpen(true)}
        />
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
