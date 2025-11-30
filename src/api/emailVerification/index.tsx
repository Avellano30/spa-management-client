const endpoint = import.meta.env.VITE_ENDPOINT || "http://localhost:3000";

export const resendEmailVerification = async (email: string) => {
    const res = await fetch(`${endpoint}/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Request failed");
    }

    return res.json();
};

export const verifyEmail = async (token: string) => {
    if (!token) {
        throw new Error("Token is required for verification.");
    }
    
    const res = await fetch(`${endpoint}/verify-email/${token}`);

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Token verification failed");
    }

    return res.json();
};
