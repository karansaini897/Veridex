import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  ChevronDown,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  Building2,
  Crown,
  Check,
} from 'lucide-react';
import { UserAccount } from '../types/portal';

interface DemoUserSwitcherProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  onSwitchUser: (user: UserAccount) => void;
  compact?: boolean;
}

export const DemoUserSwitcher: React.FC<DemoUserSwitcherProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);

  // Grouped demo accounts for clean presentation
  const demoAccounts = [
    {
      roleTitle: 'Regional Admin',
      icon: <Crown className="w-3.5 h-3.5 text-amber-600" />,
      user: allUsers.find((u) => u.username === 'karan.saini') || allUsers.find((u) => u.role === 'admin'),
    },
    {
      roleTitle: 'Institution Manager (VESIT)',
      icon: <Building2 className="w-3.5 h-3.5 text-[#046A38]" />,
      user: allUsers.find((u) => u.username === 'aashay.khadkikar') || allUsers.find((u) => u.role === 'institutional_rep'),
    },
    {
      roleTitle: 'Institution Manager (D.J. Sanghvi)',
      icon: <Building2 className="w-3.5 h-3.5 text-blue-600" />,
      user: allUsers.find((u) => u.username === 'gauri.sardal'),
    },
    {
      roleTitle: 'Faculty / Class Teacher (CMPN)',
      icon: <Briefcase className="w-3.5 h-3.5 text-[#C2410C]" />,
      user: allUsers.find((u) => u.username === 'shravani.salunkhe') || allUsers.find((u) => u.role === 'faculty'),
    },
    {
      roleTitle: 'Faculty / Racing Club Advisor',
      icon: <Briefcase className="w-3.5 h-3.5 text-[#C2410C]" />,
      user: allUsers.find((u) => u.username === 'rajesh.nayak'),
    },
    {
      roleTitle: 'Student (Diksha Rajwani)',
      icon: <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />,
      user: allUsers.find((u) => u.username === 'diksha.rajwani'),
    },
    {
      roleTitle: 'Student (Shreya Kaulgud)',
      icon: <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />,
      user: allUsers.find((u) => u.username === 'shreya.kaulgud') || allUsers.find((u) => u.role === 'student'),
    },
  ].filter((item) => Boolean(item.user)) as Array<{
    roleTitle: string;
    icon: React.ReactNode;
    user: UserAccount;
  }>;

  const currentRoleIcon = () => {
    switch (currentUser.role) {
      case 'admin':
        return <Crown className="w-3.5 h-3.5 text-amber-600" />;
      case 'institutional_rep':
        return <Building2 className="w-3.5 h-3.5 text-[#046A38]" />;
      case 'faculty':
        return <Briefcase className="w-3.5 h-3.5 text-[#C2410C]" />;
      case 'student':
        return <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <Users className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#C2410C]/45 bg-[#FCF9F2] dark:bg-stone-900 text-xs font-semibold text-stone-900 dark:text-white hover:border-[#C2410C] hover:bg-[#EFE6D5] dark:hover:bg-stone-800 transition-colors cursor-pointer shadow-xs"
        aria-label="Switch Demo Role & User"
        title="Quick Role & Demo User Switcher"
      >
        <span className="shrink-0">{currentRoleIcon()}</span>
        <span className="hidden sm:inline font-mono-tabular text-[11px] text-stone-500 uppercase">
          Demo:
        </span>
        <span className="max-w-28 sm:max-w-36 truncate font-display">
          {currentUser.fullName.split(' ')[0]} ({currentUser.role === 'institutional_rep' ? 'Manager' : currentUser.role})
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 liquid-glass-floating rounded-2xl p-2.5 z-50 shadow-2xl border-2 border-[#C2410C]/40"
          >
            <div className="p-2 border-b border-[#C2410C]/25 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  Frontend Demo Role Switcher
                </span>
                <span className="text-[10px] text-stone-500 block">
                  Simulated personas for workflow testing
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded-md bg-[#046A38]/10 text-[#046A38] dark:text-emerald-300 text-[10px] font-bold font-mono-tabular">
                Demo Mode
              </span>
            </div>

            <div className="py-1 space-y-1 max-h-80 overflow-y-auto">
              {demoAccounts.map(({ roleTitle, icon, user }) => {
                const isSelected = user.id === currentUser.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onSwitchUser(user);
                    }}
                    className={`w-full text-left p-2 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#046A38]/15 border border-[#046A38]/40 text-stone-900 dark:text-white font-bold'
                        : 'hover:bg-[#EFE6D5] dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{icon}</span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-stone-900 dark:text-white">
                          {user.fullName}
                        </div>
                        <div className="text-[10px] text-stone-500 font-mono-tabular truncate">
                          {roleTitle}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#046A38] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-2 pt-2 border-t border-[#C2410C]/20 text-[10px] text-stone-500 italic">
              Demonstration only — role switching runs client-side with mock data.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
