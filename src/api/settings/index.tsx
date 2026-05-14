const endpoint = import.meta.env.VITE_ENDPOINT || 'http://localhost:3000';

// Added this back to fix TS2304
export interface HomepageSettings {
    brand: {
        name: string;
        logoUrl?: string;
    };
    contact: {
        email: string;
        phone?: string;
        address?: string;
    };
    content: {
        heading?: string;
        description?: string;
        bodyDescription?: string;
    };
    createdAt: string; // Changed to string to match JSON response
    updatedAt: string;
}

export interface SpaSettings {
    _id?: string;
    totalRooms: number;
    downPayment: number;
    openingTime: string;
    closingTime: string;
    bufferTime: number;
    createdAt?: string;
    updatedAt?: string;
}

async function safeFetch<T>(url: string): Promise<T | null> {
    try {
        const res = await fetch(url);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
        return await res.json();
    } catch (err) {
        console.error(`Error fetching from ${url}:`, err);
        return null;
    }
}

export const getSpaSettings = () => safeFetch<SpaSettings>(`${endpoint}/settings`);
export const getHomepageSettings = () => safeFetch<HomepageSettings>(`${endpoint}/homepage-settings`);