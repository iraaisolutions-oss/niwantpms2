import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { PaperPlaneTilt, WhatsappLogo, CheckCircle, ClipboardText, Notepad } from '@phosphor-icons/react';

export default function ShiftHandoverPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleHandover = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/galla/shift-handover', {
        staff_name: user?.name,
        notes: notes
      });
      setResult(data);
    } catch (err) {
      console.error(err);
      alert(lang === 'mr' ? 'हँडओव्हर अयशस्वी' : 'Handover failed');
    } finally {
      setLoading(false);
    }
  };

  const generateDailySummary = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/galla/daily-summary');
      setResult({ summary: data, message: data.message, whatsapp_sent: true });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="handover-result-page">
        <div className="p-4 md:p-6">
          <div className="text-center mb-6">
            <CheckCircle size={64} weight="bold" className="text-[#22C55E] mx-auto mb-3" />
            <h1 className="font-heading text-2xl font-bold text-zinc-900">
              {lang === 'mr' ? 'शिफ्ट हँडओव्हर पूर्ण!' : 'Shift Handover Complete!'}
            </h1>
          </div>

          {/* Summary Card */}
          <div className="bg-zinc-900 rounded-2xl p-5 text-white mb-4" data-testid="handover-summary">
            <div className="flex items-center gap-2 mb-3">
              <WhatsappLogo size={20} weight="bold" className="text-[#25D366]" />
              <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-400">
                {lang === 'mr' ? 'मालकाला पाठवले (मॉक)' : 'Sent to Owner (Mocked)'}
              </span>
            </div>
            <pre className="text-sm whitespace-pre-wrap font-mono text-zinc-300 leading-relaxed">
              {result.message}
            </pre>
          </div>

          {result.summary && (
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-2">
              {result.summary.cash_collected !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">{t('cash_collected')}</span>
                    <span className="font-bold text-[#22C55E]">₹{result.summary.cash_collected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">{t('upi_collected')}</span>
                    <span className="font-bold text-blue-600">₹{result.summary.upi_collected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">{t('total_expenses')}</span>
                    <span className="font-bold text-[#EF4444]">₹{result.summary.total_expenses}</span>
                  </div>
                  <div className="border-t-2 border-zinc-100 pt-2 flex justify-between">
                    <span className="font-bold">{t('net_amount')}</span>
                    <span className="font-black text-xl">₹{result.summary.net_amount}</span>
                  </div>
                </>
              )}
              {result.summary.cash !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">{t('cash_collected')}</span>
                    <span className="font-bold text-[#22C55E]">₹{result.summary.cash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">UPI</span>
                    <span className="font-bold text-blue-600">₹{result.summary.upi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">{t('total_expenses')}</span>
                    <span className="font-bold text-[#EF4444]">₹{result.summary.expenses}</span>
                  </div>
                  <div className="border-t-2 border-zinc-100 pt-2 flex justify-between">
                    <span className="font-bold">{t('net_amount')}</span>
                    <span className="font-black text-xl">₹{result.summary.net}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="w-full h-14 rounded-xl border-2 border-zinc-200 font-bold text-base mt-4 active:scale-95 transition-transform"
            data-testid="handover-back-btn"
          >
            {lang === 'mr' ? 'मागे जा' : 'Go Back'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="shift-handover-page">
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardText size={24} weight="bold" className="text-zinc-500" />
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
            {lang === 'mr' ? 'शिफ्ट हँडओव्हर' : 'Shift Handover'}
          </h1>
        </div>
        <p className="text-zinc-500 text-sm mb-6">
          {lang === 'mr' 
            ? 'शिफ्ट सारांश तयार करा आणि मालकाला WhatsApp पाठवा' 
            : 'Generate shift summary & send to owner via WhatsApp'
          }
        </p>

        <div className="space-y-4">
          {/* Staff Info */}
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-lg">{user?.name?.[0] || 'S'}</span>
              </div>
              <div>
                <p className="font-bold">{user?.name || 'Staff'}</p>
                <p className="text-xs text-zinc-400">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
            <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-2 block">
              <Notepad size={14} weight="bold" className="inline mr-1" />
              {lang === 'mr' ? 'टिपणी (पर्यायी)' : 'Notes (Optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-base font-medium focus:border-zinc-900 focus:outline-none resize-none"
              placeholder={lang === 'mr' ? 'शिफ्ट दरम्यान काही विशेष...' : 'Anything special during shift...'}
              data-testid="handover-notes"
            />
          </div>

          {/* Handover Button */}
          <button
            onClick={handleHandover}
            disabled={loading}
            className="bg-zinc-900 text-white h-16 rounded-xl flex items-center justify-center gap-3 w-full active:scale-95 transition-transform text-lg font-bold uppercase tracking-[0.05em] disabled:opacity-50"
            data-testid="handover-submit-btn"
          >
            <PaperPlaneTilt size={24} weight="bold" />
            {loading ? t('loading') : (lang === 'mr' ? 'शिफ्ट हँडओव्हर करा' : 'Complete Shift Handover')}
          </button>

          {/* Daily Summary Button */}
          <button
            onClick={generateDailySummary}
            disabled={loading}
            className="bg-[#25D366] text-white h-16 rounded-xl flex items-center justify-center gap-3 w-full active:scale-95 transition-transform text-lg font-bold uppercase tracking-[0.05em] disabled:opacity-50"
            data-testid="daily-summary-btn"
          >
            <WhatsappLogo size={24} weight="bold" />
            {loading ? t('loading') : (lang === 'mr' ? 'दैनिक सारांश पाठवा' : 'Send Daily Summary')}
          </button>
        </div>
      </div>
    </div>
  );
}
