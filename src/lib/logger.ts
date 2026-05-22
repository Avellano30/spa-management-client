const ENDPOINT = import.meta.env.VITE_ENDPOINT || 'http://localhost:3000';

interface LogMetadata {
    [key: string]: any;
}

async function ship(level: 'info' | 'warn' | 'error', message: string, metadata: LogMetadata = {}) {
    try {
        const token = localStorage.getItem('session');
        if (!token) return;

        const user = localStorage.getItem('user');
        const parsed = user ? JSON.parse(user) : null;
        const clientName = metadata.clientName  // ← use metadata override first
            ?? (parsed ? `${parsed.firstName} ${parsed.lastName}` : null);

        await fetch(`${ENDPOINT}/logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            keepalive: true,
            body: JSON.stringify({
                level,
                message,
                metadata,
                route: window.location.pathname,
                role: 'client',
                clientName,  // ← add
            }),
        });
    } catch {
        // fail silently
    }
}

export const logger = {
    info:  (message: string, metadata?: LogMetadata) => ship('info', message, metadata),
    warn:  (message: string, metadata?: LogMetadata) => ship('warn', message, metadata),
    error: (message: string, metadata?: LogMetadata) => ship('error', message, metadata),
};