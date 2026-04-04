import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, Plus, PencilSimple, Trash, FloppyDisk, X } from '@phosphor-icons/react';

export default function RoomManagementPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ room_number: '', floor: 1, room_type: 'standard', rate: 1000 });
  const [editForm, setEditForm] = useState({});

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/rooms');
      setRooms(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!addForm.room_number) return;
    try {
      await api.post('/rooms/manage', { ...addForm, room_number: parseInt(addForm.room_number), rate: parseFloat(addForm.rate) });
      setShowAdd(false);
      setAddForm({ room_number: '', floor: 1, room_type: 'standard', rate: 1000 });
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add room');
    }
  };

  const handleEdit = async (roomNumber) => {
    try {
      const payload = {};
      if (editForm.floor !== undefined) payload.floor = parseInt(editForm.floor);
      if (editForm.room_type) payload.room_type = editForm.room_type;
      if (editForm.rate !== undefined) payload.rate = parseFloat(editForm.rate);
      if (editForm.new_room_number && parseInt(editForm.new_room_number) !== roomNumber) {
        payload.new_room_number = parseInt(editForm.new_room_number);
      }
      await api.put(`/rooms/manage/${roomNumber}`, payload);
      setEditingRoom(null);
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to edit room');
    }
  };

  const handleDelete = async (roomNumber) => {
    if (!window.confirm(lang === 'mr' ? `रूम ${roomNumber} हटवायचा?` : `Delete room ${roomNumber}?`)) return;
    try {
      await api.delete(`/rooms/manage/${roomNumber}`);
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete room');
    }
  };

  const startEdit = (room) => {
    setEditingRoom(room.room_number);
    setEditForm({ new_room_number: room.room_number, floor: room.floor, room_type: room.room_type, rate: room.rate });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-24" data-testid="room-management-page">
      <div className="bg-white/90 backdrop-blur-xl border-b border-zinc-200 p-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/menu')} className="w-12 h-12 rounded-xl border-2 border-zinc-200 flex items-center justify-center active:scale-95 transition-transform" data-testid="room-mgmt-back-btn">
          <ArrowLeft size={24} weight="bold" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight">{lang === 'mr' ? 'रूम व्यवस्थापन' : 'Room Management'}</h1>
          <p className="text-sm text-zinc-500">{rooms.length} {lang === 'mr' ? 'रूम्स' : 'rooms'}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Add Room Button */}
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-full h-14 rounded-xl bg-zinc-900 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          data-testid="add-room-btn"
        >
          <Plus size={20} weight="bold" />
          {lang === 'mr' ? 'नवीन रूम जोडा' : 'Add New Room'}
        </button>

        {/* Add Room Form */}
        {showAdd && (
          <div className="bg-white rounded-2xl border-2 border-zinc-900 p-4 space-y-3" data-testid="add-room-form">
            <p className="text-xs uppercase tracking-[0.1em] font-bold text-zinc-500">{lang === 'mr' ? 'नवीन रूम' : 'New Room'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'रूम नंबर' : 'Room No.'}</label>
                <input type="number" value={addForm.room_number} onChange={e => setAddForm(p => ({...p, room_number: e.target.value}))}
                  className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="add-room-number" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'मजला' : 'Floor'}</label>
                <input type="number" value={addForm.floor} onChange={e => setAddForm(p => ({...p, floor: parseInt(e.target.value) || 1}))}
                  className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="add-room-floor" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'प्रकार' : 'Type'}</label>
                <select value={addForm.room_type} onChange={e => setAddForm(p => ({...p, room_type: e.target.value}))}
                  className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none bg-white" data-testid="add-room-type">
                  <option value="standard">{lang === 'mr' ? 'स्टँडर्ड' : 'Standard'}</option>
                  <option value="deluxe">{lang === 'mr' ? 'डिलक्स' : 'Deluxe'}</option>
                  <option value="suite">{lang === 'mr' ? 'सुइट' : 'Suite'}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'दर' : 'Rate'}</label>
                <input type="number" value={addForm.rate} onChange={e => setAddForm(p => ({...p, rate: e.target.value}))}
                  className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="add-room-rate" />
              </div>
            </div>
            <button onClick={handleAdd} className="w-full h-12 rounded-xl bg-[#22C55E] text-white font-bold active:scale-95 transition-transform" data-testid="submit-add-room">
              {lang === 'mr' ? 'रूम जोडा' : 'Add Room'}
            </button>
          </div>
        )}

        {/* Rooms List */}
        <div className="space-y-3">
          {rooms.map(room => (
            <div key={room.room_number} className="bg-white rounded-2xl border-2 border-zinc-200 p-4" data-testid={`manage-room-${room.room_number}`}>
              {editingRoom === room.room_number ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'रूम नं.' : 'Room No.'}</label>
                      <input type="number" value={editForm.new_room_number} onChange={e => setEditForm(p => ({...p, new_room_number: e.target.value}))}
                        className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="edit-room-number" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'मजला' : 'Floor'}</label>
                      <input type="number" value={editForm.floor} onChange={e => setEditForm(p => ({...p, floor: e.target.value}))}
                        className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="edit-room-floor" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'प्रकार' : 'Type'}</label>
                      <select value={editForm.room_type} onChange={e => setEditForm(p => ({...p, room_type: e.target.value}))}
                        className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none bg-white" data-testid="edit-room-type">
                        <option value="standard">{lang === 'mr' ? 'स्टँडर्ड' : 'Standard'}</option>
                        <option value="deluxe">{lang === 'mr' ? 'डिलक्स' : 'Deluxe'}</option>
                        <option value="suite">{lang === 'mr' ? 'सुइट' : 'Suite'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-400 mb-1 block">{lang === 'mr' ? 'दर' : 'Rate'}</label>
                      <input type="number" value={editForm.rate} onChange={e => setEditForm(p => ({...p, rate: e.target.value}))}
                        className="w-full h-12 px-3 rounded-xl border-2 border-zinc-200 font-bold focus:border-zinc-900 focus:outline-none" data-testid="edit-room-rate" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleEdit(room.room_number)} className="h-12 rounded-xl bg-[#22C55E] text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform" data-testid="save-room-edit">
                      <FloppyDisk size={18} weight="bold" /> {lang === 'mr' ? 'सेव्ह' : 'Save'}
                    </button>
                    <button onClick={() => setEditingRoom(null)} className="h-12 rounded-xl border-2 border-zinc-200 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform" data-testid="cancel-room-edit">
                      <X size={18} weight="bold" /> {lang === 'mr' ? 'रद्द' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl ${
                      room.status === 'occupied' ? 'bg-red-100 text-red-700' :
                      room.status === 'cleaning' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {room.room_number}
                    </div>
                    <div>
                      <p className="font-bold">{lang === 'mr' ? 'मजला' : 'Floor'} {room.floor} · {room.room_type === 'deluxe' ? (lang === 'mr' ? 'डिलक्स' : 'Deluxe') : room.room_type === 'suite' ? (lang === 'mr' ? 'सुइट' : 'Suite') : (lang === 'mr' ? 'स्टँडर्ड' : 'Standard')}</p>
                      <p className="text-sm text-zinc-500">₹{room.rate}/{lang === 'mr' ? 'दिवस' : 'day'} · {room.status}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(room)} className="w-10 h-10 rounded-xl border-2 border-zinc-200 flex items-center justify-center active:scale-95 transition-transform" data-testid={`edit-room-${room.room_number}`}>
                      <PencilSimple size={18} weight="bold" className="text-zinc-500" />
                    </button>
                    {room.status !== 'occupied' && (
                      <button onClick={() => handleDelete(room.room_number)} className="w-10 h-10 rounded-xl border-2 border-red-200 flex items-center justify-center active:scale-95 transition-transform" data-testid={`delete-room-${room.room_number}`}>
                        <Trash size={18} weight="bold" className="text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
