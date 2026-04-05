import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, Plus, CalendarBlank, ListBullets, MagnifyingGlass, CheckCircle, X, ArrowRight, CopySimple } from '@phosphor-icons/react';

export default function ReservationsPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list' | 'calendar' | 'new'
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [channels, setChannels] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [guestSearch, setGuestSearch] = useState('');
  const [guestResults, setGuestResults] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const [form, setForm] = useState({
    room_number: '', guest_name: '', guest_phone: '', whatsapp_number: '',
    check_in_date: '', num_guests: 1, rate_per_day: 0, advance_paid: 0,
    payment_method: 'cash', source_channel: 'walk-in', notes: ''
  });

  const fetchAll = useCallback(async () => {
    try {
      const [resRes, roomRes, chRes, calRes] = await Promise.all([
        api.get('/bookings/reservations'),
        api.get('/rooms'),
        api.get('/channels'),
        api.get(`/bookings/calendar?month=${currentMonth}`)
      ]);
      setReservations(resRes.data);
      setRooms(roomRes.data);
      setChannels(chRes.data.filter(c => c.is_active));
      setCalendarData(calRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [currentMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const searchGuests = async (q) => {
    setGuestSearch(q);
    if (q.length < 2) { setGuestResults([]); return; }
    try {
      const { data } = await api.get(`/guests/search?q=${encodeURIComponent(q)}`);
      setGuestResults(data);
    } catch (err) { setGuestResults([]); }
  };

  const selectGuest = (g) => {
    setForm(prev => ({
      ...prev,
      guest_name: g.name || '',
      guest_phone: g.phone || '',
      whatsapp_number: g.whatsapp_number || g.phone || '',
    }));
    setGuestSearch('');
    setGuestResults([]);
  };

  const selectRoom = (room) => {
    setForm(prev => ({ ...prev, room_number: room.room_number, rate_per_day: room.rate }));
  };

  const handleReserve = async () => {
    if (!form.room_number || !form.guest_name || !form.guest_phone || !form.check_in_date) return;
    try {
      await api.post('/bookings/reserve', {
        ...form,
        room_number: parseInt(form.room_number),
        rate_per_day: parseFloat(form.rate_per_day),
        advance_paid: parseFloat(form.advance_paid) || 0,
        whatsapp_number: form.whatsapp_number || form.guest_phone
      });
      setView('list');
      setForm({ room_number: '', guest_name: '', guest_phone: '', whatsapp_number: '', check_in_date: '', num_guests: 1, rate_per_day: 0, advance_paid: 0, payment_method: 'cash', source_channel: 'walk-in', notes: '' });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create reservation');
    }
  };

  const handleCheckin = async (bookingId) => {
    try {
      await api.post(`/bookings/reserve/${bookingId}/checkin`);
      fetchAll();
    } catch (err) { alert(err.response?.data?.detail || 'Check-in failed'); }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm(lang === 'mr' ? 'बुकिंग रद्द करायचे?' : 'Cancel this reservation?')) return;
    try {
      await api.post(`/bookings/reserve/${bookingId}/cancel`);
      fetchAll();
    } catch (err) { alert(err.response?.data?.detail || 'Cancel failed'); }
  };

  const today = new Date().toISOString().split('T')[0];

  const getDaysInMonth = (monthStr) => {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  };

  const getFirstDayOfMonth = (monthStr) => {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m - 1, 1).getDay();
  };

  const isRoomReservedOnDate = (roomNumber, date) => {
    return reservations.some(r => r.room_number === roomNumber && r.check_in_date === date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="reservations-page">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-zinc-200 p-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => view === 'new' ? setView('list') : navigate('/menu')} className="w-12 h-12 rounded-xl border-2 border-zinc-200 flex items-center justify-center active:scale-95 transition-transform" data-testid="reservations-back-btn">
          <ArrowLeft size={24} weight="bold" />
        </button>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-bold tracking-tight">
            {view === 'new' ? (lang === 'mr' ? 'नवीन बुकिंग' : 'New Reservation') : (lang === 'mr' ? 'बुकिंग्ज' : 'Reservations')}
          </h1>
          <p className="text-sm text-zinc-500">{reservations.length} {lang === 'mr' ? 'आगामी' : 'upcoming'}</p>
        </div>
        {view !== 'new' && (
          <button onClick={() => setView('new')} className="h-10 px-4 rounded-xl bg-zinc-900 text-white font-bold text-sm flex items-center gap-1 active:scale-95 transition-transform" data-testid="new-reservation-btn">
            <Plus size={16} weight="bold" /> {lang === 'mr' ? 'नवीन' : 'New'}
          </button>
        )}
      </div>

      {/* View Toggle */}
      {view !== 'new' && (
        <div className="px-4 pt-4 flex gap-2">
          <button onClick={() => setView('list')} className={`flex-1 h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${view === 'list' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-500'}`} data-testid="view-list-btn">
            <ListBullets size={16} weight="bold" /> {lang === 'mr' ? 'यादी' : 'List'}
          </button>
          <button onClick={() => setView('calendar')} className={`flex-1 h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${view === 'calendar' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-500'}`} data-testid="view-calendar-btn">
            <CalendarBlank size={16} weight="bold" /> {lang === 'mr' ? 'कॅलेंडर' : 'Calendar'}
          </button>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* ===== LIST VIEW ===== */}
        {view === 'list' && (
          <>
            {/* Today's reservations */}
            {reservations.filter(r => r.check_in_date === today).length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4" data-testid="today-reservations">
                <p className="text-xs uppercase tracking-[0.1em] font-bold text-amber-700 mb-3">
                  {lang === 'mr' ? 'आजच्या बुकिंग्ज' : "Today's Reservations"}
                </p>
                {reservations.filter(r => r.check_in_date === today).map(r => (
                  <div key={r.booking_id} className="bg-white rounded-xl p-3 mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{r.guest_name} — {lang === 'mr' ? 'रूम' : 'Room'} {r.room_number}</p>
                      <p className="text-xs text-zinc-500">{r.booking_id} · ₹{r.rate_per_day}/{lang === 'mr' ? 'दिवस' : 'day'}</p>
                    </div>
                    <button onClick={() => handleCheckin(r.booking_id)}
                      className="h-10 px-4 rounded-xl bg-[#22C55E] text-white font-bold text-sm flex items-center gap-1 active:scale-95 transition-transform" data-testid={`checkin-reservation-${r.booking_id}`}>
                      <CheckCircle size={16} weight="bold" /> {lang === 'mr' ? 'चेक-इन' : 'Check-In'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming reservations */}
            <div className="space-y-3" data-testid="reservations-list">
              {reservations.filter(r => r.check_in_date !== today).map(r => (
                <div key={r.booking_id} className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid={`reservation-${r.booking_id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">{r.guest_name}</p>
                      <p className="text-sm text-zinc-500">{lang === 'mr' ? 'रूम' : 'Room'} {r.room_number} · {r.booking_id}</p>
                    </div>
                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">{r.check_in_date}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-500">
                    <span>₹{r.rate_per_day}/{lang === 'mr' ? 'दिवस' : 'day'} · {r.num_guests} {lang === 'mr' ? 'पाहुणे' : 'guest(s)'}</span>
                    {r.advance_paid > 0 && <span className="text-green-600 font-bold">{lang === 'mr' ? 'ॲडव्हान्स' : 'Advance'}: ₹{r.advance_paid}</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {r.check_in_date <= today && (
                      <button onClick={() => handleCheckin(r.booking_id)}
                        className="flex-1 h-10 rounded-xl bg-[#22C55E] text-white font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-transform">
                        <CheckCircle size={14} weight="bold" /> {lang === 'mr' ? 'चेक-इन' : 'Check-In'}
                      </button>
                    )}
                    <button onClick={() => handleCancel(r.booking_id)}
                      className="h-10 px-4 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm flex items-center gap-1 active:scale-95 transition-transform" data-testid={`cancel-reservation-${r.booking_id}`}>
                      <X size={14} weight="bold" /> {lang === 'mr' ? 'रद्द' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ))}
              {reservations.length === 0 && (
                <div className="text-center py-12 text-zinc-400">
                  <CalendarBlank size={48} weight="bold" className="mx-auto mb-2 opacity-30" />
                  <p className="font-bold">{lang === 'mr' ? 'कोणतेही बुकिंग नाही' : 'No reservations yet'}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== CALENDAR VIEW ===== */}
        {view === 'calendar' && (
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="calendar-view">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const prev = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,'0')}`;
                setCurrentMonth(prev);
              }} className="w-10 h-10 rounded-xl border-2 border-zinc-200 flex items-center justify-center active:scale-95 transition-transform" data-testid="prev-month-btn">
                <ArrowLeft size={16} weight="bold" />
              </button>
              <span className="font-bold text-lg">
                {new Date(currentMonth + '-01').toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const next = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,'0')}`;
                setCurrentMonth(next);
              }} className="w-10 h-10 rounded-xl border-2 border-zinc-200 flex items-center justify-center active:scale-95 transition-transform" data-testid="next-month-btn">
                <ArrowRight size={16} weight="bold" />
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <div key={d} className="text-center text-xs font-bold text-zinc-400 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                const day = i + 1;
                const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
                const dayData = calendarData?.days?.[dateStr];
                const hasReservations = dayData?.reservations?.length > 0;
                const hasActive = dayData?.active?.length > 0;
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;

                return (
                  <button key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-bold transition-all active:scale-95
                      ${isSelected ? 'bg-zinc-900 text-white' : ''}
                      ${isToday && !isSelected ? 'border-2 border-zinc-900' : ''}
                      ${hasReservations && !isSelected ? 'bg-blue-100 text-blue-700' : ''}
                      ${hasActive && !isSelected && !hasReservations ? 'bg-red-50 text-red-600' : ''}
                      ${!hasReservations && !hasActive && !isToday && !isSelected ? 'hover:bg-zinc-50' : ''}
                    `}
                    data-testid={`cal-day-${dateStr}`}
                  >
                    {day}
                    {(hasReservations || hasActive) && !isSelected && (
                      <div className="flex gap-0.5 mt-0.5">
                        {hasReservations && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        {hasActive && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected date details */}
            {selectedDate && calendarData?.days?.[selectedDate] && (
              <div className="mt-4 pt-4 border-t-2 border-zinc-100 space-y-2" data-testid="selected-date-details">
                <p className="text-xs font-bold text-zinc-500 uppercase">{selectedDate}</p>
                {calendarData.days[selectedDate].reservations?.map(r => (
                  <div key={r.booking_id} className="bg-blue-50 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-blue-900">{r.guest_name}</p>
                      <p className="text-xs text-blue-600">{lang === 'mr' ? 'रूम' : 'Room'} {r.room_number} · ₹{r.rate}</p>
                    </div>
                    <span className="text-xs font-bold bg-blue-200 text-blue-800 px-2 py-1 rounded">{lang === 'mr' ? 'बुक' : 'Reserved'}</span>
                  </div>
                ))}
                {calendarData.days[selectedDate].active?.map(a => (
                  <div key={a.booking_id} className="bg-red-50 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-red-900">{a.guest_name}</p>
                      <p className="text-xs text-red-600">{lang === 'mr' ? 'रूम' : 'Room'} {a.room_number}</p>
                    </div>
                    <span className="text-xs font-bold bg-red-200 text-red-800 px-2 py-1 rounded">{lang === 'mr' ? 'चेक-इन' : 'Active'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== NEW RESERVATION ===== */}
        {view === 'new' && (
          <div className="space-y-4">
            {/* Guest Search */}
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
              <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-2 block">
                {lang === 'mr' ? 'पाहुणे शोधा / नवीन' : 'Search Guest / New'}
              </label>
              <div className="relative">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="text" value={guestSearch} onChange={(e) => searchGuests(e.target.value)}
                  placeholder={lang === 'mr' ? 'नाव किंवा फोन शोधा...' : 'Search name or phone...'}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-zinc-200 font-medium focus:border-zinc-900 focus:outline-none" data-testid="guest-search-input" />
              </div>
              {guestResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto" data-testid="guest-search-results">
                  {guestResults.map((g, i) => (
                    <button key={i} onClick={() => selectGuest(g)}
                      className="w-full text-left p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 active:scale-[0.98] transition-all">
                      <p className="font-bold text-sm">{g.name}</p>
                      <p className="text-xs text-zinc-500">{g.phone} {g.aadhar_number ? `· ${g.aadhar_number}` : ''}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Guest Details */}
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3">
              <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 block">{lang === 'mr' ? 'पाहुण्याची माहिती' : 'Guest Details'}</label>
              <input type="text" value={form.guest_name} onChange={e => setForm(p => ({...p, guest_name: e.target.value}))}
                placeholder={lang === 'mr' ? 'पाहुण्याचे नाव' : 'Guest Name'}
                className="w-full h-12 px-4 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="res-guest-name" />
              <input type="tel" value={form.guest_phone} onChange={e => setForm(p => ({...p, guest_phone: e.target.value}))}
                placeholder={lang === 'mr' ? 'प्राथमिक फोन' : 'Primary Phone'}
                className="w-full h-12 px-4 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="res-guest-phone" />
              <div className="flex gap-2">
                <input type="tel" value={form.whatsapp_number} onChange={e => setForm(p => ({...p, whatsapp_number: e.target.value}))}
                  placeholder={lang === 'mr' ? 'WhatsApp नंबर' : 'WhatsApp Number'}
                  className="flex-1 h-12 px-4 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="res-whatsapp" />
                <button onClick={() => setForm(p => ({...p, whatsapp_number: p.guest_phone}))}
                  className="h-12 px-3 rounded-xl border-2 border-zinc-200 flex items-center gap-1 text-sm font-bold text-zinc-600 active:scale-95 transition-transform" data-testid="res-copy-phone">
                  <CopySimple size={16} weight="bold" /> {lang === 'mr' ? 'कॉपी' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Date & Room Selection */}
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3">
              <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 block">{lang === 'mr' ? 'तारीख आणि रूम' : 'Date & Room'}</label>
              <input type="date" value={form.check_in_date} onChange={e => setForm(p => ({...p, check_in_date: e.target.value}))}
                min={today}
                className="w-full h-12 px-4 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none bg-white" data-testid="res-date" />
              
              <p className="text-xs font-bold text-zinc-400">{lang === 'mr' ? 'रूम निवडा' : 'Select Room'}</p>
              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto" data-testid="res-room-grid">
                {rooms.map(r => {
                  const reserved = form.check_in_date && isRoomReservedOnDate(r.room_number, form.check_in_date);
                  const isOccupied = r.status === 'occupied';
                  const isSelected = form.room_number === r.room_number;
                  const disabled = reserved || isOccupied;
                  return (
                    <button key={r.room_number} onClick={() => !disabled && selectRoom(r)} disabled={disabled}
                      className={`p-2 rounded-xl border-2 text-center transition-all active:scale-95 ${
                        isSelected ? 'bg-zinc-900 text-white border-zinc-900' :
                        reserved ? 'bg-blue-50 border-blue-200 text-blue-400 opacity-60' :
                        isOccupied ? 'bg-red-50 border-red-200 text-red-400 opacity-60' :
                        'bg-white border-zinc-200 text-zinc-700'
                      }`} data-testid={`res-room-${r.room_number}`}>
                      <span className="font-black text-lg">{r.room_number}</span>
                      <span className="block text-[10px] font-bold">₹{r.rate}</span>
                      {reserved && <span className="block text-[9px]">{lang === 'mr' ? 'बुक' : 'Booked'}</span>}
                    </button>
                  );
                })}
              </div>
              {form.room_number && (
                <p className="text-sm font-bold text-zinc-700">
                  {lang === 'mr' ? 'निवडलेली' : 'Selected'}: {lang === 'mr' ? 'रूम' : 'Room'} {form.room_number} · ₹{form.rate_per_day}/{lang === 'mr' ? 'दिवस' : 'day'}
                </p>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3">
              <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 block">{lang === 'mr' ? 'पेमेंट' : 'Payment'}</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'दर' : 'Rate'}</label>
                  <input type="number" value={form.rate_per_day} onChange={e => setForm(p => ({...p, rate_per_day: e.target.value}))}
                    className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="res-rate" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'ॲडव्हान्स' : 'Advance'}</label>
                  <input type="number" value={form.advance_paid} onChange={e => setForm(p => ({...p, advance_paid: e.target.value}))}
                    className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="res-advance" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setForm(p => ({...p, payment_method: 'cash'}))}
                  className={`h-12 rounded-xl border-2 font-bold active:scale-95 transition-transform ${form.payment_method === 'cash' ? 'bg-[#22C55E] text-white border-[#16A34A]' : 'bg-white text-zinc-600 border-zinc-200'}`} data-testid="res-pay-cash">
                  {lang === 'mr' ? 'रोख' : 'Cash'}
                </button>
                <button onClick={() => setForm(p => ({...p, payment_method: 'upi'}))}
                  className={`h-12 rounded-xl border-2 font-bold active:scale-95 transition-transform ${form.payment_method === 'upi' ? 'bg-[#2563EB] text-white border-[#1D4ED8]' : 'bg-white text-zinc-600 border-zinc-200'}`} data-testid="res-pay-upi">
                  UPI
                </button>
              </div>
            </div>

            {/* Booking Source */}
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
              <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-2 block">{lang === 'mr' ? 'बुकिंग स्रोत' : 'Booking Source'}</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setForm(p => ({...p, source_channel: 'walk-in'}))}
                  className={`px-3 h-10 rounded-xl border-2 font-bold text-xs ${form.source_channel === 'walk-in' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200'}`}>Walk-in</button>
                {channels.map(ch => (
                  <button key={ch.channel_id} onClick={() => setForm(p => ({...p, source_channel: ch.channel_id}))}
                    className={`px-3 h-10 rounded-xl border-2 font-bold text-xs ${form.source_channel === ch.channel_id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200'}`}>{ch.name}</button>
                ))}
              </div>
            </div>

            {/* WhatsApp Info */}
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-3">
              <p className="text-xs font-bold text-green-700">{lang === 'mr' ? 'बुकिंग कन्फर्मेशन + नियम WhatsApp वर स्वयंचलित पाठवले जातील' : 'Booking confirmation + rules will be auto-sent via WhatsApp'}</p>
            </div>

            {/* Submit */}
            <button onClick={handleReserve}
              disabled={!form.room_number || !form.guest_name || !form.guest_phone || !form.check_in_date}
              className="w-full h-16 rounded-xl bg-zinc-900 text-white font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 uppercase tracking-[0.05em]"
              data-testid="submit-reservation-btn">
              <CalendarBlank size={24} weight="bold" />
              {lang === 'mr' ? 'बुकिंग करा' : 'Reserve Room'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
