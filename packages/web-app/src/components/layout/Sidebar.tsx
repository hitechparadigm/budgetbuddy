/**
 * Sidebar Navigation Component
 *
 * IA redesign — three clear sections replacing the single overloaded "Manage" group:
 *   1. Primary nav (daily use): Overview, Budget, Accounts, Goals, Insights
 *   2. Track (asset/liability monitoring): Debt Payoff, Investments, Net Worth, Credit Score
 *   3. Manage (recurring obligations + admin): Bills, Subscriptions, Members
 *   4. Tools — standalone, no group, links to public calculators page
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Landmark,
  Target,
  Sparkles,
  Settings2,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
  CreditCard,
  Award,
  TrendingUp,
  Wallet,
  Users,
  Wrench,
  BarChart2,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
}

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
  userName?: string;
  userEmail?: string;
}

/** Primary navigation — daily-use items */
export const navItems: NavItem[] = [
  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard, path: '/overview' },
  { id: 'budget',    label: 'Budget',    icon: LayoutDashboard, path: '/budget' },
  { id: 'accounts',  label: 'Accounts',  icon: Landmark,        path: '/accounts' },
  { id: 'goals',     label: 'Goals',     icon: Target,          path: '/goals' },
  { id: 'insights',  label: 'Insights',  icon: Sparkles,        path: '/insights' },
];

/** Track group — monitoring assets, debts, and financial health */
export const trackItems: NavItem[] = [
  { id: 'debts',        label: 'Debt Payoff',  icon: CreditCard, path: '/debts' },
  { id: 'investments',  label: 'Investments',  icon: TrendingUp, path: '/investments' },
  { id: 'net-worth',    label: 'Net Worth',    icon: Wallet,     path: '/net-worth' },
  { id: 'credit-score', label: 'Credit Score', icon: Award,      path: '/credit-score' },
];

/** Manage group — recurring obligations and account admin */
export const manageItems: NavItem[] = [
  { id: 'bills',         label: 'Bills',         icon: FileText,   path: '/bills' },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw,  path: '/subscriptions' },
  { id: 'members',       label: 'Members',       icon: Users,      path: '/budget/members' },
];

/** Bottom secondary nav */
export const secondaryNavItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings2, path: '/settings' },
];

const SIDEBAR_COLLAPSED_KEY  = 'budgetbuddy_sidebar_collapsed';
const TRACK_EXPANDED_KEY     = 'budgetbuddy_track_expanded';
const MANAGE_EXPANDED_KEY    = 'budgetbuddy_manage_expanded';

export function useSidebarCollapse(isMobile: boolean): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return true;
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === 'true';
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (!isMobile) localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  return [collapsed, toggleCollapse];
}

interface NavButtonProps {
  item: NavItem;
  collapsed: boolean;
  isMobile: boolean;
  active: boolean;
  onClick: (path: string) => void;
}

const NavButton: React.FC<NavButtonProps> = ({ item, collapsed, isMobile, active, onClick }) => {
  const Icon = item.icon;
  const iconOnly = collapsed && !isMobile;

  return (
    <li>
      <button
        onClick={() => onClick(item.path)}
        aria-label={iconOnly ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        title={iconOnly ? item.label : undefined}
        className={[
          'w-full flex items-center py-2 rounded-lg transition-colors',
          iconOnly ? 'justify-center px-2' : 'space-x-3 px-3',
          active
            ? 'bg-[var(--color-accent)] text-[var(--color-sidebar-active-text)] font-medium border-l-[3px] border-[var(--color-sidebar-active-border)]'
            : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
        ].filter(Boolean).join(' ')}
      >
        <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
        {!iconOnly && <span className="flex-1 text-left">{item.label}</span>}
        {!iconOnly && item.badge && item.badge > 0 && (
          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{item.badge}</span>
        )}
      </button>
    </li>
  );
};

/** Reusable collapsible section header */
interface SectionToggleProps {
  label: string;
  icon: LucideIcon;
  expanded: boolean;
  isActive: boolean;
  iconOnly: boolean;
  onToggle: () => void;
}

const SectionToggle: React.FC<SectionToggleProps> = ({ label, icon: Icon, expanded, isActive, iconOnly, onToggle }) => (
  <button
    onClick={onToggle}
    aria-label={iconOnly ? label : undefined}
    title={iconOnly ? label : undefined}
    aria-expanded={!iconOnly ? expanded : undefined}
    className={[
      'w-full flex items-center py-2 rounded-lg transition-colors',
      iconOnly ? 'justify-center px-2' : 'space-x-3 px-3',
      isActive
        ? 'text-[var(--color-sidebar-active-text)] bg-[var(--color-accent)]'
        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
    ].filter(Boolean).join(' ')}
  >
    <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
    {!iconOnly && (
      <>
        <span className="flex-1 text-left text-sm font-medium">{label}</span>
        {expanded ? <ChevronUp className="w-4 h-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />}
      </>
    )}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse, isMobile, userName, userEmail }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [trackExpanded, setTrackExpanded] = useState(() => {
    const stored = localStorage.getItem(TRACK_EXPANDED_KEY);
    return stored !== 'false';
  });
  const [manageExpanded, setManageExpanded] = useState(() => {
    const stored = localStorage.getItem(MANAGE_EXPANDED_KEY);
    return stored !== 'false';
  });

  const toggleTrack = () => {
    setTrackExpanded(prev => { const next = !prev; localStorage.setItem(TRACK_EXPANDED_KEY, String(next)); return next; });
  };
  const toggleManage = () => {
    setManageExpanded(prev => { const next = !prev; localStorage.setItem(MANAGE_EXPANDED_KEY, String(next)); return next; });
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('userId');
    navigate('/auth');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile && !collapsed) onToggleCollapse();
  };

  const isActive = (path: string): boolean => {
    if (path === '/overview') return location.pathname === '/overview' || location.pathname === '/';
    if (path === '/budget') return location.pathname === '/budget';
    return location.pathname.startsWith(path);
  };

  const isTrackActive  = trackItems.some(i => isActive(i.path));
  const isManageActive = manageItems.some(i => isActive(i.path));
  const iconOnly = collapsed && !isMobile;

  const subList = (items: NavItem[], show: boolean) =>
    show && (
      <ul className="mt-0.5 ml-4 space-y-0.5 border-l border-[var(--color-border)] pl-3" role="list">
        {items.map(item => (
          <NavButton key={item.id} item={item} collapsed={false} isMobile={isMobile} active={isActive(item.path)} onClick={handleNavClick} />
        ))}
      </ul>
    );

  const iconList = (items: NavItem[]) => (
    <ul className="mt-0.5 space-y-0.5" role="list">
      {items.map(item => (
        <NavButton key={item.id} item={item} collapsed={true} isMobile={false} active={isActive(item.path)} onClick={handleNavClick} />
      ))}
    </ul>
  );

  return (
    <>
      {!collapsed && isMobile && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onToggleCollapse} aria-hidden="true" />
      )}

      <aside
        className={[
          isMobile && collapsed  ? 'hidden' : '',
          isMobile && !collapsed ? 'fixed inset-y-0 left-0 z-50 w-64' : '',
          !isMobile && collapsed  ? 'w-16' : '',
          !isMobile && !collapsed ? 'w-64' : '',
          'bg-[var(--color-sidebar)] border-r border-[var(--color-sidebar-border)]',
          'flex flex-col transition-all duration-300',
        ].filter(Boolean).join(' ')}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-sidebar-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm" aria-hidden="true">$</span>
              </div>
              {!iconOnly && <span className="font-semibold text-[var(--color-sidebar-foreground)]">BudgetBuddy</span>}
            </div>
            <button
              onClick={onToggleCollapse}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-5 h-5" aria-hidden="true" /> : <ChevronLeft className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-0.5" aria-label="Main navigation">

          {/* ── Primary (daily use) ───────────────────────────── */}
          <ul className="space-y-0.5" role="list">
            {navItems.map(item => (
              <NavButton key={item.id} item={item} collapsed={collapsed} isMobile={isMobile} active={isActive(item.path)} onClick={handleNavClick} />
            ))}
          </ul>

          <div className="my-1.5 border-t border-[var(--color-border)]" />

          {/* ── Track (asset/debt monitoring) ────────────────── */}
          <div>
            <SectionToggle label="Track" icon={BarChart2} expanded={trackExpanded} isActive={isTrackActive} iconOnly={iconOnly} onToggle={toggleTrack} />
            {!iconOnly ? subList(trackItems, trackExpanded) : iconList(trackItems)}
          </div>

          <div className="my-1.5 border-t border-[var(--color-border)]" />

          {/* ── Manage (obligations + admin) ─────────────────── */}
          <div>
            <SectionToggle label="Manage" icon={ListChecks} expanded={manageExpanded} isActive={isManageActive} iconOnly={iconOnly} onToggle={toggleManage} />
            {!iconOnly ? subList(manageItems, manageExpanded) : iconList(manageItems)}
          </div>

          <div className="my-1.5 border-t border-[var(--color-border)]" />

          {/* ── Tools — standalone (no group) ────────────────── */}
          <ul className="space-y-0.5" role="list">
            <NavButton item={{ id: 'tools', label: 'Tools', icon: Wrench, path: '/tools' }} collapsed={collapsed} isMobile={isMobile} active={isActive('/tools')} onClick={handleNavClick} />
          </ul>

          <div className="my-1.5 border-t border-[var(--color-border)]" />

          {/* ── Settings ─────────────────────────────────────── */}
          <ul className="space-y-0.5" role="list">
            {secondaryNavItems.map(item => (
              <NavButton key={item.id} item={item} collapsed={collapsed} isMobile={isMobile} active={isActive(item.path)} onClick={handleNavClick} />
            ))}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="border-t border-[var(--color-sidebar-border)] p-3">
          {!iconOnly && (
            <div className="mb-2">
              <div className="flex items-center space-x-3 px-3 py-2">
                <div className="w-8 h-8 bg-[var(--color-muted)] rounded-full flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-[var(--color-muted-foreground)]" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-sidebar-foreground)] truncate">{userName || 'User'}</p>
                  {userEmail && <p className="text-xs text-[var(--color-muted-foreground)] truncate">{userEmail}</p>}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={[
              'w-full flex items-center py-2 rounded-lg transition-colors',
              iconOnly ? 'justify-center px-2' : 'space-x-3 px-3',
              'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-destructive)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
            ].filter(Boolean).join(' ')}
            aria-label={iconOnly ? 'Log out' : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
            {!iconOnly && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
