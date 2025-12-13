const endpoint = import.meta.env.VITE_ENDPOINT || 'http://localhost:3000';

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
    createdAt: Date;
    updatedAt: Date;
}

// Fetch homepage settings (JSON)
export async function getHomepageSettings(): Promise<HomepageSettings | null> {
    const res = await fetch(`${endpoint}/homepage-settings`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch homepage settings');
    return res.json();
}