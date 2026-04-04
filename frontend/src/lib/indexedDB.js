// IndexedDB helper for offline support using Dexie
import Dexie from 'dexie';

const db = new Dexie('DigitalRegisterDB');

db.version(1).stores({
  rooms: 'room_number, status, floor, room_type',
  bookings: 'booking_id, room_number, status, guest_name',
  transactions: 'transaction_id, booking_id, type, timestamp',
  expenses: 'expense_id, category, timestamp',
  pendingActions: '++id, action, data, timestamp',
  cache: 'key, data, timestamp'
});

// Cache API responses for offline use
export async function cacheData(key, data) {
  try {
    await db.cache.put({ key, data: JSON.stringify(data), timestamp: Date.now() });
  } catch (err) {
    console.error('Cache write error:', err);
  }
}

export async function getCachedData(key, maxAgeMs = 300000) {
  try {
    const entry = await db.cache.get(key);
    if (entry && (Date.now() - entry.timestamp) < maxAgeMs) {
      return JSON.parse(entry.data);
    }
    return null;
  } catch {
    return null;
  }
}

// Store rooms locally
export async function cacheRooms(rooms) {
  try {
    await db.rooms.clear();
    await db.rooms.bulkPut(rooms);
  } catch (err) {
    console.error('Room cache error:', err);
  }
}

export async function getCachedRooms() {
  try {
    return await db.rooms.toArray();
  } catch {
    return [];
  }
}

// Queue offline actions for later sync
export async function queueOfflineAction(action, data) {
  try {
    await db.pendingActions.add({
      action,
      data: JSON.stringify(data),
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Queue action error:', err);
  }
}

export async function getPendingActions() {
  try {
    return await db.pendingActions.toArray();
  } catch {
    return [];
  }
}

export async function clearPendingAction(id) {
  try {
    await db.pendingActions.delete(id);
  } catch (err) {
    console.error('Clear action error:', err);
  }
}

export async function syncPendingActions(apiInstance) {
  const actions = await getPendingActions();
  for (const action of actions) {
    try {
      const data = JSON.parse(action.data);
      if (action.action === 'checkin') {
        await apiInstance.post('/bookings/checkin', data);
      } else if (action.action === 'checkout') {
        await apiInstance.post('/bookings/checkout', data);
      } else if (action.action === 'expense') {
        await apiInstance.post('/expenses', data);
      } else if (action.action === 'room_status') {
        await apiInstance.put(`/rooms/${data.room_number}`, { status: data.status });
      }
      await clearPendingAction(action.id);
    } catch (err) {
      console.error('Sync failed for action:', action, err);
      break;
    }
  }
}

export default db;
