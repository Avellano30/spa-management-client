const endpoint = import.meta.env.VITE_ENDPOINT || 'http://localhost:3000';

export interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  imageUrl: string;
  imagePublicId: string;
  status: 'available' | 'unavailable';
}

export async function getAllServices(): Promise<Service[]> {
  const res = await fetch(`${endpoint}/services`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}