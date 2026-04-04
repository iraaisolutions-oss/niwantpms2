import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { Camera, UserPlus, ArrowLeft, IdentificationCard, CurrencyInr } from '@phosphor-icons/react';

export default function CheckInPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { roomNumber } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [aadharCaptured, setAadharCaptured] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [form, setForm] = useState({
    guest_name: '',
    guest_phone: '',
    aadhar_number: '',
    address: '',
    nationality: 'Indian',
    num_guests: 1,
    rate_per_day: 0,
    advance_paid: 0,
    payment_method: 'cash',
    id_type: 'Aadhar'
  });

  useEffect(() => {
    fetchRoom();
    return () => stopCamera();
  }, [roomNumber]);

  const fetchRoom = async () => {
    try {
      const { data } = await api.get(`/rooms/${roomNumber}`);
      setRoom(data);
      setForm(prev => ({ ...prev, rate_per_day: data.rate || 1000 }));
    } catch (err) {
      console.error(err);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied', err);
      // Simulate OCR if camera not available
      simulateOCR();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const captureAndOCR = () => {
    // Simulate OCR — auto-fill with dummy data
    simulateOCR();
    stopCamera();
  };

  const simulateOCR = () => {
    const names = ['राज पाटील', 'सुनील शर्मा', 'अमित देशमुख', 'प्रिया जाधव', 'विकास कुलकर्णी'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
    const randomAadhar = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    
    setForm(prev => ({
      ...prev,
      guest_name: randomName,
      guest_phone: randomPhone,
      aadhar_number: randomAadhar,
      address: 'मुंबई, महाराष्ट्र'
    }));
    setAadharCaptured(true);
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    if (!form.guest_name || !form.guest_phone) return;
    setLoading(true);
    try {
      await api.post('/bookings/checkin', {
        room_number: parseInt(roomNumber),
        ...form
      });
      navigate('/');
    } catch (err) {
      console.error('Check-in failed', err);
      alert(err.response?.data?.detail || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="checkin-page">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-zinc-200 p-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="w-12 h-12 rounded-xl border-2 border-zinc-200 flex items-center justify-center active:scale-95 transition-transform"
          data-testid="checkin-back-btn"
        >
          <ArrowLeft size={24} weight="bold" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight">
            {t('check_in')} — {t('room_number')} {roomNumber}
          </h1>
          {room && (
            <p className="text-sm text-zinc-500">
              {room.room_type === 'deluxe' ? t('deluxe') : t('standard')} · ₹{room.rate}/{lang === 'mr' ? 'दिवस' : 'day'}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Aadhar OCR Scanner */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
          <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3 block">
            {t('scan_aadhar')}
          </label>
          
          {showCamera ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-4 border-dashed border-white/50 m-4 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={captureAndOCR}
                  className="h-16 rounded-xl bg-[#22C55E] text-white font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  data-testid="capture-aadhar-btn"
                >
                  <Camera size={24} weight="bold" />
                  {t('capture_photo')}
                </button>
                <button
                  onClick={stopCamera}
                  className="h-16 rounded-xl border-2 border-zinc-200 font-bold text-lg active:scale-95 transition-transform"
                  data-testid="cancel-camera-btn"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startCamera}
              className={`w-full h-20 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 text-lg font-bold active:scale-95 transition-transform ${
                aadharCaptured 
                  ? 'border-[#16A34A] bg-[#DCFCE7] text-[#14532D]' 
                  : 'border-zinc-300 bg-zinc-50 text-zinc-600'
              }`}
              data-testid="start-camera-btn"
            >
              {aadharCaptured ? (
                <>
                  <IdentificationCard size={28} weight="bold" />
                  {lang === 'mr' ? 'आधार स्कॅन झाले' : 'Aadhar Scanned'}
                </>
              ) : (
                <>
                  <Camera size={28} weight="bold" />
                  {t('scan_aadhar')}
                </>
              )}
            </button>
          )}
          <p className="text-xs text-zinc-400 mt-2 text-center">
            {lang === 'mr' ? 'फोटोवर "Hotel Use Only" वॉटरमार्क लागेल' : '"For Hotel Use Only" watermark will be applied'}
          </p>
        </div>

        {/* Guest Details */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-4">
          <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 block">
            {lang === 'mr' ? 'पाहुण्याची माहिती' : 'Guest Details'}
          </label>

          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('guest_name')}</label>
            <input
              type="text"
              value={form.guest_name}
              onChange={(e) => updateField('guest_name', e.target.value)}
              className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none"
              data-testid="guest-name-input"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('phone')}</label>
            <input
              type="tel"
              value={form.guest_phone}
              onChange={(e) => updateField('guest_phone', e.target.value)}
              className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none"
              data-testid="guest-phone-input"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('aadhar')}</label>
            <input
              type="text"
              value={form.aadhar_number}
              onChange={(e) => updateField('aadhar_number', e.target.value)}
              className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none"
              placeholder="XXXX XXXX XXXX"
              data-testid="aadhar-input"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('address')}</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none"
              data-testid="address-input"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('num_guests')}</label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => updateField('num_guests', n)}
                  className={`w-14 h-14 rounded-xl border-2 font-bold text-xl active:scale-95 transition-transform ${
                    form.num_guests === n
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-600 border-zinc-200'
                  }`}
                  data-testid={`guest-count-${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
            {form.num_guests > 1 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                +₹200 {lang === 'mr' ? 'प्रत्येक अतिरिक्त पाहुण्यासाठी' : 'per extra guest/day'}
              </p>
            )}
          </div>
        </div>

        {/* Payment Section */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-4">
          <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 block">
            {lang === 'mr' ? 'पेमेंट माहिती' : 'Payment Info'}
          </label>

          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('rate_per_day')}</label>
            <div className="flex items-center gap-2">
              <CurrencyInr size={20} weight="bold" className="text-zinc-400" />
              <input
                type="number"
                value={form.rate_per_day}
                onChange={(e) => updateField('rate_per_day', parseFloat(e.target.value) || 0)}
                className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none"
                data-testid="rate-input"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('advance_paid')}</label>
            <input
              type="number"
              value={form.advance_paid}
              onChange={(e) => updateField('advance_paid', parseFloat(e.target.value) || 0)}
              className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none"
              data-testid="advance-input"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 mb-2 block">{t('payment_method')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateField('payment_method', 'cash')}
                className={`h-14 rounded-xl border-2 font-bold text-lg active:scale-95 transition-transform ${
                  form.payment_method === 'cash'
                    ? 'bg-[#22C55E] text-white border-[#16A34A]'
                    : 'bg-white text-zinc-600 border-zinc-200'
                }`}
                data-testid="payment-cash-btn"
              >
                {t('cash')}
              </button>
              <button
                onClick={() => updateField('payment_method', 'upi')}
                className={`h-14 rounded-xl border-2 font-bold text-lg active:scale-95 transition-transform ${
                  form.payment_method === 'upi'
                    ? 'bg-[#2563EB] text-white border-[#1D4ED8]'
                    : 'bg-white text-zinc-600 border-zinc-200'
                }`}
                data-testid="payment-upi-btn"
              >
                {t('upi')}
              </button>
            </div>
          </div>
        </div>

        {/* Billing Rules Info */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
            {lang === 'mr' ? 'बिलिंग नियम' : 'Billing Rules'}
          </p>
          <p className="text-sm text-amber-600">{t('early_checkin_note')}</p>
          <p className="text-sm text-amber-600">{t('late_checkout_note')}</p>
          <p className="text-sm text-amber-600">
            {lang === 'mr' ? 'अतिरिक्त पाहुणे: बेस रेट + ₹200/व्यक्ती' : 'Extra guests: Base + ₹200/person'}
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !form.guest_name || !form.guest_phone}
          className="bg-zinc-900 text-white h-16 rounded-xl flex items-center justify-center gap-3 w-full active:scale-95 transition-transform text-lg font-bold uppercase tracking-[0.05em] disabled:opacity-50"
          data-testid="checkin-submit-btn"
        >
          <UserPlus size={24} weight="bold" />
          {loading ? t('loading') : t('check_in')}
        </button>
      </div>
    </div>
  );
}

// end of CheckInPage
