import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../lib/api';
import { 
  Eye, CurrencyInr, ArrowClockwise, Bed, Users as UsersIcon, 
  CreditCard, Wallet, TrendUp, Clock, CaretRight 
} from '@phosphor-icons/react';

export default function RemoteCashboxPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: res } = await api.get('/galla/remote');
      setData(res);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
        <p className="text-xl font-bold text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  const galla = data?.live_galla || {};
  const hotel = data?.hotel_status || {};

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="remote-cashbox-page">
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Eye size={24} weight="bold" className="text-zinc-500" />
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
              {lang === 'mr' ? 'रिमोट कॅशबॉक्स' : 'Remote Cashbox'}
            </h1>
          </div>
          <button
            onClick={fetchData}
            className="w-10 h-10 rounded-xl border-2 border-zinc-200 flex items-center justify-center active:scale-95 transition-transform bg-white"
            data-testid="refresh-cashbox-btn"
          >
            <ArrowClockwise size={20} weight="bold" />
          </button>
        </div>
        <p className="text-zinc-400 text-xs mb-4">
          {lang === 'mr' ? 'शेवटचे अपडेट' : 'Last updated'}: {lastUpdated?.toLocaleTimeString('en-IN') || '-'}
          {' · '}{lang === 'mr' ? 'दर 15 सेकंदांनी ऑटो-रिफ्रेश' : 'Auto-refresh every 15s'}
        </p>
      </div>

      <div className="px-4 space-y-4">
        {/* LIVE GALLA - Main Card */}
        <div className="bg-zinc-900 rounded-2xl p-5 text-white" data-testid="live-galla-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-[#22C55E] rounded-full animate-pulse" />
            <span className="text-xs uppercase tracking-[0.15em] font-bold text-zinc-400">
              {lang === 'mr' ? 'लाइव्ह गल्ला' : 'LIVE GALLA'}
            </span>
          </div>

          <div className="text-5xl font-black mb-1 tracking-tight">
            ₹{galla.net_cash || 0}
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-6">
            {lang === 'mr' ? 'निव्वळ रक्कम (खर्च वजा)' : 'Net Amount (after expenses)'}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <Wallet size={18} className="text-[#22C55E] mb-1" />
              <div className="text-lg font-black">₹{galla.cash_in_register || 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">{t('cash')}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <CreditCard size={18} className="text-blue-400 mb-1" />
              <div className="text-lg font-black">₹{galla.upi_collected || 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">UPI</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <TrendUp size={18} className="text-red-400 mb-1" />
              <div className="text-lg font-black">₹{galla.total_expenses || 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">{t('expenses')}</div>
            </div>
          </div>
        </div>

        {/* Hotel Status */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="hotel-status-card">
          <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3 block">
            {lang === 'mr' ? 'हॉटेल स्थिती' : 'Hotel Status'}
          </span>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-4xl font-black text-zinc-900">
              {hotel.occupancy_pct || 0}%
            </div>
            <div className="flex-1">
              <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden flex">
                <div className="bg-[#EF4444] h-full" style={{ width: `${((hotel.occupied || 0) / (hotel.total_rooms || 1)) * 100}%` }} />
                <div className="bg-[#F59E0B] h-full" style={{ width: `${((hotel.cleaning || 0) / (hotel.total_rooms || 1)) * 100}%` }} />
                <div className="bg-[#22C55E] h-full" style={{ width: `${((hotel.available || 0) / (hotel.total_rooms || 1)) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#FEE2E2] rounded-lg p-2">
              <div className="text-lg font-black text-[#7F1D1D]">{hotel.occupied || 0}</div>
              <div className="text-[10px] font-bold text-[#7F1D1D]/70 uppercase">{t('occupied')}</div>
            </div>
            <div className="bg-[#FEF3C7] rounded-lg p-2">
              <div className="text-lg font-black text-[#78350F]">{hotel.cleaning || 0}</div>
              <div className="text-[10px] font-bold text-[#78350F]/70 uppercase">{t('cleaning')}</div>
            </div>
            <div className="bg-[#DCFCE7] rounded-lg p-2">
              <div className="text-lg font-black text-[#14532D]">{hotel.available || 0}</div>
              <div className="text-[10px] font-bold text-[#14532D]/70 uppercase">{t('available')}</div>
            </div>
          </div>
        </div>

        {/* Active Bookings */}
        {data?.active_bookings?.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="active-bookings-card">
            <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3 block">
              {lang === 'mr' ? 'सध्याचे पाहुणे' : 'Current Guests'} ({data.active_bookings.length})
            </span>
            <div className="space-y-2">
              {data.active_bookings.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FEE2E2] rounded-lg flex items-center justify-center">
                      <Bed size={18} weight="bold" className="text-[#DC2626]" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{b.guest_name}</p>
                      <p className="text-xs text-zinc-400">{t('room_number')} {b.room_number} · ₹{b.rate}/{lang === 'mr' ? 'दिवस' : 'day'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">{t('advance_paid')}</p>
                    <p className="font-bold text-[#22C55E]">₹{b.advance}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {data?.recent_transactions?.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="recent-txns-card">
            <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3 block">
              {lang === 'mr' ? 'अलीकडील व्यवहार' : 'Recent Transactions'}
            </span>
            <div className="space-y-2">
              {data.recent_transactions.slice(0, 8).map((txn, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="font-medium text-sm">{txn.description || txn.category}</p>
                    <p className="text-[10px] text-zinc-400">
                      {new Date(txn.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      txn.type === 'cash' ? 'bg-[#DCFCE7] text-[#14532D]' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {txn.type?.toUpperCase()}
                    </span>
                    <span className="font-bold text-sm text-[#22C55E]">+₹{txn.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shift Handovers */}
        {data?.shift_handovers?.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="shift-handovers-card">
            <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3 block">
              {lang === 'mr' ? 'शिफ्ट हँडओव्हर' : 'Shift Handovers'}
            </span>
            <div className="space-y-3">
              {data.shift_handovers.map((sh, i) => (
                <div key={i} className="bg-zinc-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{sh.staff_name || sh.handed_over_by}</span>
                    <span className="text-xs text-zinc-400">
                      {new Date(sh.timestamp).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-[#22C55E] font-bold">₹{sh.net_amount} net</span>
                    <span className="text-zinc-400">{sh.transaction_count} txns</span>
                    <span className="text-zinc-400">{sh.rooms_occupied}/{sh.rooms_total} rooms</span>
                  </div>
                  {sh.notes && <p className="text-xs text-zinc-500 mt-1">{sh.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
