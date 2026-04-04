import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, SignOut, CurrencyInr, Receipt, WhatsappLogo, Broom, FilePdf, CurrencyCircleDollar } from '@phosphor-icons/react';

export default function RoomDetailPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { roomNumber } = useParams();
  const [room, setRoom] = useState(null);
  const [booking, setBooking] = useState(null);
  const [billPreview, setBillPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    payment_method: 'cash',
    additional_charges: 0,
    discount: 0
  });

  useEffect(() => {
    fetchRoomData();
  }, [roomNumber]);

  const fetchRoomData = async () => {
    try {
      const { data } = await api.get(`/rooms/${roomNumber}`);
      setRoom(data);
      if (data.current_booking_id) {
        const billRes = await api.get(`/bookings/${data.current_booking_id}/bill`);
        setBooking(billRes.data);
        setBillPreview(billRes.data.billing_preview);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!booking) return;
    setCheckingOut(true);
    try {
      const { data } = await api.post('/bookings/checkout', {
        booking_id: booking.booking_id,
        ...checkoutForm
      });
      alert(`${lang === 'mr' ? 'चेक-आउट पूर्ण!' : 'Checkout Complete!'}\n${lang === 'mr' ? 'एकूण' : 'Total'}: ₹${data.total_amount}\n${lang === 'mr' ? 'बाकी' : 'Balance'}: ₹${data.balance_due}`);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.detail || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleMarkCleaning = async () => {
    try {
      await api.put(`/rooms/${roomNumber}`, { status: 'cleaning' });
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  const sendWhatsApp = async (type) => {
    if (!booking) return;
    try {
      await api.post('/whatsapp/send', {
        phone: booking.guest_phone,
        message_type: type,
        guest_name: booking.guest_name,
        booking_id: booking.booking_id
      });
      alert(lang === 'mr' ? 'WhatsApp पाठवला (मॉक)' : 'WhatsApp sent (mocked)');
    } catch (err) {
      console.error(err);
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
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="room-detail-page">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-zinc-200 p-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="w-12 h-12 rounded-xl border-2 border-zinc-200 flex items-center justify-center active:scale-95 transition-transform"
          data-testid="room-detail-back-btn"
        >
          <ArrowLeft size={24} weight="bold" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight">
            {t('room_number')} {roomNumber}
          </h1>
          <p className="text-sm text-zinc-500">
            {room?.room_type === 'deluxe' ? t('deluxe') : t('standard')}
          </p>
        </div>
        {room?.status === 'occupied' && (
          <div className="ml-auto bg-[#FEE2E2] text-[#7F1D1D] px-3 py-1 rounded-lg text-sm font-bold">
            {t('occupied')}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Guest Info */}
        {booking && (
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="guest-info-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500">
                {lang === 'mr' ? 'पाहुणे माहिती' : 'Guest Info'}
              </span>
              <span className="text-xs font-medium text-zinc-400">
                {booking.booking_id}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">{t('guest_name')}</span>
                <span className="font-bold">{booking.guest_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">{t('phone')}</span>
                <span className="font-bold">{booking.guest_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">{t('num_guests')}</span>
                <span className="font-bold">{booking.num_guests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">{t('check_in')}</span>
                <span className="font-bold text-sm">
                  {new Date(booking.check_in).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bill Preview */}
        {billPreview && (
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid="bill-preview-card">
            <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3 block">
              {t('view_bill')} ({lang === 'mr' ? 'अंदाजे' : 'Estimated'})
            </span>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">{lang === 'mr' ? 'कालावधी' : 'Duration'}</span>
                <span className="font-bold">{billPreview.total_days} {lang === 'mr' ? 'दिवस' : 'days'} ({billPreview.total_hours} hrs)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">{lang === 'mr' ? 'रूम चार्ज' : 'Room Charge'}</span>
                <span className="font-bold">₹{billPreview.room_charge}</span>
              </div>
              {billPreview.extra_guest_charge > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-sm">{lang === 'mr' ? 'अतिरिक्त पाहुणे' : 'Extra Guests'}</span>
                  <span className="font-bold">₹{billPreview.extra_guest_charge}</span>
                </div>
              )}
              <div className="border-t-2 border-zinc-100 pt-2 flex justify-between">
                <span className="font-bold">{t('total_amount')}</span>
                <span className="font-black text-xl">₹{billPreview.total_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">{t('advance_paid')}</span>
                <span className="font-bold text-[#22C55E]">-₹{booking?.total_paid || 0}</span>
              </div>
              <div className="flex justify-between bg-red-50 -mx-4 px-4 py-2 rounded-xl">
                <span className="font-bold text-[#DC2626]">{t('balance_due')}</span>
                <span className="font-black text-xl text-[#DC2626]">
                  ₹{Math.max(0, billPreview.total_amount - (booking?.total_paid || 0))}
                </span>
              </div>
            </div>
            {billPreview.billing_notes?.length > 0 && (
              <div className="mt-3 bg-amber-50 rounded-xl p-3">
                {billPreview.billing_notes.map((note, i) => (
                  <p key={i} className="text-xs text-amber-700">{note}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Actions */}
        {booking && (
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
            <span className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3 block">
              {t('whatsapp')} ({lang === 'mr' ? 'मॉक' : 'Mocked'})
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => sendWhatsApp('welcome')}
                className="h-14 rounded-xl border-2 border-[#25D366] bg-[#25D366]/10 text-[#128C7E] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                data-testid="whatsapp-welcome-btn"
              >
                <WhatsappLogo size={20} weight="bold" />
                {lang === 'mr' ? 'स्वागत' : 'Welcome'}
              </button>
              <button
                onClick={() => sendWhatsApp('wifi')}
                className="h-14 rounded-xl border-2 border-[#25D366] bg-[#25D366]/10 text-[#128C7E] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                data-testid="whatsapp-wifi-btn"
              >
                <WhatsappLogo size={20} weight="bold" />
                WiFi
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions: Invoice + Add Advance */}
        {booking && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                try {
                  const { data } = await api.get(`/bookings/${booking.booking_id}/invoice`);
                  // Generate printable invoice
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(`
                      <html><head><title>Invoice ${data.invoice_id}</title>
                      <style>body{font-family:sans-serif;padding:20px;max-width:400px;margin:auto}
                      h1{font-size:18px}table{width:100%;border-collapse:collapse}
                      td{padding:4px 0;border-bottom:1px solid #eee}
                      .total{font-weight:bold;font-size:18px;border-top:2px solid #000}
                      .header{text-align:center;margin-bottom:20px}</style></head><body>
                      <div class="header"><h1>Digital Register Hotel</h1><p>Invoice: ${data.invoice_id}</p></div>
                      <table>
                      <tr><td>Guest</td><td>${data.guest?.name || ''}</td></tr>
                      <tr><td>Room</td><td>${data.room_number}</td></tr>
                      <tr><td>Check-in</td><td>${new Date(data.check_in).toLocaleString('en-IN')}</td></tr>
                      <tr><td>Check-out</td><td>${data.check_out ? new Date(data.check_out).toLocaleString('en-IN') : 'Active'}</td></tr>
                      <tr><td>Rate/Day</td><td>₹${data.rate_per_day}</td></tr>
                      <tr><td>Guests</td><td>${data.num_guests}</td></tr>
                      ${data.billing ? `<tr><td>Days</td><td>${data.billing.total_days}</td></tr>
                      <tr><td>Room Charge</td><td>₹${data.billing.room_charge}</td></tr>
                      ${data.billing.extra_guest_charge ? `<tr><td>Extra Guests</td><td>₹${data.billing.extra_guest_charge}</td></tr>` : ''}` : ''}
                      <tr><td>Additional</td><td>₹${data.additional_charges || 0}</td></tr>
                      <tr><td>Discount</td><td>-₹${data.discount || 0}</td></tr>
                      <tr class="total"><td>Total</td><td>₹${data.total_amount}</td></tr>
                      <tr><td>Paid</td><td>₹${data.total_paid}</td></tr>
                      <tr style="color:red"><td>Balance</td><td>₹${data.balance_due}</td></tr>
                      </table>
                      <p style="text-align:center;margin-top:20px;font-size:12px;color:#999">Thank you for your stay!</p>
                      </body></html>
                    `);
                    win.document.close();
                    win.print();
                  }
                } catch (err) { console.error(err); }
              }}
              className="h-14 rounded-xl border-2 border-zinc-200 bg-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              data-testid="invoice-btn"
            >
              <FilePdf size={20} weight="bold" />
              {lang === 'mr' ? 'बिल प्रिंट' : 'Print Invoice'}
            </button>
            <button
              onClick={async () => {
                const amt = prompt(lang === 'mr' ? 'ॲडव्हान्स रक्कम:' : 'Advance amount:');
                if (!amt || isNaN(amt)) return;
                try {
                  await api.post('/bookings/advance', {
                    booking_id: booking.booking_id,
                    amount: parseFloat(amt),
                    payment_method: 'cash'
                  });
                  fetchRoomData();
                } catch (err) { console.error(err); }
              }}
              className="h-14 rounded-xl border-2 border-[#22C55E] bg-[#DCFCE7] text-[#14532D] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              data-testid="add-advance-btn"
            >
              <CurrencyCircleDollar size={20} weight="bold" />
              {t('add_advance')}
            </button>
          </div>
        )}

        {/* Checkout Section */}
        {booking && !showCheckout && (
          <button
            onClick={() => setShowCheckout(true)}
            className="bg-[#EF4444] text-white h-16 rounded-xl flex items-center justify-center gap-3 w-full active:scale-95 transition-transform text-lg font-bold uppercase tracking-[0.05em]"
            data-testid="start-checkout-btn"
          >
            <SignOut size={24} weight="bold" />
            {t('check_out')}
          </button>
        )}

        {showCheckout && (
          <div className="bg-white rounded-2xl border-2 border-[#DC2626] p-4 space-y-4" data-testid="checkout-form">
            <span className="text-xs uppercase tracking-[0.1em] font-bold text-[#DC2626] block">
              {t('check_out')} — {t('confirm')}
            </span>

            <div>
              <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('additional_charges')}</label>
              <input
                type="number"
                value={checkoutForm.additional_charges}
                onChange={(e) => setCheckoutForm(prev => ({...prev, additional_charges: parseFloat(e.target.value) || 0}))}
                className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none"
                data-testid="checkout-extra-charges"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('discount')}</label>
              <input
                type="number"
                value={checkoutForm.discount}
                onChange={(e) => setCheckoutForm(prev => ({...prev, discount: parseFloat(e.target.value) || 0}))}
                className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none"
                data-testid="checkout-discount"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-400 mb-2 block">{t('payment_method')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCheckoutForm(prev => ({...prev, payment_method: 'cash'}))}
                  className={`h-14 rounded-xl border-2 font-bold text-lg active:scale-95 transition-transform ${
                    checkoutForm.payment_method === 'cash'
                      ? 'bg-[#22C55E] text-white border-[#16A34A]'
                      : 'bg-white text-zinc-600 border-zinc-200'
                  }`}
                  data-testid="checkout-cash-btn"
                >
                  {t('cash')}
                </button>
                <button
                  onClick={() => setCheckoutForm(prev => ({...prev, payment_method: 'upi'}))}
                  className={`h-14 rounded-xl border-2 font-bold text-lg active:scale-95 transition-transform ${
                    checkoutForm.payment_method === 'upi'
                      ? 'bg-[#2563EB] text-white border-[#1D4ED8]'
                      : 'bg-white text-zinc-600 border-zinc-200'
                  }`}
                  data-testid="checkout-upi-btn"
                >
                  {t('upi')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="h-16 rounded-xl border-2 border-zinc-200 font-bold text-lg active:scale-95 transition-transform"
                data-testid="checkout-cancel-btn"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="h-16 rounded-xl bg-[#EF4444] text-white font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                data-testid="checkout-confirm-btn"
              >
                <SignOut size={20} weight="bold" />
                {checkingOut ? t('loading') : t('confirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
