'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, Building2, FileText, DollarSign, Wrench, Settings, ChevronLeft, ChevronRight, Bell, LogOut, BarChart3, Upload, ListChecks, Database, Users, RefreshCw, Mail, KeyRound, HardHat, ClipboardList, LineChart, Receipt, UserCog, Home, Menu, X, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import { useDataRefresh } from '@/contexts/DataRefreshContext';

interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  group?: string;
}

interface UserProfile {
  full_name: string;
  role: string;
  email: string;
}

const navItems: NavItem[] = [
  { id: 'nav-dashboard', labelKey: 'sidebar_dashboard', icon: <LayoutDashboard size={18} />, href: '/dashboard', group: 'main' },
  { id: 'nav-landlord-dashboard', labelKey: 'sidebar_landlord_dashboard', icon: <Home size={18} />, href: '/landlord-dashboard', group: 'main' },
  { id: 'nav-property', labelKey: 'sidebar_property', icon: <Building2 size={18} />, href: '/property-management', group: 'main' },
  { id: 'nav-assignment', labelKey: 'sidebar_assignment', icon: <Users size={18} />, href: '/project-assignment', group: 'main' },
  { id: 'nav-leasing', labelKey: 'sidebar_leasing', icon: <FileText size={18} />, href: '/leasing', group: 'main' },
  { id: 'nav-renewals', labelKey: 'sidebar_renewals', icon: <RefreshCw size={18} />, href: '/lease-renewals', group: 'main' },
  { id: 'nav-move-in-out', labelKey: 'sidebar_move_in_out', icon: <ArrowLeftRight size={18} />, href: '/move-in-out', group: 'main' },
  { id: 'nav-invoicing', labelKey: 'sidebar_invoicing', icon: <DollarSign size={18} />, href: '/invoicing', group: 'main' },
  { id: 'nav-receipts', labelKey: 'sidebar_receipts', icon: <Receipt size={18} />, href: '/receipts', group: 'main' },
  { id: 'nav-communications', labelKey: 'sidebar_communications', icon: <Mail size={18} />, href: '/communications', group: 'main' },
  { id: 'nav-tenant-portal', labelKey: 'sidebar_tenant_portal', icon: <KeyRound size={18} />, href: '/tenant-portal', group: 'main' },
  { id: 'nav-provider-portal', labelKey: 'sidebar_provider_portal', icon: <HardHat size={18} />, href: '/service-provider-portal', group: 'main' },
  { id: 'nav-maintenance', labelKey: 'sidebar_maintenance', icon: <Wrench size={18} />, href: '/maintenance', group: 'operations' },
  { id: 'nav-workorders', labelKey: 'sidebar_workorders', icon: <ListChecks size={18} />, href: '/work-orders', group: 'operations' },
  { id: 'nav-masterdata', labelKey: 'sidebar_masterdata', icon: <Database size={18} />, href: '/master-data', group: 'admin' },
  { id: 'nav-bulk', labelKey: 'sidebar_bulk', icon: <Upload size={18} />, href: '/bulk-onboarding', group: 'admin' },
  { id: 'nav-staff-assignments', labelKey: 'sidebar_staff_assignments', icon: <UserCog size={18} />, href: '/staff-assignments', group: 'admin' },
  { id: 'nav-reports', labelKey: 'sidebar_reports', icon: <BarChart3 size={18} />, href: '/reports', group: 'admin' },
  { id: 'nav-analytics', labelKey: 'sidebar_analytics', icon: <LineChart size={18} />, href: '/analytics', group: 'admin' },
  { id: 'nav-audit-log', labelKey: 'sidebar_audit_log', icon: <ClipboardList size={18} />, href: '/audit-log', group: 'admin' },
  { id: 'nav-settings', labelKey: 'sidebar_settings', icon: <Settings size={18} />, href: '/dashboard', group: 'admin' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, allowedNavKeys, user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { refreshAll } = useDataRefresh();
  const supabase = createClient();

  const groups = [
    { id: 'main', label: t.sidebar_group_portfolio },
    { id: 'operations', label: t.sidebar_group_operations },
    { id: 'admin', label: t.sidebar_group_admin },
  ];

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!user?.id) { setUserProfile(null); return; }
    const fetchProfile = async () => {
      const { data } = await supabase.from('user_profiles').select('full_name, role, email').eq('id', user.id).maybeSingle();
      if (data) {
        setUserProfile(data);
      } else {
        setUserProfile({
          full_name: user.user_metadata?.full_name || user.email || 'User',
          role: user.user_metadata?.role || 'admin',
          email: user.email || '',
        });
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleLogout = async () => {
    try { await signOut(); router.push('/sign-up-login-screen'); } catch (error) { console.error('Logout failed:', error); }
  };

  const displayName = userProfile?.full_name || user?.email || 'User';
  const displayRole = userProfile?.role
    ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1).replace(/_/g, ' ')
    : 'User';
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('');

  const isNavVisible = (item: NavItem): boolean => {
    if (allowedNavKeys === null) return true;
    return allowedNavKeys.includes(item.id);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <aside
      className={`flex flex-col bg-white border-r border-border h-full ${
        isMobile ? 'w-72' : `relative shrink-0 transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-60'}`
      }`}
      style={isMobile ? {} : { minHeight: '100vh' }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-4 border-b border-border ${!isMobile && collapsed ? 'justify-center px-0' : ''}`}>
        <AppLogo size={68} />
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {groups.map((group) => {
          const items = navItems.filter((n) => n.group === group.id && isNavVisible(n));
          if (items.length === 0) return null;
          return (
            <div key={`group-${group.id}`} className="mb-1">
              {(isMobile || !collapsed) && (
                <p className="px-4 py-1.5 text-[10px] font-600 tracking-widest uppercase text-muted-foreground select-none">
                  {group.label}
                </p>
              )}
              {items.map((item) => {
                const active = pathname === item.href;
                const label = (t as any)[item.labelKey] || item.labelKey;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    prefetch={true}
                    title={!isMobile && collapsed ? label : undefined}
                    className={`group relative flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 mb-0.5 ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'} ${!isMobile && collapsed ? 'justify-center px-0 mx-1' : ''}`}
                  >
                    <span className={`shrink-0 ${active ? 'text-primary' : ''}`}>{item.icon}</span>
                    {(isMobile || !collapsed) && <span className="truncate">{label}</span>}
                    {(isMobile || !collapsed) && item.badge && item.badge > 0 ? (
                      <span className="ml-auto bg-destructive/10 text-destructive text-[10px] font-600 px-1.5 py-0.5 rounded-full tabular-nums">{item.badge}</span>
                    ) : null}
                    {!isMobile && collapsed && item.badge && item.badge > 0 ? (
                      <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive text-white text-[9px] font-700 rounded-full flex items-center justify-center tabular-nums">{item.badge}</span>
                    ) : null}
                    {!isMobile && collapsed && (
                      <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap bg-foreground text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Language switcher */}
      {(isMobile || !collapsed) && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-0.5">
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-1 text-[11px] font-600 rounded-md transition-all duration-150 ${language === 'en' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={`flex-1 py-1 text-[11px] font-600 rounded-md transition-all duration-150 ${language === 'ar' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              عر
            </button>
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="border-t border-border p-3 space-y-1">
        <button
          className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 ${!isMobile && collapsed ? 'justify-center px-0' : ''}`}
          title={!isMobile && collapsed ? t.sidebar_notifications : undefined}
        >
          <Bell size={18} />
          {(isMobile || !collapsed) && <span>{t.sidebar_notifications}</span>}
          {!isMobile && collapsed && (
            <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap bg-foreground text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {t.sidebar_notifications}
            </span>
          )}
        </button>

        <div
          onClick={handleLogout}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary cursor-pointer transition-all duration-150 ${!isMobile && collapsed ? 'justify-center px-0' : ''}`}
          title={!isMobile && collapsed ? 'Logout' : undefined}
        >
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-600 shrink-0">
            {initials || '?'}
          </div>
          {(isMobile || !collapsed) && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-500 text-foreground truncate">{displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{displayRole}</p>
            </div>
          )}
          {(isMobile || !collapsed) && <LogOut size={14} className="text-muted-foreground shrink-0" />}
        </div>
      </div>

      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 bg-white border border-border rounded-full flex items-center justify-center shadow-card hover:shadow-card-hover transition-all duration-150 z-10"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={12} className="text-muted-foreground" /> : <ChevronLeft size={12} className="text-muted-foreground" />}
        </button>
      )}
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger button — shown only on small screens */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 w-9 h-9 bg-white border border-border rounded-lg flex items-center justify-center shadow-sm hover:bg-secondary transition-colors"
        aria-label="Open navigation"
      >
        <Menu size={18} className="text-foreground" />
      </button>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent isMobile={true} />
      </div>

      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <SidebarContent isMobile={false} />
      </div>
    </>
  );
}
