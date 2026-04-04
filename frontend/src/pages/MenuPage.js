import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  SquaresFour, Wallet, ChartLineUp, FileText, WhatsappLogo, 
  Translate, SignOut, X, UserCircle, Eye, ClipboardText, Bell,
  Buildings, Plugs
} from '@phosphor-icons/react';

export default function MenuPage() {
  const navigate = useNavigate();
  const { t, lang, toggleLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const isOwner = user?.role === 'owner';

  const menuItems = [
    { icon: SquaresFour, label: t('dashboard'), path: '/', show: true },
    { icon: Wallet, label: t('galla'), path: '/galla', show: true },
    { icon: ClipboardText, label: lang === 'mr' ? 'शिफ्ट हँडओव्हर' : 'Shift Handover', path: '/shift-handover', show: true },
    { icon: Bell, label: lang === 'mr' ? 'पाहुणे विनंत्या' : 'Guest Requests', path: '/requests', show: true },
    { icon: Buildings, label: lang === 'mr' ? 'रूम व्यवस्थापन' : 'Room Management', path: '/room-management', show: isOwner },
    { icon: Plugs, label: lang === 'mr' ? 'चॅनेल मॅनेजर' : 'Channel Manager', path: '/channel-manager', show: isOwner },
    { icon: Eye, label: lang === 'mr' ? 'रिमोट कॅशबॉक्स' : 'Remote Cashbox', path: '/remote-cashbox', show: isOwner },
    { icon: ChartLineUp, label: t('analytics'), path: '/analytics', show: isOwner },
    { icon: FileText, label: t('form_c'), path: '/formc', show: true },
    { icon: WhatsappLogo, label: t('whatsapp'), path: '/whatsapp', show: true },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="menu-page">
      <div className="p-4 md:p-6">
        {/* User Info */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-6 mb-4" data-testid="user-info-card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center">
              <UserCircle size={36} weight="bold" className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.name || 'User'}</h2>
              <p className="text-zinc-500 text-sm">{user?.email}</p>
              <span className={`inline-block mt-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                isOwner ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-600'
              }`}>
                {t(user?.role || 'staff')}
              </span>
            </div>
          </div>
        </div>

        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="w-full bg-white rounded-2xl border-2 border-zinc-200 p-4 flex items-center justify-between mb-4 active:scale-[0.98] transition-transform"
          data-testid="language-toggle-menu"
        >
          <div className="flex items-center gap-3">
            <Translate size={24} weight="bold" className="text-zinc-500" />
            <span className="font-bold">{lang === 'mr' ? 'भाषा बदला' : 'Change Language'}</span>
          </div>
          <span className="bg-zinc-900 text-white px-4 py-2 rounded-xl font-bold text-sm">
            {lang === 'mr' ? 'English' : 'मराठी'}
          </span>
        </button>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 overflow-hidden mb-4">
          {menuItems.filter(i => i.show).map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full h-16 px-4 flex items-center gap-3 active:bg-zinc-50 transition-colors ${
                  idx > 0 ? 'border-t border-zinc-100' : ''
                }`}
                data-testid={`menu-item-${item.path.replace('/', '') || 'home'}`}
              >
                <Icon size={24} weight="bold" className="text-zinc-500" />
                <span className="font-bold text-base">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 border-2 border-red-200 text-[#DC2626] h-16 rounded-xl flex items-center justify-center gap-3 font-bold text-lg active:scale-95 transition-transform"
          data-testid="logout-btn"
        >
          <SignOut size={24} weight="bold" />
          {t('logout')}
        </button>
      </div>
    </div>
  );
}
