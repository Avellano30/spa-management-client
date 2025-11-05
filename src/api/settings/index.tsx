const endpoint = import.meta.env.VITE_ENDPOINT || 'http://localhost:3000';

export interface SpaSettings {
  _id?: string;
  totalRooms: number;
  openingTime: string;
  closingTime: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getSpaSettings(): Promise<SpaSettings | null> {
  const res = await fetch(`${endpoint}/settings`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch spa settings');
  return res.json();
}

export async function createSpaSettings(data: Omit<SpaSettings, '_id'>) {
  const res = await fetch(`${endpoint}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create spa settings');
  return res.json();
}

export async function updateSpaSettings(data: Partial<SpaSettings>) {
  const res = await fetch(`${endpoint}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody.message || 'Failed to update spa settings';
    throw new Error(message);
  }

  return res.json();
}
