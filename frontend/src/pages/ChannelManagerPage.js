import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, ArrowsClockwise, Plus, ToggleRight, ToggleLeft, CurrencyInr, ChartBar, ListBullets, Gear, Lightning } from '@phosphor-icons/react';

const TABS = [
  { id: 'overview', icon: ChartBar },
  { id: 'channels', icon: Gear },
  { id: 'rates', icon: CurrencyInr },
  { id: 'bookings', icon: ListBullets },
  { id: 'sync', icon: ArrowsClockwise },
];

function TabButton({ tab, active, lang, onClick }) {
  const Icon = tab.icon;
  const labels = {
    overview: { mr: 'सारांश', en: 'Overview' },
    channels: { mr: 'चॅनेल्स', en: 'Channels' },
    rates: { mr: 'दर', en: 'Rates' },
    bookings: { mr: 'बुकिंग्ज', en: 'Bookings' },
    sync: { mr: 'सिंक', en: 'Sync' },
  };
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-bold transition-all ${
        active ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 border border-zinc-200'
      }`}
      data-testid={`channel-tab-${tab.id}`}
    >
      <Icon size={18} weight="bold" />
      {labels[tab.id][lang]}
    </button>
  );
}

export default function ChannelManagerPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [channels, setChannels] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [rates, setRates] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', channel_type: 'ota', commission_pct: 15 });
  const [filterChannel, setFilterChannel] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [chRes, anRes, rtRes, bkRes, rmRes] = await Promise.all([
        api.get('/channels'),
        api.get('/channels/analytics'),
        api.get('/channels/rates'),
        api.get('/channels/bookings'),
        api.get('/rooms'),
      ]);
      setChannels(chRes.data);
      setAnalytics(anRes.data);
      setRates(rtRes.data);
      setBookings(bkRes.data);
      setRooms(rmRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleChannel = async (ch) => {
    try {
      await api.put(`/channels/${ch.channel_id}?is_active=${!ch.is_active}`);
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const handleAddChannel = async () => {
    if (!addForm.name) return;
    try {
      await api.post('/channels', { ...addForm, commission_pct: parseFloat(addForm.commission_pct), is_active: true });
      setShowAddChannel(false);
      setAddForm({ name: '', channel_type: 'ota', commission_pct: 15 });
      fetchAll();
    } catch (err) { alert(err.response?.data?.detail || 'Failed'); }
  };

  const handleSetRate = async (channelId, roomType, rate) => {
    try {
      await api.post('/channels/rates', { channel_id: channelId, room_type: roomType, rate: parseFloat(rate) });
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await api.post('/channels/sync');
      setSyncResult(data);
      fetchAll();
    } catch (err) {
      setSyncResult({ message: err.response?.data?.detail || 'Sync failed', synced: [] });
    }
    finally { setSyncing(false); }
  };

  const getRateForChannel = (channelId, roomType) => {
    const found = rates.find(r => r.channel_id === channelId && r.room_type === roomType);
    return found ? found.rate : '';
  };

  const roomTypes = [...new Set(rooms.map(r => r.room_type))];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="channel-manager-page">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-zinc-200 p-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/menu')} className="w-12 h-12 rounded-xl border-2 border-zinc-200 flex items-center justify-center active:scale-95 transition-transform" data-testid="channel-mgr-back-btn">
          <ArrowLeft size={24} weight="bold" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight">{lang === 'mr' ? 'चॅनेल मॅनेजर' : 'Channel Manager'}</h1>
          <p className="text-sm text-zinc-500">{channels.length} {lang === 'mr' ? 'चॅनेल्स' : 'channels'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="flex gap-2" data-testid="channel-tabs">
          {TABS.map(tab => (
            <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} lang={lang} onClick={() => setActiveTab(tab.id)} />
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ====== OVERVIEW TAB ====== */}
        {activeTab === 'overview' && analytics && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3" data-testid="channel-overview-cards">
              <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
                <p className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-400">{lang === 'mr' ? 'एकूण बुकिंग्ज' : 'Total Bookings'}</p>
                <p className="text-3xl font-black text-zinc-900 mt-1">{analytics.summary.total_bookings}</p>
              </div>
              <div className="bg-[#DCFCE7] rounded-2xl border-2 border-[#16A34A] p-4">
                <p className="text-xs uppercase tracking-[0.1em] font-bold text-[#14532D]/70">{lang === 'mr' ? 'एकूण महसूल' : 'Total Revenue'}</p>
                <p className="text-3xl font-black text-[#14532D] mt-1">₹{analytics.summary.total_revenue}</p>
              </div>
              <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-4">
                <p className="text-xs uppercase tracking-[0.1em] font-bold text-red-700/70">{lang === 'mr' ? 'कमिशन' : 'Commission'}</p>
                <p className="text-3xl font-black text-red-700 mt-1">₹{analytics.summary.total_commission}</p>
              </div>
              <div className="bg-blue-50 rounded-2xl border-2 border-blue-300 p-4">
                <p className="text-xs uppercase tracking-[0.1em] font-bold text-blue-700/70">{lang === 'mr' ? 'निव्वळ' : 'Net Revenue'}</p>
                <p className="text-3xl font-black text-blue-700 mt-1">₹{analytics.summary.net_revenue}</p>
              </div>
            </div>

            {/* Channel Breakdown */}
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="channel-breakdown">
              <p className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3">{lang === 'mr' ? 'चॅनेल विश्लेषण' : 'Channel Breakdown'}</p>
              <div className="space-y-3">
                {analytics.channels.map(ch => {
                  const pct = analytics.summary.total_bookings > 0 ? Math.round((ch.total_bookings / analytics.summary.total_bookings) * 100) : 0;
                  return (
                    <div key={ch.channel_id} className="space-y-1" data-testid={`channel-stat-${ch.channel_id}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{ch.channel_name}</span>
                        <span className="text-sm font-bold text-zinc-500">{ch.total_bookings} {lang === 'mr' ? 'बुकिंग्ज' : 'bookings'}</span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-900 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>{lang === 'mr' ? 'महसूल' : 'Revenue'}: ₹{ch.total_revenue}</span>
                        <span>{lang === 'mr' ? 'कमिशन' : 'Comm'}: ₹{ch.commission} ({ch.commission_pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ====== CHANNELS TAB ====== */}
        {activeTab === 'channels' && (
          <>
            <button onClick={() => setShowAddChannel(!showAddChannel)} className="w-full h-14 rounded-xl bg-zinc-900 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform" data-testid="add-channel-btn">
              <Plus size={20} weight="bold" /> {lang === 'mr' ? 'नवीन चॅनेल' : 'Add Channel'}
            </button>

            {showAddChannel && (
              <div className="bg-white rounded-2xl border-2 border-zinc-900 p-4 space-y-3" data-testid="add-channel-form">
                <input type="text" value={addForm.name} onChange={e => setAddForm(p => ({...p, name: e.target.value}))}
                  placeholder={lang === 'mr' ? 'चॅनेल नाव' : 'Channel Name'}
                  className="w-full h-12 px-4 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="add-channel-name" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={addForm.channel_type} onChange={e => setAddForm(p => ({...p, channel_type: e.target.value}))}
                    className="h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold bg-white focus:border-zinc-900 focus:outline-none" data-testid="add-channel-type">
                    <option value="ota">OTA</option>
                    <option value="direct">{lang === 'mr' ? 'डायरेक्ट' : 'Direct'}</option>
                    <option value="website">{lang === 'mr' ? 'वेबसाइट' : 'Website'}</option>
                  </select>
                  <div className="relative">
                    <input type="number" value={addForm.commission_pct} onChange={e => setAddForm(p => ({...p, commission_pct: e.target.value}))}
                      placeholder="Commission %" className="w-full h-12 px-3 pr-8 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="add-channel-commission" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">%</span>
                  </div>
                </div>
                <button onClick={handleAddChannel} className="w-full h-12 rounded-xl bg-[#22C55E] text-white font-bold active:scale-95 transition-transform" data-testid="submit-add-channel">
                  {lang === 'mr' ? 'जोडा' : 'Add'}
                </button>
              </div>
            )}

            <div className="space-y-3" data-testid="channels-list">
              {channels.map(ch => (
                <div key={ch.channel_id} className={`bg-white rounded-2xl border-2 p-4 flex items-center justify-between ${ch.is_active ? 'border-zinc-200' : 'border-zinc-100 opacity-60'}`} data-testid={`channel-card-${ch.channel_id}`}>
                  <div>
                    <p className="font-bold text-base">{ch.name}</p>
                    <p className="text-xs text-zinc-500">{ch.channel_type.toUpperCase()} · {lang === 'mr' ? 'कमिशन' : 'Commission'}: {ch.commission_pct}%</p>
                  </div>
                  <button onClick={() => handleToggleChannel(ch)} className="active:scale-95 transition-transform" data-testid={`toggle-channel-${ch.channel_id}`}>
                    {ch.is_active ? <ToggleRight size={36} weight="fill" className="text-[#22C55E]" /> : <ToggleLeft size={36} weight="fill" className="text-zinc-300" />}
                  </button>
                </div>
              ))}
              {channels.length === 0 && (
                <p className="text-center text-zinc-400 py-8">{lang === 'mr' ? 'कोणतेही चॅनेल नाहीत' : 'No channels yet'}</p>
              )}
            </div>
          </>
        )}

        {/* ====== RATES TAB ====== */}
        {activeTab === 'rates' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
              <p className="text-xs font-bold text-amber-700">{lang === 'mr' ? 'प्रत्येक चॅनेलसाठी रूम प्रकारानुसार दर सेट करा. रिकामे = डीफॉल्ट रूम दर वापरला जाईल.' : 'Set rates per room type for each channel. Empty = default room rate used.'}</p>
            </div>
            {channels.filter(c => c.is_active).map(ch => (
              <div key={ch.channel_id} className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid={`rate-card-${ch.channel_id}`}>
                <p className="font-bold text-base mb-3">{ch.name} <span className="text-xs text-zinc-400">({ch.commission_pct}% {lang === 'mr' ? 'कमिशन' : 'commission'})</span></p>
                <div className="space-y-2">
                  {roomTypes.map(rt => (
                    <div key={rt} className="flex items-center gap-3">
                      <span className="text-sm font-bold w-24 capitalize">{rt}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-zinc-400">₹</span>
                        <input
                          type="number"
                          defaultValue={getRateForChannel(ch.channel_id, rt)}
                          placeholder={lang === 'mr' ? 'डीफॉल्ट' : 'Default'}
                          onBlur={e => {
                            const val = e.target.value;
                            if (val) handleSetRate(ch.channel_id, rt, val);
                          }}
                          className="flex-1 h-10 px-3 rounded-lg border-2 border-zinc-200 font-bold text-sm focus:border-zinc-900 focus:outline-none"
                          data-testid={`rate-input-${ch.channel_id}-${rt}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ====== BOOKINGS TAB ====== */}
        {activeTab === 'bookings' && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2" data-testid="booking-filter">
              <button onClick={() => setFilterChannel('')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${!filterChannel ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200'}`}>
                {lang === 'mr' ? 'सर्व' : 'All'}
              </button>
              <button onClick={() => setFilterChannel('walk-in')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${filterChannel === 'walk-in' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200'}`}>
                Walk-in
              </button>
              {channels.map(ch => (
                <button key={ch.channel_id} onClick={() => setFilterChannel(ch.channel_id)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${filterChannel === ch.channel_id ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200'}`}>
                  {ch.name}
                </button>
              ))}
            </div>

            <div className="space-y-3" data-testid="channel-bookings-list">
              {bookings
                .filter(b => !filterChannel || b.source_channel === filterChannel || (!b.source_channel && filterChannel === 'walk-in'))
                .map(b => (
                  <div key={b.booking_id} className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid={`channel-booking-${b.booking_id}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold">{b.guest_name}</p>
                        <p className="text-xs text-zinc-500">{lang === 'mr' ? 'रूम' : 'Room'} {b.room_number} · {b.booking_id}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                        }`}>{b.status}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">
                        {b.source_channel_name || b.source_channel || 'Walk-in'}
                      </span>
                      <span className="font-bold">₹{b.rate_per_day}/{lang === 'mr' ? 'दिवस' : 'day'}</span>
                      {b.channel_ref && <span className="text-zinc-400">Ref: {b.channel_ref}</span>}
                    </div>
                  </div>
                ))}
              {bookings.filter(b => !filterChannel || b.source_channel === filterChannel || (!b.source_channel && filterChannel === 'walk-in')).length === 0 && (
                <p className="text-center text-zinc-400 py-8">{lang === 'mr' ? 'बुकिंग नाही' : 'No bookings'}</p>
              )}
            </div>
          </>
        )}

        {/* ====== SYNC TAB ====== */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-6 text-center" data-testid="sync-section">
              <Lightning size={48} weight="bold" className="text-amber-500 mx-auto mb-3" />
              <h2 className="font-bold text-lg mb-1">{lang === 'mr' ? 'OTA सिंक सिम्युलेट करा' : 'Simulate OTA Sync'}</h2>
              <p className="text-sm text-zinc-500 mb-4">
                {lang === 'mr' ? 'सक्रिय OTA चॅनेल्सवरून यादृच्छिक बुकिंग्ज तयार करा' : 'Generate random bookings from active OTA channels'}
              </p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full h-14 rounded-xl bg-[#2563EB] text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                data-testid="sync-btn"
              >
                <ArrowsClockwise size={20} weight="bold" className={syncing ? 'animate-spin' : ''} />
                {syncing ? (lang === 'mr' ? 'सिंक होत आहे...' : 'Syncing...') : (lang === 'mr' ? 'सिंक सुरू करा' : 'Run Sync')}
              </button>
            </div>

            {syncResult && (
              <div className={`rounded-2xl border-2 p-4 ${syncResult.synced?.length > 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`} data-testid="sync-result">
                <p className="font-bold mb-2">{syncResult.message}</p>
                {syncResult.synced?.map(b => (
                  <div key={b.booking_id} className="bg-white rounded-xl p-3 mb-2 border border-zinc-100">
                    <p className="font-bold text-sm">{b.guest_name} — {lang === 'mr' ? 'रूम' : 'Room'} {b.room_number}</p>
                    <p className="text-xs text-zinc-500">{b.source_channel_name} · Ref: {b.channel_ref} · ₹{b.rate_per_day}/{lang === 'mr' ? 'दिवस' : 'day'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Active Channels Status */}
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="sync-channel-status">
              <p className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3">{lang === 'mr' ? 'चॅनेल स्थिती' : 'Channel Status'}</p>
              {channels.map(ch => (
                <div key={ch.channel_id} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <span className="font-bold text-sm">{ch.name}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${ch.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {ch.is_active ? (lang === 'mr' ? 'सक्रिय' : 'Active') : (lang === 'mr' ? 'निष्क्रिय' : 'Inactive')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
