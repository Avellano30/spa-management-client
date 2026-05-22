import { logger } from '../../lib/logger';

const endpoint = import.meta.env.VITE_ENDPOINT || "http://localhost:3000";

export interface Payment {
    _id: string;
    appointmentId: string;
    amount: number;
    method: string;
    type: "Balance" | "Downpayment" | "Full" | "Refund";
    status: "Pending" | "Completed" | "Failed";
    transactionId?: string;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
}

export const createOnlinePayment = async (
    appointmentId: string,
    type: "Full" | "Downpayment" | "Balance",
) => {
    const res = await fetch(`${endpoint}/payment/online`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, type }),
    });
    if (!res.ok) {
        logger.error('Client failed to create online payment', { appointmentId, type });
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create online payment session");
    }
    logger.info('Client initiated online payment', { appointmentId, type });
    return res.json();
};

export const createPaymongoPayment = async (
    appointmentId: string,
    type: "Full" | "Downpayment" | "Balance",
) => {
    const res = await fetch(`${endpoint}/payment/paymongo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, type }),
    });
    const data = await res.json();
    if (!data.checkout_url) {
        logger.error('Client failed to create PayMongo payment', { appointmentId, type });
        throw new Error("Failed to create online payment session");
    }
    logger.info('Client initiated PayMongo payment', { appointmentId, type });
    return data.checkout_url;
};

export const createCashPayment = async (
    appointmentId: string,
    type: "Full" | "Downpayment" | "Balance" | "Refund",
    amount: number,
    remarks?: string,
) => {
    const res = await fetch(`${endpoint}/payment/cash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, type, amount, remarks }),
    });
    if (!res.ok) {
        logger.error('Client failed to create cash payment', { appointmentId, type, amount });
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create cash payment");
    }
    logger.info('Client created cash payment', { appointmentId, type, amount });
    return res.json();
};

export function getNextPaymentType(payments: Payment[]): "Downpayment" | "Balance" | "Full" | null {
    if (!payments?.length) return "Balance";
    const last = payments[payments.length - 1];
    if (last.type === "Downpayment" && last.status === "Completed") return "Balance";
    if (last.type === "Full" || last.type === "Balance") return null;
    return null;
}

export const refundAppointment = async (
    appointmentId: string,
    amount: number,
    reason: string,
) => {
    const res = await fetch(`${endpoint}/payment/refund/${appointmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason }),
    });
    if (!res.ok) {
        logger.error('Client refund failed', { appointmentId, amount });
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to refund appointment");
    }
    logger.info('Client refund processed', { appointmentId, amount });
    return res.json();
};