import { jwtDecode, type JwtPayload } from "jwt-decode";
import type { Service } from "../services";
const endpoint = import.meta.env.VITE_ENDPOINT || "http://localhost:3000";

interface DecodedToken extends JwtPayload {
    userId: string;
}

export interface Appointment {
    _id: string;
    clientId: string;
    serviceId: Service;
    date: string;
    startTime: string;
    endTime: string;
    status: "Pending" | "Approved" | "Cancelled" | "Completed" | "Rescheduled";
    notes?: string;
    isTemporary?: boolean;
}

export interface NewAppointment {
    clientId: string;
    serviceId: string;
    date: string;
    startTime: string;
    notes?: string;
    isTemporary?: boolean;
}

export const getClientId = (): string => {
    const sessionToken = localStorage.getItem('session');
    if (!sessionToken) throw new Error("No session token found");
    const decoded = jwtDecode<DecodedToken>(sessionToken);
    return decoded.userId; // client id
}

// Get client appointment
export async function getClientAppointments(): Promise<Appointment[]> {
    const id = getClientId();
    const res = await fetch(`${endpoint}/appointment/client/${id}`);
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch client appointments");
    const data = await res.json();
    return data.appointments;
}

// Create new appointment
export async function createAppointment(data: NewAppointment): Promise<Appointment> {
    const res = await fetch(`${endpoint}/appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to create appointment");
    return res.json();
}

// Reschedule appointment
export async function rescheduleAppointment(
    id: string,
    date: string,
    startTime: string,
    notes?: string
): Promise<Appointment> {
    const res = await fetch(`${endpoint}/appointment/${id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startTime, notes }),
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to reschedule appointment");
    return res.json();
}

// Cancel appointment
export async function cancelAppointment(id: string): Promise<Appointment> {
    const res = await fetch(`${endpoint}/appointment/${id}/cancel`, {
        method: "PATCH",
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to cancel appointment");
    return res.json();
}

export const deleteAppointment = async (id: string) => {
    const res = await fetch(`${endpoint}/appointment/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to delete temp appointment");
    return res.json();
};

export const confirmAppointment = async (id: string) => {
    const res = await fetch(`${endpoint}/appointment/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ isTemporary: false })
    });
    console.log(res);
    return await res.json();
};