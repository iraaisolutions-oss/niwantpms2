import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { Camera, UserPlus, ArrowLeft, IdentificationCard, CurrencyInr, CopySimple, Plus, X, PencilLine } from '@phosphor-icons/react';

function SignaturePad({ onSave, lang }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => { e.preventDefault(); setDrawing(true); setHasDrawn(true); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
  const draw = (e) => { e.preventDefault(); if (!drawing) return; const ctx = canvasRef.current.getContext('2d'); const p = getPos(e); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#000'; ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const endDraw = () => { setDrawing(false); };
  const clear = () => { const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); setHasDrawn(false); };
  const save = () => { if (hasDrawn) onSave(canvasRef.current.toDataURL('image/png')); };

  return (
    <div className="space-y-2" data-testid="signature-pad">
      <canvas ref={canvasRef} width={300} height={120}
        className="w-full border-2 border-zinc-200 rounded-xl bg-white touch-none"
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
      <div className="flex gap-2">
        <button onClick={clear} className="flex-1 h-10 rounded-lg border border-zinc-200 text-sm font-bold text-zinc-500 active:scale-95" data-testid="sig-clear">{lang === 'mr' ? 'पुसा' : 'Clear'}</button>
        <button onClick={save} disabled={!hasDrawn} className="flex-1 h-10 rounded-lg bg-zinc-900 text-white text-sm font-bold active:scale-95 disabled:opacity-50" data-testid="sig-save">{lang === 'mr' ? 'सही सेव्ह' : 'Save Signature'}</button>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { roomNumber } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState(null);
  const [aadharCaptured, setAadharCaptured] = useState(false);
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [channels, setChannels] = useState([]);
  const [errors, setErrors] = useState({});
  const [sameAsMobile, setSameAsMobile] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const [form, setForm] = useState({
    guest_name: '', guest_phone: '', whatsapp_number: '', aadhar_number: '', address: '',
    nationality: 'Indian', num_guests: 1, rate_per_day: 0, advance_paid: 0,
    payment_method: 'cash', id_type: 'Aadhar', source_channel: 'walk-in',
    face_photo: null, aadhar_photo: null, signature: null, additional_guests: []
  });

  useEffect(() => { fetchRoom(); fetchChannels(); return () => stopCamera(); }, [roomNumber]);

  const fetchRoom = async () => { try { const { data } = await api.get(`/rooms/${roomNumber}`); setRoom(data); setForm(prev => ({ ...prev, rate_per_day: data.rate || 600 })); } catch (err) { console.error(err); } };
  const fetchChannels = async () => { try { const { data } = await api.get('/channels'); setChannels(data.filter(c => c.is_active)); } catch (err) {} };

  const startCamera = async (mode) => {
    setCameraMode(mode); setShowCamera(true);
    try {
      const facingMode = mode === 'face' ? 'user' : 'environment';
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert(lang === 'mr' ? 'कॅमेरा उपलब्ध नाही' : 'Camera not available');
      stopCamera();
    }
  };

  const stopCamera = () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); setShowCamera(false); setCameraMode(null); };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) { stopCamera(); return; }
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (cameraMode === 'aadhar') {
      canvas.width = 640; canvas.height = 480;
      canvas.getContext('2d').drawImage(video, 0, 0, 640, 480);
      const imgB64 = canvas.toDataURL('image/jpeg', 0.8);
      setForm(prev => ({ ...prev, aadhar_photo: imgB64 }));
      stopCamera();
      runAIocr(imgB64);
    } else if (cameraMode === 'face') {
      canvas.width = 320; canvas.height = 240;
      canvas.getContext('2d').drawImage(video, 0, 0, 320, 240);
      setForm(prev => ({ ...prev, face_photo: canvas.toDataURL('image/jpeg', 0.7) }));
      setFaceCaptured(true);
      stopCamera();
    }
  };

  const runAIocr = async (imageBase64) => {
    setOcrProcessing(true);
    try {
      const { data } = await api.post('/ocr/aadhar', { image_base64: imageBase64 });
      if (data.success && data.data) {
        setForm(prev => ({ ...prev, guest_name: data.data.name || prev.guest_name, aadhar_number: data.data.aadhar_number || prev.aadhar_number, address: data.data.address || prev.address }));
        setAadharCaptured(true);
      } else { alert(lang === 'mr' ? 'OCR अयशस्वी - व्यक्तिचलितपणे भरा' : 'OCR failed - enter manually'); }
    } catch (err) { alert(lang === 'mr' ? 'OCR त्रुटी' : 'OCR error - enter manually'); }
    finally { setOcrProcessing(false); }
  };

  const validate = () => {
    const e = {};
    if (!form.guest_name || form.guest_name.trim().length < 2) e.guest_name = lang === 'mr' ? 'नाव आवश्यक (किमान 2 अक्षरे)' : 'Name required (min 2 chars)';
    const phoneDigits = (form.guest_phone || '').replace(/\D/g, '');
    if (phoneDigits.length !== 10) e.guest_phone = lang === 'mr' ? 'फोन 10 अंकी असावा' : 'Phone must be 10 digits';
    if (form.aadhar_number) {
      const aadharDigits = form.aadhar_number.replace(/\D/g, '');
      if (aadharDigits.length !== 12) e.aadhar_number = lang === 'mr' ? 'आधार 12 अंकी असावा' : 'Aadhar must be 12 digits';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addGuest = () => { setForm(prev => ({ ...prev, additional_guests: [...prev.additional_guests, { name: '', phone: '' }] })); };
  const removeGuest = (idx) => { setForm(prev => ({ ...prev, additional_guests: prev.additional_guests.filter((_, i) => i !== idx) })); };
  const updateGuest = (idx, field, val) => {
    setForm(prev => ({ ...prev, additional_guests: prev.additional_guests.map((g, i) => i === idx ? { ...g, [field]: val } : g) }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/bookings/checkin', {
        room_number: parseInt(roomNumber), ...form,
        whatsapp_number: sameAsMobile ? form.guest_phone : (form.whatsapp_number || form.guest_phone)
      });
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.detail || 'Check-in failed');
    } finally { setLoading(false); }
  };

  const updateField = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); if (errors[field]) setErrors(prev => ({ ...prev, [field]: null })); };

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="checkin-page">
      <canvas ref={canvasRef} className="hidden" />

      <div className="bg-white/90 backdrop-blur-xl border-b border-zinc-200 p-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="w-12 h-12 rounded-xl border-2 border-zinc-200 flex items-center justify-center active:scale-95" data-testid="checkin-back-btn"><ArrowLeft size={24} weight="bold" /></button>
        <div>
          <h1 className="font-heading text-xl font-bold">{t('check_in')} — {t('room_number')} {roomNumber}</h1>
          {room && <p className="text-sm text-zinc-500">{room.room_type === 'ac_deluxe' ? 'AC Deluxe' : room.room_type === 'deluxe' ? 'Deluxe' : 'Standard'} · ₹{room.rate}/{lang === 'mr' ? 'दिवस' : 'day'}</p>}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Booking Source */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
          <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3 block">{lang === 'mr' ? 'बुकिंग स्रोत' : 'Booking Source'}</label>
          <div className="flex flex-wrap gap-2" data-testid="channel-selector">
            <button onClick={() => updateField('source_channel', 'walk-in')} className={`px-4 h-11 rounded-xl border-2 font-bold text-sm active:scale-95 ${form.source_channel === 'walk-in' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200'}`} data-testid="source-walkin">Walk-in</button>
            {channels.map(ch => (
              <button key={ch.channel_id} onClick={() => updateField('source_channel', ch.channel_id)} className={`px-4 h-11 rounded-xl border-2 font-bold text-sm active:scale-95 ${form.source_channel === ch.channel_id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200'}`}>{ch.name}</button>
            ))}
          </div>
        </div>

        {/* Camera View */}
        {showCamera && (
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500">{cameraMode === 'face' ? (lang === 'mr' ? 'फोटो काढा' : 'Face Photo') : t('scan_aadhar')}</label>
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video"><video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /></div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={capturePhoto} className="h-14 rounded-xl bg-[#22C55E] text-white font-bold flex items-center justify-center gap-2 active:scale-95" data-testid="capture-btn"><Camera size={20} weight="bold" /> {t('capture_photo')}</button>
              <button onClick={stopCamera} className="h-14 rounded-xl border-2 border-zinc-200 font-bold active:scale-95" data-testid="cancel-camera-btn">{t('cancel')}</button>
            </div>
          </div>
        )}

        {/* Aadhar + Face Buttons */}
        {!showCamera && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-3">
              {ocrProcessing ? (
                <div className="h-20 rounded-xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /><span className="text-sm font-bold text-blue-700">OCR...</span></div>
              ) : (
                <button onClick={() => startCamera('aadhar')} className={`w-full h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 font-bold active:scale-95 ${aadharCaptured ? 'border-[#16A34A] bg-[#DCFCE7] text-[#14532D]' : 'border-zinc-300 bg-zinc-50 text-zinc-600'}`} data-testid="start-aadhar-btn">
                  <IdentificationCard size={24} weight="bold" /><span className="text-xs">{aadharCaptured ? (lang === 'mr' ? 'आधार स्कॅन' : 'Scanned') : (lang === 'mr' ? 'आधार स्कॅन' : 'Scan Aadhar')}</span>
                </button>
              )}
            </div>
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-3">
              {faceCaptured && form.face_photo ? (
                <div className="relative h-20 rounded-xl overflow-hidden border-2 border-[#16A34A]"><img src={form.face_photo} alt="Face" className="w-full h-full object-cover" /><button onClick={() => { setFaceCaptured(false); updateField('face_photo', null); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold">X</button></div>
              ) : (
                <button onClick={() => startCamera('face')} className="w-full h-20 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-600 flex flex-col items-center justify-center gap-1 font-bold active:scale-95" data-testid="start-face-btn"><Camera size={24} weight="bold" /><span className="text-xs">{lang === 'mr' ? 'फोटो' : 'Face Photo'}</span></button>
              )}
            </div>
          </div>
        )}

        {/* Guest Details */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3">
          <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 block">{lang === 'mr' ? 'पाहुण्याची माहिती' : 'Guest Details'}</label>
          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('guest_name')} *</label>
            <input type="text" value={form.guest_name} onChange={e => updateField('guest_name', e.target.value)}
              className={`w-full h-14 px-4 rounded-xl border-2 text-lg font-medium focus:outline-none ${errors.guest_name ? 'border-red-400 focus:border-red-500' : 'border-zinc-200 focus:border-zinc-900'}`} data-testid="guest-name-input" />
            {errors.guest_name && <p className="text-xs text-red-500 mt-1 font-bold">{errors.guest_name}</p>}
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'प्राथमिक फोन' : 'Primary Phone'} *</label>
            <input type="tel" value={form.guest_phone} onChange={e => updateField('guest_phone', e.target.value)} maxLength={10}
              className={`w-full h-14 px-4 rounded-xl border-2 text-lg font-medium focus:outline-none ${errors.guest_phone ? 'border-red-400 focus:border-red-500' : 'border-zinc-200 focus:border-zinc-900'}`} data-testid="guest-phone-input" />
            {errors.guest_phone && <p className="text-xs text-red-500 mt-1 font-bold">{errors.guest_phone}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-zinc-400">{lang === 'mr' ? 'WhatsApp नंबर' : 'WhatsApp Number'}</label>
              <label className="flex items-center gap-2 cursor-pointer" data-testid="same-as-mobile">
                <input type="checkbox" checked={sameAsMobile} onChange={e => { setSameAsMobile(e.target.checked); if (e.target.checked) updateField('whatsapp_number', form.guest_phone); }}
                  className="w-5 h-5 rounded border-2 border-zinc-300" />
                <span className="text-xs font-bold text-zinc-500">{lang === 'mr' ? 'मोबाइल सारखाच' : 'Same as Mobile'}</span>
              </label>
            </div>
            {!sameAsMobile && (
              <input type="tel" value={form.whatsapp_number} onChange={e => updateField('whatsapp_number', e.target.value)}
                placeholder={lang === 'mr' ? 'वेगळा असल्यास भरा' : 'If different from primary'}
                className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none" data-testid="whatsapp-number-input" />
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('aadhar')} *</label>
            <input type="text" value={form.aadhar_number} onChange={e => updateField('aadhar_number', e.target.value)}
              className={`w-full h-14 px-4 rounded-xl border-2 text-lg font-medium focus:outline-none ${errors.aadhar_number ? 'border-red-400 focus:border-red-500' : 'border-zinc-200 focus:border-zinc-900'}`} placeholder="XXXX XXXX XXXX" data-testid="aadhar-input" />
            {errors.aadhar_number && <p className="text-xs text-red-500 mt-1 font-bold">{errors.aadhar_number}</p>}
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('address')}</label>
            <input type="text" value={form.address} onChange={e => updateField('address', e.target.value)}
              className="w-full h-14 px-4 rounded-xl border-2 border-zinc-200 text-lg font-medium focus:border-zinc-900 focus:outline-none" data-testid="address-input" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('num_guests')}</label>
            <div className="flex items-center gap-3">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => updateField('num_guests', n)} className={`w-14 h-14 rounded-xl border-2 font-bold text-xl active:scale-95 ${form.num_guests === n ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200'}`} data-testid={`guest-count-${n}`}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Guests */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500">{lang === 'mr' ? 'अतिरिक्त पाहुणे' : 'Additional Guests'}</label>
            <button onClick={addGuest} className="h-8 px-3 rounded-lg bg-zinc-900 text-white text-xs font-bold flex items-center gap-1 active:scale-95" data-testid="add-guest-btn"><Plus size={12} weight="bold" /> {lang === 'mr' ? 'जोडा' : 'Add'}</button>
          </div>
          {form.additional_guests.map((g, i) => (
            <div key={i} className="flex gap-2 items-start" data-testid={`additional-guest-${i}`}>
              <div className="flex-1 space-y-2">
                <input type="text" value={g.name} onChange={e => updateGuest(i, 'name', e.target.value)} placeholder={lang === 'mr' ? 'नाव' : 'Name'}
                  className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-medium focus:border-zinc-900 focus:outline-none" data-testid={`extra-guest-name-${i}`} />
                <input type="tel" value={g.phone} onChange={e => updateGuest(i, 'phone', e.target.value)} placeholder={lang === 'mr' ? 'फोन' : 'Phone'}
                  className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-medium focus:border-zinc-900 focus:outline-none" data-testid={`extra-guest-phone-${i}`} />
              </div>
              <button onClick={() => removeGuest(i)} className="w-10 h-10 rounded-xl border-2 border-red-200 flex items-center justify-center active:scale-95 mt-1"><X size={16} weight="bold" className="text-red-500" /></button>
            </div>
          ))}
          {form.additional_guests.length === 0 && <p className="text-xs text-zinc-400">{lang === 'mr' ? 'ग्रुपसाठी अतिरिक्त पाहुण्यांची माहिती जोडा' : 'Add extra guest details for groups'}</p>}
        </div>

        {/* Signature */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4">
          <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 mb-3 flex items-center gap-1 block">
            <PencilLine size={14} weight="bold" /> {lang === 'mr' ? 'सही' : 'Signature'}
          </label>
          {signatureSaved && form.signature ? (
            <div className="relative">
              <img src={form.signature} alt="Signature" className="w-full h-20 object-contain border-2 border-[#16A34A] rounded-xl bg-white" data-testid="signature-preview" />
              <button onClick={() => { setSignatureSaved(false); updateField('signature', null); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold">X</button>
            </div>
          ) : (
            <SignaturePad lang={lang} onSave={(sig) => { updateField('signature', sig); setSignatureSaved(true); }} />
          )}
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3">
          <label className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500 block">{lang === 'mr' ? 'पेमेंट' : 'Payment'}</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('rate_per_day')}</label>
              <input type="number" value={form.rate_per_day} onChange={e => updateField('rate_per_day', parseFloat(e.target.value) || 0)}
                className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="rate-input" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 mb-1 block">{t('advance_paid')}</label>
              <input type="number" value={form.advance_paid} onChange={e => updateField('advance_paid', parseFloat(e.target.value) || 0)}
                className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="advance-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => updateField('payment_method', 'cash')} className={`h-12 rounded-xl border-2 font-bold active:scale-95 ${form.payment_method === 'cash' ? 'bg-[#22C55E] text-white border-[#16A34A]' : 'bg-white text-zinc-600 border-zinc-200'}`} data-testid="payment-cash-btn">{t('cash')}</button>
            <button onClick={() => updateField('payment_method', 'upi')} className={`h-12 rounded-xl border-2 font-bold active:scale-95 ${form.payment_method === 'upi' ? 'bg-[#2563EB] text-white border-[#1D4ED8]' : 'bg-white text-zinc-600 border-zinc-200'}`} data-testid="payment-upi-btn">{t('upi')}</button>
          </div>
        </div>

        {/* Rules + WhatsApp Info */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
          <p className="text-xs font-bold text-amber-700">{lang === 'mr' ? 'चेक-इन/आउट: 12 PM · 24h+ = पूर्ण दिवस · लवकर आगमन = ₹500' : 'Check-in/out: 12 PM · 24h+ overstay = full day · Early = ₹500'}</p>
        </div>
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-3">
          <p className="text-xs font-bold text-green-700">{lang === 'mr' ? 'स्वागत + WiFi + नियम WhatsApp वर पाठवले जातील' : 'Welcome + WiFi + Rules auto-sent via WhatsApp'}</p>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading} className="bg-zinc-900 text-white h-16 rounded-xl flex items-center justify-center gap-3 w-full active:scale-95 text-lg font-bold uppercase tracking-[0.05em] disabled:opacity-50" data-testid="checkin-submit-btn">
          <UserPlus size={24} weight="bold" /> {loading ? t('loading') : t('check_in')}
        </button>
      </div>
    </div>
  );
}
