import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { SquaresFour, Wallet, ChartLineUp, UserCircle } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();

  const isOwner = user?.role === 'owner';

  const tabs = [
    { path: '/', icon: SquaresFour, label: t('dashboard') },
    { path: '/galla', icon: Wallet, label: t('galla') },
    ...(isOwner ? [{ path: '/analytics', icon: ChartLineUp, label: t('analytics') }] : []),
    { path: '/menu', icon: UserCircle, label: t('profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t-2 border-zinc-200 h-20 flex items-center justify-around px-2 safe-bottom" data-testid="bottom-nav">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center gap-1 h-16 w-full rounded-xl transition-all active:scale-95 ${
              isActive ? 'text-zinc-900' : 'text-zinc-400'
            }`}
            data-testid={`nav-${tab.path.replace('/', '') || 'home'}`}
          >
            <Icon size={28} weight={isActive ? 'bold' : 'regular'} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
