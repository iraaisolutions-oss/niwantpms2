import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../lib/api';
import { 
  Bell, Drop, Broom, Receipt, Towel, DotsThree, 
  CheckCircle, Clock, Warning 
} from '@phosphor-icons/react';
import { useParams } from 'react-router-dom';

// Guest-facing QR page (no auth required)
export function GuestQRPage() {
  const { roomNumber } = useParams();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [guestName, setGuestName] = useState('');

  const requestTypes = [
    { id: 'water', icon: Drop, label: 'Water / पाणी', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { id: 'cleaning', icon: Broom, label: 'Cleaning / सफाई', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { id: 'towel', icon: Towel, label: 'Towel / टॉवेल', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { id: 'bill', icon: Receipt, label: 'Bill / बिल', color: 'bg-[#DCFCE7] border-[#16A34A] text-[#14532D]' },
    { id: 'other', icon: DotsThree, label: 'Other / इतर', color: 'bg-zinc-50 border-zinc-200 text-zinc-700' },
  ];

  const sendRequest = async (type) => {
    setSending(true);
    try {
      await api.post('/qr/request', {
        room_number: parseInt(roomNumber),
        request_type: type,
        guest_name: guestName || 'Guest',
      });
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      alert('Request failed. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#DCFCE7] flex flex-col items-center justify-center p-6" data-testid="qr-success">
        <CheckCircle size={80} weight="bold" className="text-[#16A34A] mb-4" />
        <h2 className="text-2xl font-black text-[#14532D] text-center">
          विनंती पाठवली! / Request Sent!
        </h2>
        <p className="text-[#14532D]/70 mt-2 text-center">
          कर्मचारी लवकरच येतील / Staff will arrive shortly
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] p-4" data-testid="qr-guest-page">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Bell size={32} weight="bold" className="text-white" />
        </div>
        <h1 className="font-heading text-3xl font-black tracking-tight text-zinc-900">
          Room {roomNumber}
        </h1>
        <p className="text-zinc-500 text-base mt-1">
          डिजिटल बेल / Digital Bell
        </p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Your name / आपले नाव (optional)"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none bg-white"
          data-testid="qr-guest-name"
        />
      </div>

      <div className="space-y-3">
        {requestTypes.map((rt) => {
          const Icon = rt.icon;
          return (
            <button
              key={rt.id}
              onClick={() => sendRequest(rt.id)}
              disabled={sending}
              className={`w-full h-20 rounded-2xl border-2 ${rt.color} flex items-center justify-center gap-4 text-xl font-bold active:scale-95 transition-transform disabled:opacity-50`}
              data-testid={`qr-request-${rt.id}`}
            >
              <Icon size={32} weight="bold" />
              {rt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Staff-facing: View requests
export function StaffRequestsPage() {
  const { t, lang } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const { data } = await api.get(`/qr/requests?status=${filter}`);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resolveRequest = async (requestId) => {
    try {
      await api.put(`/qr/requests/${requestId}`);
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'water': return <Drop size={20} weight="bold" className="text-blue-600" />;
      case 'cleaning': return <Broom size={20} weight="bold" className="text-amber-600" />;
      case 'towel': return <Towel size={20} weight="bold" className="text-purple-600" />;
      case 'bill': return <Receipt size={20} weight="bold" className="text-green-600" />;
      default: return <Bell size={20} weight="bold" className="text-zinc-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="staff-requests-page">
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={24} weight="bold" className="text-zinc-500" />
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
            {lang === 'mr' ? 'पाहुणे विनंत्या' : 'Guest Requests'}
          </h1>
        </div>
        <p className="text-zinc-500 text-sm mb-4">
          {lang === 'mr' ? 'QR डिजिटल बेल विनंत्या' : 'QR Digital Bell Requests'}
        </p>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {['pending', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-10 px-4 rounded-xl font-bold text-sm active:scale-95 transition-transform ${
                filter === f
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border-2 border-zinc-200 text-zinc-600'
              }`}
              data-testid={`filter-${f}`}
            >
              {f === 'pending' ? (lang === 'mr' ? 'प्रलंबित' : 'Pending') : (lang === 'mr' ? 'पूर्ण' : 'Resolved')}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3">
        {requests.map((req, i) => (
          <div key={i} className={`bg-white rounded-2xl border-2 p-4 ${
            req.status === 'pending' ? 'border-amber-200' : 'border-zinc-200'
          }`} data-testid={`request-${req.request_id}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getTypeIcon(req.request_type)}
                <div>
                  <p className="font-bold">
                    {t('room_number')} {req.room_number} — {req.request_type}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {req.guest_name && `${req.guest_name} · `}
                    {new Date(req.created_at).toLocaleTimeString('en-IN')}
                  </p>
                </div>
              </div>
              {req.status === 'pending' ? (
                <button
                  onClick={() => resolveRequest(req.request_id)}
                  className="h-10 px-4 rounded-xl bg-[#22C55E] text-white font-bold text-sm flex items-center gap-1 active:scale-95 transition-transform"
                  data-testid={`resolve-${req.request_id}`}
                >
                  <CheckCircle size={16} weight="bold" />
                  {lang === 'mr' ? 'पूर्ण' : 'Done'}
                </button>
              ) : (
                <span className="text-xs text-zinc-400">
                  {req.resolved_by} · {new Date(req.resolved_at).toLocaleTimeString('en-IN')}
                </span>
              )}
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <div className="text-center py-12">
            <Bell size={48} weight="duotone" className="text-zinc-300 mx-auto mb-2" />
            <p className="text-zinc-400 font-bold">
              {filter === 'pending'
                ? (lang === 'mr' ? 'कोणत्याही प्रलंबित विनंत्या नाहीत' : 'No pending requests')
                : (lang === 'mr' ? 'कोणत्याही पूर्ण विनंत्या नाहीत' : 'No resolved requests')
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
