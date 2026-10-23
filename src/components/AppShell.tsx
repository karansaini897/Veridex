import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FolderKanban,
  ShieldCheck,
  CalendarClock,
  BarChart3,
  Users,
  UserCircle,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import {
  ApplicationRecord,
  DocumentRecord,
  Institution,
  MainView,
  PortalNotification,
  UserAccount,
} from '../types/portal';
import { canUserAccessApplication, canUserAccessDocument } from '../lib/domain';

interface AppShellProps {
  currentUser: UserAccount;
  users: UserAccount[];
  institutions: Institution[];
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
  notifications: PortalNotification[];
  activeView: MainView;
  onNavigate: (view: MainView) => void;
  onOpenApplication: (appId: string) => void;
  onOpenDocument: (docId: string) => void;
  onMarkNotificationRead: (notifId: string) => void;
  onMarkAllNotificationsRead: () => void;
  onSwitchDemoUser: (user: UserAccount) => void;
  onLogout: () => void;
  onResetDemoData: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentUser,
  users,
  institutions,
  applications,
  documents,
  notifications,
  activeView,
  onNavigate,
  onOpenApplication,
  onOpenDocument,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onSwitchDemoUser,
  onLogout,
  onResetDemoData,
  darkMode,
  onToggleDarkMode,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'applications' | 'documents' | 'institutions'>('all');
  const [notifOpen, setNotifOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const initials = useMemo(() => {
    const parts = currentUser.fullName
      .replace(/\b(Dr|Prof|Mr|Ms|Mrs)\b\.?/gi, '')
      .trim()
      .split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return currentUser.fullName.slice(0, 2).toUpperCase();
  }, [currentUser.fullName]);

  const roleLabel = useMemo(() => {
    switch (currentUser.role) {
      case 'admin':
        return 'AICTE Regional Admin';
      case 'institutional_rep':
        return 'Institutional Representative';
      case 'faculty':
        return 'Faculty / Staff';
      case 'student':
        return 'Student';
    }
  }, [currentUser.role]);

  // Authorized notifications for current user
  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (n.recipientUserId && n.recipientUserId !== currentUser.id) return false;
      if (n.recipientRole !== 'all' && n.recipientRole !== currentUser.role) return false;
      if (n.institutionId && currentUser.role !== 'admin' && n.institutionId !== currentUser.institutionId) {
        return false;
      }
      return true;
    });
  }, [notifications, currentUser]);

  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  // Navigation items filtered by role
  const navItems = useMemo(() => {
    const items: Array<{ id: MainView; label: string; icon: React.ReactNode; roles: UserAccount['role'][] }> = [
      {
        id: 'dashboard',
        label:
          currentUser.role === 'admin'
            ? 'Admin Overview'
            : currentUser.role === 'institutional_rep'
              ? 'Institution Overview'
              : currentUser.role === 'faculty'
                ? 'Faculty Dossier'
                : 'Student Portal',
        icon: <LayoutDashboard className="w-4 h-4" />,
        roles: ['admin', 'institutional_rep', 'faculty', 'student'],
      },
      {
        id: 'applications',
        label: 'Applications',
        icon: <FileSpreadsheet className="w-4 h-4" />,
        roles: ['admin', 'institutional_rep', 'faculty'],
      },
      {
        id: 'documents',
        label: 'Document Repository',
        icon: <FolderKanban className="w-4 h-4" />,
        roles: ['admin', 'institutional_rep', 'faculty', 'student'],
      },
      {
        id: 'verification',
        label: 'Verification & Compliance',
        icon: <ShieldCheck className="w-4 h-4" />,
        roles: ['admin', 'institutional_rep', 'faculty'],
      },
      {
        id: 'expiry',
        label: 'Expiry Calendar',
        icon: <CalendarClock className="w-4 h-4" />,
        roles: ['admin', 'institutional_rep', 'faculty'],
      },
      {
        id: 'reports',
        label: 'Reports & Activity',
        icon: <BarChart3 className="w-4 h-4" />,
        roles: ['admin', 'institutional_rep'],
      },
      {
        id: 'accounts',
        label: 'Account Management',
        icon: <Users className="w-4 h-4" />,
        roles: ['admin'],
      },
      {
        id: 'profile',
        label: 'User Profile',
        icon: <UserCircle className="w-4 h-4" />,
        roles: ['admin', 'institutional_rep', 'faculty', 'student'],
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <Settings className="w-4 h-4" />,
        roles: ['admin', 'institutional_rep', 'faculty', 'student'],
      },
    ];
    return items.filter((item) => item.roles.includes(currentUser.role));
  }, [currentUser.role]);

  // Global search results respecting authorization
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { apps: [], docs: [], insts: [] };

    const authApps = applications.filter((a) => canUserAccessApplication(currentUser, a));
    const authDocs = documents.filter((d) => canUserAccessDocument(currentUser, d));
    const authInsts =
      currentUser.role === 'admin'
        ? institutions
        : institutions.filter((i) => i.id === currentUser.institutionId);

    const matchedApps =
      searchFilter === 'all' || searchFilter === 'applications'
        ? authApps.filter(
            (a) =>
              a.id.toLowerCase().includes(q) ||
              a.institutionName.toLowerCase().includes(q) ||
              a.officialInstitutionCode.toLowerCase().includes(q) ||
              a.category.toLowerCase().includes(q) ||
              a.status.toLowerCase().includes(q)
          )
        : [];

    const matchedDocs =
      searchFilter === 'all' || searchFilter === 'documents'
        ? authDocs.filter(
            (d) =>
              d.name.toLowerCase().includes(q) ||
              d.internalCode.toLowerCase().includes(q) ||
              d.certificateNumber.toLowerCase().includes(q) ||
              d.personName.toLowerCase().includes(q) ||
              d.institutionName.toLowerCase().includes(q) ||
              d.category.toLowerCase().includes(q)
          )
        : [];

    const matchedInsts =
      searchFilter === 'all' || searchFilter === 'institutions'
        ? authInsts.filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              i.code.toLowerCase().includes(q) ||
              i.aictePermanentId.toLowerCase().includes(q) ||
              i.city.toLowerCase().includes(q) ||
              i.representativeName.toLowerCase().includes(q)
          )
        : [];

    return {
      apps: matchedApps.slice(0, 6),
      docs: matchedDocs.slice(0, 8),
      insts: matchedInsts.slice(0, 4),
    };
  }, [searchQuery, searchFilter, applications, documents, institutions, currentUser]);

  const demoAccounts = users.filter((u) => u.isDemoAccount);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <div className="h-14 px-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="w-7 h-7 rounded-md bg-blue-700 flex items-center justify-center text-white font-display font-bold text-xs shrink-0">
            AV
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
              AICTE Validation
            </div>
          </div>
        </div>

        {/* Role & Institution Identity Block */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
            {roleLabel}
          </div>
          <div className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
            {currentUser.institutionName || 'AICTE Compliance Bureau'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular mt-0.5">
            {currentUser.officialInstitutionCode || currentUser.permissionLevel || currentUser.rollNumber}
          </div>
        </div>

        {/* Primary Navigation */}
        <nav aria-label="Main Navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Demo Controls */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="px-2.5 py-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-300">
            <div className="font-semibold">Simulated Verification Mode</div>
            <p className="text-amber-800/90 dark:text-amber-400/90 mt-0.5 leading-snug">
              All automated checks are simulated for demonstration.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetDemoData}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo State</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-xs bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 z-10">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <span className="font-display font-bold text-sm text-slate-900 dark:text-white">
                AICTE Validation Portal
              </span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium ${
                    activeView === item.id
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Right Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact Top Bar */}
        <header className="h-14 px-3 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
          {/* Left: Mobile Trigger + Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              <span className="hidden sm:inline font-medium text-slate-700 dark:text-slate-300">
                {roleLabel}
              </span>
              <span className="hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 dark:text-white capitalize truncate">
                {navItems.find((n) => n.id === activeView)?.label || activeView}
              </span>
            </div>
          </div>

          {/* Center/Right: Global Search, Persona Switcher, Notifications, Theme, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Global Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search applications, documents, and institutions"
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="hidden md:inline">Search records, codes, IDs...</span>
              <span className="hidden sm:inline md:hidden">Search</span>
            </button>

            {/* Demo Persona Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPersonaOpen((prev) => !prev);
                  setNotifOpen(false);
                  setProfileMenuOpen(false);
                }}
                className="px-2 sm:px-2.5 py-1.5 rounded-lg border border-amber-300/80 dark:border-amber-700/70 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 text-xs font-medium hover:bg-amber-100/80 dark:hover:bg-amber-900/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="hidden sm:inline">Switch </span>Demo Role
              </button>

              {personaOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Hackathon Demo Personas
                    </span>
                    <button
                      type="button"
                      aria-label="Close persona menu"
                      onClick={() => setPersonaOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {demoAccounts.map((acc) => {
                      const active = acc.id === currentUser.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            onSwitchDemoUser(acc);
                            setPersonaOpen(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                            active
                              ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {acc.fullName}
                            </span>
                            <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                              {acc.role === 'admin'
                                ? 'Admin'
                                : acc.role === 'institutional_rep'
                                  ? 'Inst. Rep'
                                  : acc.role === 'faculty'
                                    ? 'Faculty'
                                    : 'Student'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {acc.institutionName || acc.designation}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Button */}
            <div className="relative">
              <button
                type="button"
                aria-label={`Notifications (${unreadCount} unread)`}
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setPersonaOpen(false);
                  setProfileMenuOpen(false);
                }}
                className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-mono-tabular font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 z-50">
                  <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        In-App Notifications
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Prototype alerts (no external SMS/email sent)
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {visibleNotifications.length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center">
                        No notifications for your role.
                      </p>
                    ) : (
                      visibleNotifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            onMarkNotificationRead(n.id);
                            setNotifOpen(false);
                            if (n.targetRecordId?.startsWith('APP-')) {
                              onOpenApplication(n.targetRecordId);
                            } else if (n.targetRecordId?.startsWith('DOC-')) {
                              onOpenDocument(n.targetRecordId);
                            } else {
                              onNavigate(n.targetView);
                            }
                          }}
                          className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                            n.read
                              ? 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                              : 'border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold leading-snug">
                              {n.title}
                            </span>
                            <span className="text-[10px] font-mono-tabular text-slate-400 shrink-0">
                              {n.createdAt.split(' ')[0]}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {n.message}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Avatar & Profile Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotifOpen(false);
                  setPersonaOpen(false);
                }}
                aria-label="Open user profile menu"
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-blue-700 text-white text-[11px] font-display font-semibold flex items-center justify-center">
                    {initials}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-medium text-slate-800 dark:text-slate-200 max-w-28 truncate">
                  {currentUser.fullName}
                </span>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular truncate">
                      @{currentUser.username} · {currentUser.phone}
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onNavigate('profile');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <UserCircle className="w-4 h-4" />
                      <span>Profile &amp; Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onNavigate('settings');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Portal Settings</span>
                    </button>
                  </div>
                  <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Global authorized record search"
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 backdrop-blur-xs pt-16 p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Application ID (APP-2026-0104), Document Code (FAC-QUA-KAS-02), Certificate #, Person, or Institution..."
                className="flex-1 text-sm bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Close global search"
                onClick={() => setSearchOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {(['all', 'applications', 'documents', 'institutions'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSearchFilter(tab)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                      searchFilter === tab
                        ? 'bg-slate-900 text-white dark:bg-blue-600'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-500">
                Scoped to {currentUser.role === 'admin' ? 'All Authorized Records' : currentUser.institutionName}
              </span>
            </div>

            {/* Results Body */}
            <div className="p-4 max-h-96 overflow-y-auto space-y-5">
              {!searchQuery.trim() ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center space-y-2">
                  <p>Type to search across records you are authorized to access.</p>
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {['APP-2026-0104', 'FAC-QUA-KAS-02', 'INF-FAC-VIT-01', 'Kulkarni', 'SPPU'].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => setSearchQuery(sample)}
                        className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono-tabular text-[11px] hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {searchResults.apps.length === 0 &&
                    searchResults.docs.length === 0 &&
                    searchResults.insts.length === 0 && (
                      <p className="text-xs text-slate-500 py-8 text-center">
                        No matching authorized records found for "{searchQuery}".
                      </p>
                    )}

                  {searchResults.apps.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                        Applications ({searchResults.apps.length})
                      </h3>
                      <div className="space-y-1.5">
                        {searchResults.apps.map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              onOpenApplication(app.id);
                            }}
                            className="w-full text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div>
                              <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="font-mono-tabular text-blue-700 dark:text-blue-400">
                                  {app.id}
                                </span>
                                <span>·</span>
                                <span>{app.category}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {app.institutionName} · Status: {app.status}
                              </div>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.docs.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                        Documents ({searchResults.docs.length})
                      </h3>
                      <div className="space-y-1.5">
                        {searchResults.docs.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              onOpenDocument(doc.id);
                            }}
                            className="w-full text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                <span className="font-mono-tabular text-blue-700 dark:text-blue-400 mr-2">
                                  {doc.internalCode}
                                </span>
                                {doc.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono-tabular truncate">
                                Cert #{doc.certificateNumber} · {doc.personName} · {doc.institutionName}
                              </div>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.insts.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                        Institutions ({searchResults.insts.length})
                      </h3>
                      <div className="space-y-1.5">
                        {searchResults.insts.map((inst) => (
                          <button
                            key={inst.id}
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              onNavigate('applications');
                            }}
                            className="w-full text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div>
                              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                {inst.name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono-tabular">
                                {inst.code} · AICTE ID: {inst.aictePermanentId} · Nodal: {inst.representativeName}
                              </div>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
