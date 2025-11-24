const endpoint = import.meta.env.VITE_ENDPOINT || "http://localhost:3000";

export const requestPasswordReset = async (email: string) => {
    const res = await fetch(`${endpoint}/password-reset`, {
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

export const verifyResetToken = async (token: string) => {
    const res = await fetch(`${endpoint}/password-reset/verify/${token}`);

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Token verification failed");
    }

    return res.json();
};

export const resetPassword = async (token: string, password: string) => {
    const res = await fetch(`${endpoint}/password-reset/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Password reset failed");
    }

    return res.json();
};
