import { jwtDecode, type JwtPayload } from "jwt-decode";
import type { Service } from "../services";
import type { Payment } from "../payment";
import type { Employee } from "../employees";
import { logger } from '../../lib/logger';

const endpoint = import.meta.env.VITE_ENDPOINT || "http://localhost:3000";

interface DecodedToken extends JwtPayload {
    userId: string;
}

export interface Appointment {
    _id: string;
    clientId: string;
    services: {
        serviceId: string;
        intensity?: string;
        service: Service & { price: number };
    }[];
    date: string;
    startTime: string;
    endTime: string;
    status: "Pending" | "Approved" | "Cancelled" | "Completed" | "Rescheduled";
    notes?: string;
    isTemporary?: boolean;
    payments?: Payment[];
    employee?: Employee;
}

export interface NewAppointment {
    clientId: string;
    services: { serviceId: string; intensity?: string }[];
    date: string;
    startTime: string;
    notes?: string;
    isTemporary?: boolean;
    employee?: string;
}

export async function getAppointments(params?: { status?: string }): Promise<Appointment[]> {
    const query = params?.status ? `?status=${params.status}` : "";
    const res = await fetch(`${endpoint}/appointment${query}`);
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch appointments");
    return (await res.json()).appointments;
}

export const getClientId = (): string => {
    const sessionToken = localStorage.getItem("session");
    if (!sessionToken) throw new Error("No session token found");
    const decoded = jwtDecode<DecodedToken>(sessionToken);
    return decoded.userId;
};

export async function getClientAppointments(): Promise<Appointment[]> {
    const id = getClientId();
    const res = await fetch(`${endpoint}/appointment/client/${id}`);
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch client appointments");
    return (await res.json()).appointments;
}

export async function createAppointment(data: NewAppointment): Promise<Appointment> {
    const res = await fetch(`${endpoint}/appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        logger.error('Client failed to book appointment', { date: data.date, startTime: data.startTime });
        throw new Error((await res.json()).message || "Failed to create appointment");
    }
    const appointment = await res.json();
    logger.info('Client booked appointment', { appointmentId: appointment._id, date: data.date, startTime: data.startTime });
    return appointment;
}

export async function rescheduleAppointment(id: string, date: string, startTime: string, notes?: string): Promise<Appointment> {
    const res = await fetch(`${endpoint}/appointment/${id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startTime, notes }),
    });
    if (!res.ok) {
        logger.error('Client failed to reschedule appointment', { appointmentId: id, date, startTime });
        throw new Error((await res.json()).message || "Failed to reschedule appointment");
    }
    logger.info('Client rescheduled appointment', { appointmentId: id, date, startTime });
    return res.json();
}

export async function cancelAppointment(id: string, notes: string): Promise<Appointment> {
    const res = await fetch(`${endpoint}/appointment/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
    });
    if (!res.ok) {
        logger.error('Client failed to cancel appointment', { appointmentId: id });
        throw new Error((await res.json()).message || "Failed to cancel");
    }
    logger.info('Client cancelled appointment', { appointmentId: id, notes });
    return (await res.json()).appointment;
}

export const deleteAppointment = async (id: string) => {
    const res = await fetch(`${endpoint}/appointment/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to delete temp appointment");
    return res.json();
};

export const confirmAppointment = async (id: string) => {
    const res = await fetch(`${endpoint}/appointment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTemporary: false }),
    });
    return await res.json();
};

export async function getOccupancyData(date: string): Promise<{
    openingTime: string;
    closingTime: string;
    totalRooms: number;
    bookings: { start: string; end: string }[];
}> {
    const res = await fetch(`${endpoint}/appointment/occupancy?date=${date}`);
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch occupancy data");
    return res.json();
}

export async function getMonthlyAvailability(month: string): Promise<Record<string, "open" | "full">> {
    const res = await fetch(`${endpoint}/appointment/monthly-availability?month=${month}`);
    if (!res.ok) throw new Error("Failed to fetch monthly availability");
    return res.json();
}