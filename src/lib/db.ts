import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CheckinDB extends DBSchema {
  guests: {
    key: string;
    value: {
      id: string;
      name: string;
      email: string;
      status: string;
      checked_in_at: string | null;
    };
    indexes: { 'by-email': string };
  };
  outbox_checkins: {
    key: string;
    value: {
      id: string;
      guest_id: string;
      guest_email: string;
      checked_in_at: string;
      performed_by: string;
      source: 'offline' | 'online';
      synced: boolean;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<CheckinDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<CheckinDB>('checkin-db', 1, {
      upgrade(db) {
        // Create guests store
        if (!db.objectStoreNames.contains('guests')) {
          const guestStore = db.createObjectStore('guests', { keyPath: 'id' });
          guestStore.createIndex('by-email', 'email', { unique: false });
        }

        // Create outbox store for pending check-ins
        if (!db.objectStoreNames.contains('outbox_checkins')) {
          db.createObjectStore('outbox_checkins', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// Guest operations
export const saveGuests = async (guests: any[]) => {
  const db = await getDB();
  const tx = db.transaction('guests', 'readwrite');
  await Promise.all(guests.map(guest => tx.store.put(guest)));
  await tx.done;
};

export const getGuests = async () => {
  const db = await getDB();
  return db.getAll('guests');
};

export const getGuestByEmail = async (email: string) => {
  const db = await getDB();
  return db.getFromIndex('guests', 'by-email', email);
};

export const updateGuestCheckin = async (guestId: string, checked_in_at: string) => {
  const db = await getDB();
  const guest = await db.get('guests', guestId);
  if (guest) {
    guest.checked_in_at = checked_in_at;
    guest.status = 'confirmed';
    await db.put('guests', guest);
  }
};

// Outbox operations
export const addToOutbox = async (checkin: Omit<CheckinDB['outbox_checkins']['value'], 'id' | 'synced'>) => {
  const db = await getDB();
  const id = `${checkin.guest_id}-${Date.now()}`;
  await db.add('outbox_checkins', {
    ...checkin,
    id,
    synced: false,
  });
  return id;
};

export const getPendingCheckins = async () => {
  const db = await getDB();
  const all = await db.getAll('outbox_checkins');
  return all.filter(item => !item.synced);
};

export const markCheckinSynced = async (id: string) => {
  const db = await getDB();
  const checkin = await db.get('outbox_checkins', id);
  if (checkin) {
    checkin.synced = true;
    await db.put('outbox_checkins', checkin);
  }
};

export const removeFromOutbox = async (id: string) => {
  const db = await getDB();
  await db.delete('outbox_checkins', id);
};

export const clearOutbox = async () => {
  const db = await getDB();
  await db.clear('outbox_checkins');
};
