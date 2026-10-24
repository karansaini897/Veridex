import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { EmptyStateCard, FileTypeMarker, StatusBadge } from './StatusPrimitives';

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
  onSwitchActiveAccount: (user: UserAccount) => void;
  onLogout: () => void;
  onResetRegistryData: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenPublicLanding?: () => void;
  children: React.ReactNode;
}

const SMOOTH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const AppShell: React.FC<AppShellProps> = ({
  currentUser,
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
  onLogout,
  darkMode,
  onToggleDarkMode,
  onOpenPublicLanding,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'applications' | 'documents' | 'institutions'>('all');
  const [notifOpen, setNotifOpen] = useState(false);
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
        return 'VERIDEX Regional Admin';
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

  return (
    <div className="min-h-screen flex liquid-canvas text-stone-900 dark:text-stone-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 liquid-glass-elevated border-y-0 border-l-0 sticky top-0 h-screen z-20">
        <div className="h-16 px-4 flex items-center gap-2.5 border-b border-[#C2410C]/35">
          <img
            src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_16.59.09_2f2ed194.jpeg"
            alt="VERIDEX Logo"
            className="h-9 w-auto rounded-lg object-contain bg-[#E7D8C0] border-2 border-[#C2410C]/45 shrink-0"
          />
          <div className="min-w-0">
            <div className="font-display font-bold text-sm text-stone-900 dark:text-white truncate leading-tight">
              VERIDEX
            </div>
            <div className="text-[10px] font-semibold text-[#046A38] dark:text-emerald-400 truncate leading-tight mt-0.5">
              हर दावे की जाँच, हर सच की पहचान
            </div>
          </div>
        </div>

        {/* Role & Institution Identity Block */}
        <div className="px-4 py-3.5 border-b border-[#C2410C]/30 liquid-glass-subtle">
          <div className="text-xs font-bold text-[#C2410C]">
            {roleLabel}
          </div>
          <div className="text-xs font-semibold text-stone-900 dark:text-white mt-0.5 truncate">
            {currentUser.institutionName || 'VERIDEX Compliance Bureau'}
          </div>
          <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono-tabular mt-0.5">
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
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-[#046A38] dark:text-emerald-300 font-bold'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-[#EFE6D5]/70 dark:text-stone-400 dark:hover:text-stone-100'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="veridex-active-nav"
                    transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.7 }}
                    className="absolute inset-0 rounded-xl bg-[#046A38]/10 border border-[#C2410C]/50 shadow-xs"
                  />
                )}
                <span className="relative z-10 text-[#046A38] dark:text-emerald-400">{item.icon}</span>
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Official Compliance Footer */}
        <div className="p-3 border-t border-[#C2410C]/30">
          <div className="px-3 py-2.5 rounded-xl liquid-glass-subtle text-[11px] text-stone-700 dark:text-stone-300">
            <div className="font-bold text-stone-900 dark:text-stone-100">
              VERIDEX Statutory Compliance
            </div>
            <p className="mt-0.5 leading-snug">
              Role-enforced access control &amp; audit logging active.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: SMOOTH_EASE }}
            className="fixed inset-0 z-50 lg:hidden flex"
          >
            <div
              className="fixed inset-0 bg-stone-950/65 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.26, ease: SMOOTH_EASE }}
              className="relative w-64 max-w-xs liquid-glass-elevated h-full flex flex-col z-10"
            >
              <div className="h-16 px-4 flex items-center justify-between border-b border-[#C2410C]/35">
                <div className="flex items-center gap-2">
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_16.59.09_2f2ed194.jpeg"
                    alt="VERIDEX Logo"
                    className="h-8 w-auto rounded-md object-contain bg-[#E7D8C0] border border-[#C2410C]/45 shrink-0"
                  />
                  <div>
                    <span className="font-display font-bold text-sm text-stone-900 dark:text-white block leading-tight">
                      VERIDEX
                    </span>
                    <span className="text-[10px] font-semibold text-[#046A38] dark:text-emerald-400 block leading-tight">
                      हर दावे की जाँच, हर सच की पहचान
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-stone-600 hover:text-stone-900 dark:text-stone-400"
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                      activeView === item.id
                        ? 'bg-[#046A38]/12 text-[#046A38] dark:text-emerald-300 font-bold border border-[#C2410C]/45'
                        : 'text-stone-700 dark:text-stone-400'
                    }`}
                  >
                    <span className="text-[#046A38] dark:text-emerald-400">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-1 w-full tricolour-bar sticky top-0 z-40" />
        {/* Compact Top Bar */}
        <header className="h-16 px-3 sm:px-6 liquid-glass-elevated border-x-0 border-t-0 flex items-center justify-between gap-2 sm:gap-4 sticky top-1 z-30">
          {/* Left: Mobile Trigger + VERIDEX Brand + Tagline + Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-xl liquid-glass-subtle text-stone-700 dark:text-stone-300 shrink-0 cursor-pointer"
            >
              <Menu className="w-4 h-4 text-[#046A38]" />
            </button>
            <div className="flex items-center gap-2.5 shrink-0">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_16.59.09_2f2ed194.jpeg"
                alt="VERIDEX Logo"
                className="h-8 w-auto rounded-md object-contain bg-[#E7D8C0] border border-[#C2410C]/45 shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-display font-bold text-xs sm:text-sm text-stone-900 dark:text-white tracking-tight leading-tight">
                  VERIDEX
                </span>
                <span className="text-[10px] font-semibold text-[#046A38] dark:text-emerald-400 leading-tight">
                  हर दावे की जाँच, हर सच की पहचान
                </span>
              </div>
            </div>
            <span className="text-[#C2410C]/40" aria-hidden="true">|</span>
            <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 truncate">
              <span className="hidden md:inline font-semibold text-[#C2410C]">
                {roleLabel}
              </span>
              <span className="hidden md:inline" aria-hidden="true">/</span>
              <span className="font-bold text-stone-900 dark:text-white capitalize truncate">
                {navItems.find((n) => n.id === activeView)?.label || activeView}
              </span>
            </div>
          </div>

          {/* Center/Right: Public Overview, Global Search, Notifications, Theme, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {onOpenPublicLanding && (
              <button
                type="button"
                onClick={onOpenPublicLanding}
                data-testid="open-public-overview"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl liquid-glass-subtle hover:border-[#C2410C] text-xs font-semibold text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <span>Public Overview</span>
              </button>
            )}
            {/* Global Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search applications, documents, and institutions"
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl liquid-glass-subtle hover:border-[#C2410C] text-xs text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#046A38] shrink-0" />
              <span className="hidden md:inline">Search records, codes, IDs...</span>
              <span className="hidden sm:inline md:hidden">Search</span>
            </button>

            {/* Notifications Button */}
            <div className="relative">
              <button
                type="button"
                aria-label={`Notifications (${unreadCount} unread)`}
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setProfileMenuOpen(false);
                }}
                className="relative p-2 rounded-xl liquid-glass-subtle hover:border-[#C2410C] text-stone-700 dark:text-stone-300 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-4 h-4 rounded-full bg-[#C2410C] text-white text-[10px] font-mono-tabular font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: SMOOTH_EASE }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 liquid-glass-elevated rounded-2xl p-3 z-50"
                  >
                    <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#C2410C]/30">
                      <div>
                        <span className="text-xs font-bold text-stone-900 dark:text-white">
                          Official Portal Notifications
                        </span>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400">
                          Regulatory &amp; dossier status alerts
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={onMarkAllNotificationsRead}
                          className="text-[11px] font-semibold text-[#C2410C] dark:text-orange-400 hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                      {visibleNotifications.length === 0 ? (
                        <EmptyStateCard
                          title="No Active Notifications"
                          description="You have no pending regulatory or dossier alerts for your current role."
                        />
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
                            className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                              n.read
                                ? 'border-transparent hover:bg-[#EFE6D5]/60 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
                                : 'border-[#C2410C]/45 bg-[#C2410C]/10 text-stone-900 dark:text-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-semibold leading-snug">
                                {n.title}
                              </span>
                              <span className="text-[10px] font-mono-tabular text-stone-500 shrink-0">
                                {n.createdAt.split(' ')[0]}
                              </span>
                            </div>
                            <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
                              {n.message}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-xl liquid-glass-subtle hover:border-[#C2410C] text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#046A38]" />}
            </button>

            {/* User Avatar & Profile Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotifOpen(false);
                }}
                aria-label="Open user profile menu"
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl liquid-glass-subtle hover:border-[#C2410C] cursor-pointer"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#046A38] to-[#03542C] text-white text-[11px] font-display font-bold flex items-center justify-center shadow-xs">
                    {initials}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-semibold text-stone-800 dark:text-stone-200 max-w-28 truncate">
                  {currentUser.fullName}
                </span>
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: SMOOTH_EASE }}
                    className="absolute right-0 mt-2 w-60 liquid-glass-elevated rounded-2xl p-2 z-50"
                  >
                    <div className="px-3 py-2 border-b border-[#C2410C]/30">
                      <div className="text-xs font-bold text-stone-900 dark:text-white truncate">
                        {currentUser.fullName}
                      </div>
                      <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono-tabular truncate">
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
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-stone-800 dark:text-stone-200 hover:bg-[#EFE6D5]/70 dark:hover:bg-stone-800/70 rounded-xl cursor-pointer"
                      >
                        <UserCircle className="w-4 h-4 text-[#046A38]" />
                        <span>Profile &amp; Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onNavigate('settings');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-stone-800 dark:text-stone-200 hover:bg-[#EFE6D5]/70 dark:hover:bg-stone-800/70 rounded-xl cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-[#046A38]" />
                        <span>VERIDEX Settings</span>
                      </button>
                    </div>
                    <div className="pt-1 border-t border-[#C2410C]/30">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Viewport with Smooth Unforced Motion Transition */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.24, ease: SMOOTH_EASE }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Global authorized record search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: SMOOTH_EASE }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-stone-950/65 backdrop-blur-md pt-16 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.22, ease: SMOOTH_EASE }}
              className="liquid-glass-elevated rounded-2xl max-w-2xl w-full overflow-hidden"
            >
              <div className="p-4 border-b border-[#C2410C]/30 flex items-center gap-3">
                <Search className="w-4 h-4 text-[#046A38] shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Application ID (APP-2026-0104), Document Code (FAC-QUA-KAS-02), Certificate #, Person, or Institution..."
                  className="flex-1 text-sm bg-transparent text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Close global search"
                  onClick={() => setSearchOpen(false)}
                  className="p-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category Filter Tabs */}
              <div className="px-4 py-2 liquid-glass-subtle border-x-0 border-t-0 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {(['all', 'applications', 'documents', 'institutions'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSearchFilter(tab)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                        searchFilter === tab
                          ? 'bg-[#C2410C] text-white shadow-xs'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-[#EFE6D5] dark:hover:bg-stone-800'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-stone-600 dark:text-stone-400">
                  Scoped to {currentUser.role === 'admin' ? 'All Authorized Records' : currentUser.institutionName}
                </span>
              </div>

              {/* Results Body */}
              <div className="p-4 max-h-96 overflow-y-auto space-y-5">
                {!searchQuery.trim() ? (
                  <div className="text-xs text-stone-600 dark:text-stone-400 py-6 text-center space-y-2">
                    <p>Type to search across records you are authorized to access.</p>
                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                      {['APP-2026-0104', 'FAC-QUA-KAS-02', 'INF-FAC-VES-01', 'Salunkhe', 'VESIT'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setSearchQuery(chip)}
                          className="px-2.5 py-1 rounded-lg liquid-glass-subtle text-stone-800 dark:text-stone-200 font-mono-tabular text-[11px] hover:border-[#C2410C] cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {searchResults.apps.length === 0 &&
                      searchResults.docs.length === 0 &&
                      searchResults.insts.length === 0 && (
                        <EmptyStateCard
                          title={`No matching records for "${searchQuery}"`}
                          description="Check the internal code, certificate reference number, or clear your search filter."
                          actionLabel="Clear Search"
                          onAction={() => setSearchQuery('')}
                        />
                      )}

                    {searchResults.apps.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-stone-600 dark:text-stone-400 mb-2">
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
                              className="w-full text-left p-2.5 rounded-xl liquid-glass-subtle hover:border-[#C2410C] flex items-center justify-between gap-3 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-stone-900 dark:text-white flex items-center gap-2 flex-wrap">
                                  <span className="font-mono-tabular font-bold text-[#C2410C] dark:text-orange-400">
                                    {app.id}
                                  </span>
                                  <span>·</span>
                                  <span>{app.category}</span>
                                </div>
                                <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 truncate">
                                  {app.institutionName}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={app.status} />
                                <ArrowUpRight className="w-4 h-4 text-stone-500 shrink-0" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.docs.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-stone-600 dark:text-stone-400 mb-2">
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
                              className="w-full text-left p-2.5 rounded-xl liquid-glass-subtle hover:border-[#C2410C] flex items-center justify-between gap-3 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-stone-900 dark:text-white flex items-center gap-2 flex-wrap">
                                  <FileTypeMarker mimeType={doc.mimeType} fileName={doc.fileName} compact />
                                  <span className="font-mono-tabular font-bold text-[#C2410C] dark:text-orange-400">
                                    {doc.internalCode}
                                  </span>
                                  <span className="truncate">{doc.name}</span>
                                </div>
                                <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 font-mono-tabular truncate">
                                  Cert #{doc.certificateNumber} · {doc.personName} · {doc.institutionName}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={doc.issuerVerificationStatus} />
                                <ArrowUpRight className="w-4 h-4 text-stone-500 shrink-0" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.insts.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-stone-600 dark:text-stone-400 mb-2">
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
                              className="w-full text-left p-2.5 rounded-xl liquid-glass-subtle hover:border-[#C2410C] flex items-center justify-between gap-3 cursor-pointer"
                            >
                              <div>
                                <div className="text-xs font-semibold text-stone-900 dark:text-white">
                                  {inst.name}
                                </div>
                                <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono-tabular">
                                  {inst.code} · AICTE ID: {inst.aictePermanentId} · Nodal: {inst.representativeName}
                                </div>
                              </div>
                              <ArrowUpRight className="w-4 h-4 text-stone-500 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

