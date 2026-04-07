import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { SignIn, Buildings } from '@phosphor-icons/react';

export default function LoginPage() {
  const { login } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role) => {
    setError('');
    setLoading(true);
    try {
      const creds = role === 'owner' 
        ? { email: 'admin@hotel.com', password: 'admin123' }
        : { email: 'staff@hotel.com', password: 'staff123' };
      await login(creds.email, creds.password);
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col items-center justify-center p-4" data-testid="login-page">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 rounded-xl bg-white border-2 border-zinc-200 font-bold text-sm tracking-wide active:scale-95 transition-transform"
          data-testid="language-toggle-login"
        >
          {lang === 'mr' ? 'EN' : 'मराठी'}
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/nivant-logo.png" alt="Nivant Lodge" className="h-24 w-auto mx-auto mb-4" />
          <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tight text-zinc-900">
            {t('digital_register')}
          </h1>
          <p className="text-zinc-500 mt-2 font-body text-base md:text-lg">
            {t('hotel_management')}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 border-2 border-zinc-200 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-2 block">
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none transition-colors"
                placeholder="email@hotel.com"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-2 block">
                {t('password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none transition-colors"
                placeholder="********"
                data-testid="login-password-input"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-xl p-3 text-sm font-medium" data-testid="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-zinc-900 text-white h-16 rounded-xl flex items-center justify-center gap-3 w-full active:scale-95 transition-transform text-lg font-bold uppercase tracking-[0.05em] disabled:opacity-50"
              data-testid="login-submit-btn"
            >
              <SignIn size={24} weight="bold" />
              {loading ? t('loading') : t('login')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-zinc-100">
            <p className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-400 text-center mb-4">
              {lang === 'mr' ? 'त्वरित प्रवेश' : 'Quick Access'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => quickLogin('owner')}
                disabled={loading}
                className="h-14 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 font-bold text-base active:scale-95 transition-transform disabled:opacity-50"
                data-testid="quick-login-owner"
              >
                {t('owner')}
              </button>
              <button
                onClick={() => quickLogin('staff')}
                disabled={loading}
                className="h-14 rounded-xl border-2 border-zinc-200 bg-zinc-50 text-zinc-700 font-bold text-base active:scale-95 transition-transform disabled:opacity-50"
                data-testid="quick-login-staff"
              >
                {t('staff')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
