import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Broom, User, CheckCircle, ArrowRight, Warning } from '@phosphor-icons/react';

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [pressedRoom, setPressedRoom] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const fetchRooms = useCallback(async () => {
    try {
      const { data } = await api.get('/rooms');
      setRooms(data);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchRooms]);

  const handleRoomTap = (room) => {
    if (room.status === 'clean') {
      navigate(`/checkin/${room.room_number}`);
    } else if (room.status === 'occupied') {
      navigate(`/room/${room.room_number}`);
    }
  };

  const handleLongPressStart = (room) => {
    if (room.status !== 'cleaning') return;
    setPressedRoom(room.room_number);
    const timer = setTimeout(async () => {
      try {
        await api.put(`/rooms/${room.room_number}`, { status: 'clean' });
        fetchRooms();
      } catch (err) {
        console.error('Failed to update room', err);
      }
      setPressedRoom(null);
    }, 1000);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setPressedRoom(null);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'clean':
        return {
          bg: 'bg-[#DCFCE7]', border: 'border-[#16A34A]', text: 'text-[#14532D]',
          dotBg: 'bg-[#22C55E]', icon: <CheckCircle size={28} weight="bold" />,
          label: t('clean')
        };
      case 'occupied':
        return {
          bg: 'bg-[#FEE2E2]', border: 'border-[#DC2626]', text: 'text-[#7F1D1D]',
          dotBg: 'bg-[#EF4444]', icon: <User size={28} weight="bold" />,
          label: t('occupied')
        };
      case 'cleaning':
        return {
          bg: 'bg-[#FEF3C7]', border: 'border-[#D97706]', text: 'text-[#78350F]',
          dotBg: 'bg-[#F59E0B]', icon: <Broom size={28} weight="bold" />,
          label: t('cleaning')
        };
      default:
        return {
          bg: 'bg-zinc-100', border: 'border-zinc-300', text: 'text-zinc-700',
          dotBg: 'bg-zinc-400', icon: null, label: status
        };
    }
  };

  const stats = {
    total: rooms.length,
    clean: rooms.filter(r => r.status === 'clean').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
        <p className="text-xl font-bold text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="pb-24" data-testid="dashboard-page">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-[#F59E0B] text-[#78350F] px-4 py-3 flex items-center gap-2 font-bold text-sm" data-testid="offline-banner">
          <Warning size={20} weight="bold" />
          {t('offline_warning')}
        </div>
      )}

      {/* Header */}
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
              {t('digital_register')}
            </h1>
            <p className="text-zinc-500 text-sm font-medium">
              {t('welcome')}, {user?.name || 'User'}
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3 mb-6" data-testid="stats-bar">
          <div className="bg-[#DCFCE7] border-2 border-[#16A34A] rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-[#14532D]">{stats.clean}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#14532D]/70">{t('available')}</div>
          </div>
          <div className="bg-[#FEE2E2] border-2 border-[#DC2626] rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-[#7F1D1D]">{stats.occupied}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#7F1D1D]/70">{t('occupied')}</div>
          </div>
          <div className="bg-[#FEF3C7] border-2 border-[#D97706] rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-[#78350F]">{stats.cleaning}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#78350F]/70">{t('cleaning')}</div>
          </div>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4" data-testid="room-grid">
          {rooms.map((room) => {
            const config = getStatusConfig(room.status);
            const isPressed = pressedRoom === room.room_number;
            return (
              <button
                key={room.room_number}
                data-testid={`room-${room.room_number}-card`}
                onClick={() => handleRoomTap(room)}
                onTouchStart={() => handleLongPressStart(room)}
                onTouchEnd={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(room)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                className={`
                  ${config.bg} ${config.text} border-2 ${config.border}
                  rounded-2xl flex flex-col items-center justify-center
                  min-h-[120px] transition-all duration-150 ease-out
                  active:scale-95 select-none relative overflow-hidden
                  ${isPressed ? 'scale-90 opacity-70' : ''}
                `}
              >
                {/* Room Number */}
                <span className="text-2xl md:text-3xl font-black tracking-tight">
                  {room.room_number}
                </span>

                {/* Status Icon */}
                <div className="my-1">{config.icon}</div>

                {/* Status Label */}
                <span className="text-xs font-bold uppercase tracking-wider">
                  {config.label}
                </span>

                {/* Room Type Badge */}
                {room.room_type === 'deluxe' && (
                  <span className="absolute top-1 right-1 text-[10px] font-bold bg-black/10 px-1.5 py-0.5 rounded">
                    {t('deluxe')}
                  </span>
                )}

                {/* Rate */}
                <span className="text-[10px] font-medium opacity-70 mt-0.5">
                  ₹{room.rate}
                </span>

                {/* Long press hint for cleaning rooms */}
                {room.status === 'cleaning' && (
                  <span className="text-[9px] opacity-60 mt-0.5">
                    {t('long_press_to_clean')}
                  </span>
                )}

                {/* Tap arrow for clean/occupied */}
                {(room.status === 'clean' || room.status === 'occupied') && (
                  <div className="absolute bottom-1 right-1 opacity-30">
                    <ArrowRight size={14} weight="bold" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
