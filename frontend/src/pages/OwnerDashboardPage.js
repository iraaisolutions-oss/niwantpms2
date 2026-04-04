import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../lib/api';
import { ChartBar, CurrencyInr, Users, Warning, TrendUp } from '@phosphor-icons/react';

export default function OwnerDashboardPage() {
  const { t, lang } = useLanguage();
  const [occupancy, setOccupancy] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [leakage, setLeakage] = useState(null);
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [occ, rev, leak, stf] = await Promise.all([
        api.get('/analytics/occupancy'),
        api.get('/analytics/revenue'),
        api.get('/analytics/leakage'),
        api.get('/analytics/staff')
      ]);
      setOccupancy(occ.data);
      setRevenue(rev.data);
      setLeakage(leak.data);
      setStaff(stf.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
        <p className="text-xl font-bold text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="owner-dashboard-page">
      <div className="p-4 md:p-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-1">
          {t('owner_dashboard')}
        </h1>
        <p className="text-zinc-500 text-sm">
          {lang === 'mr' ? 'रिअल-टाइम हॉटेल विश्लेषण' : 'Real-time hotel analytics'}
        </p>
      </div>

      <div className="px-4 space-y-4">
        {/* Occupancy Overview */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="occupancy-card">
          <div className="flex items-center gap-2 mb-4">
            <ChartBar size={20} weight="bold" className="text-zinc-500" />
            <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500">
              {t('occupancy_rate')}
            </span>
          </div>
          
          {/* Occupancy Bar */}
          <div className="mb-4">
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-black text-zinc-900">{occupancy?.occupancy_rate || 0}%</span>
            </div>
            <div className="w-full h-4 bg-zinc-100 rounded-full overflow-hidden flex">
              <div 
                className="bg-[#EF4444] h-full transition-all" 
                style={{ width: `${((occupancy?.occupied || 0) / (occupancy?.total_rooms || 1)) * 100}%` }}
              />
              <div 
                className="bg-[#F59E0B] h-full transition-all" 
                style={{ width: `${((occupancy?.cleaning || 0) / (occupancy?.total_rooms || 1)) * 100}%` }}
              />
              <div 
                className="bg-[#22C55E] h-full transition-all" 
                style={{ width: `${((occupancy?.available || 0) / (occupancy?.total_rooms || 1)) * 100}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs font-bold">
              <span className="text-[#EF4444]">{occupancy?.occupied} {t('occupied')}</span>
              <span className="text-[#F59E0B]">{occupancy?.cleaning} {t('cleaning')}</span>
              <span className="text-[#22C55E]">{occupancy?.available} {t('available')}</span>
            </div>
          </div>

          {/* Occupancy Heatmap */}
          {occupancy?.daily_bookings && Object.keys(occupancy.daily_bookings).length > 0 && (
            <div>
              <span className="text-xs font-bold text-zinc-400 mb-2 block">
                {lang === 'mr' ? '30-दिवस बुकिंग' : '30-Day Bookings'}
              </span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(occupancy.daily_bookings).map(([day, count]) => (
                  <div
                    key={day}
                    className={`w-6 h-6 rounded text-[8px] flex items-center justify-center font-bold ${
                      count >= 5 ? 'bg-[#EF4444] text-white' :
                      count >= 3 ? 'bg-[#F59E0B] text-[#78350F]' :
                      count >= 1 ? 'bg-[#DCFCE7] text-[#14532D]' :
                      'bg-zinc-100 text-zinc-400'
                    }`}
                    title={`${day}: ${count} bookings`}
                  >
                    {count}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-2 gap-3" data-testid="revenue-cards">
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
            <div className="flex items-center gap-1 mb-2">
              <CurrencyInr size={16} weight="bold" className="text-zinc-400" />
              <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500">
                {t('today_revenue')}
              </span>
            </div>
            <div className="text-2xl font-black text-[#22C55E]">₹{revenue?.today_revenue || 0}</div>
            <div className="text-xs text-zinc-400 mt-1">
              {lang === 'mr' ? 'खर्च' : 'Expenses'}: ₹{revenue?.today_expenses || 0}
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
            <div className="flex items-center gap-1 mb-2">
              <TrendUp size={16} weight="bold" className="text-zinc-400" />
              <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500">
                {t('month_revenue')}
              </span>
            </div>
            <div className="text-2xl font-black text-zinc-900">₹{revenue?.month_revenue || 0}</div>
            <div className="text-xs text-zinc-400 mt-1">
              {lang === 'mr' ? 'निव्वळ' : 'Net'}: ₹{revenue?.month_net || 0}
            </div>
          </div>
        </div>

        {/* Revenue Leakage Alerts */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="leakage-card">
          <div className="flex items-center gap-2 mb-3">
            <Warning size={20} weight="bold" className="text-amber-500" />
            <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500">
              {t('revenue_leakage')}
            </span>
          </div>
          {leakage?.alerts?.length > 0 ? (
            <div className="space-y-2">
              {leakage.alerts.map((alert, i) => (
                <div key={i} className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                  <p className="font-bold text-[#DC2626] text-sm">
                    {t('room_number')} {alert.room_number}
                  </p>
                  <p className="text-xs text-red-600">
                    {alert.alert} — {alert.hours_in_status} {lang === 'mr' ? 'तास' : 'hours'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#22C55E] font-bold">
              {lang === 'mr' ? 'कोणतीही गळती आढळली नाही' : 'No leakage detected'}
            </p>
          )}

          {/* Audit Logs */}
          {leakage?.recent_audit_logs?.length > 0 && (
            <div className="mt-4">
              <span className="text-xs font-bold text-zinc-400 mb-2 block">
                {lang === 'mr' ? 'ऑडिट लॉग' : 'Audit Logs'}
              </span>
              <div className="space-y-1">
                {leakage.recent_audit_logs.slice(0, 5).map((log, i) => (
                  <div key={i} className="text-xs text-zinc-500 py-1 border-b border-zinc-50">
                    <span className="font-bold">{log.changed_by}</span> changed Room {log.room_number} rate: ₹{log.old_rate} → ₹{log.new_rate}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Staff Performance */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="staff-performance-card">
          <div className="flex items-center gap-2 mb-3">
            <Users size={20} weight="bold" className="text-zinc-500" />
            <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500">
              {t('staff_performance')}
            </span>
          </div>
          {staff?.staff_stats?.length > 0 ? (
            <div className="space-y-2">
              {staff.staff_stats.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <span className="font-bold text-sm">{s.name}</span>
                  <span className="text-sm text-zinc-500">
                    {s.check_ins} {lang === 'mr' ? 'चेक-इन' : 'check-ins'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">{t('no_data')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
