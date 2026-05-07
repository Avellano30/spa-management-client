import { useEffect, useState } from "react";
import {
    Button,
    Group,
    Loader,
    Modal,
    Stack,
    Text,
    Textarea,
} from "@mantine/core";
import { DateInput, TimePicker } from "@mantine/dates";
import { showNotification } from "@mantine/notifications";
import { cancelAppointment, rescheduleAppointment } from "../api/appointments";
import { createPaymongoPayment, getNextPaymentType } from "../api/payment";
import { getSpaSettings, type SpaSettings } from "../api/settings";

export const PaymentActions = ({ appointment, refresh }: any) => {
    const [loading, setLoading] = useState(false);
    const [rescheduleModal, setRescheduleModal] = useState(false);
    const [cancelModal, setCancelModal] = useState(false);
    const [newDate, setNewDate] = useState<Date | null>(null);
    const [newTime, setNewTime] = useState<string | undefined>(undefined);
    const [newNotes, setNewNotes] = useState("");
    const [spaSettings, setSpaSettings] = useState<SpaSettings | null>(null);

    useEffect(() => {
        getSpaSettings().then(setSpaSettings).catch(console.error);
    }, []);

    // --- Calculations ---
    const nextType = getNextPaymentType(appointment.payments || []);
    const totalPaid = (appointment.payments || [])
        .filter((p: any) => p.status === "Completed")
        .reduce((sum: number, p: any) => sum + p.amount, 0);

    const servicePrice = (appointment.services || []).reduce(
        (sum: number, s: any) => sum + (s.service?.price || 0),
        0
    );

    const remaining = Math.max(servicePrice - totalPaid, 0);
    const downpaymentPercent = spaSettings?.downPayment ?? 30;
    const downpaymentAmount = servicePrice * (downpaymentPercent / 100);

    const appointmentStart = new Date(appointment.date);
    const [startHour, startMinute] = (appointment.startTime || "00:00").split(":").map(Number);
    appointmentStart.setHours(startHour, startMinute, 0, 0);

    const canReschedule =
        ["Approved", "Rescheduled"].includes(appointment.status) &&
        appointmentStart.getTime() - Date.now() > 24 * 60 * 60 * 1000;

    // --- Handlers ---
    const handlePay = async (type: "Downpayment" | "Balance" | "Full") => {
        setLoading(true);
        try {
            const url = await createPaymongoPayment(appointment._id, type);
            window.location.href = url;
        } catch (err: any) {
            showNotification({
                color: "red",
                title: "Error",
                message: "Something went wrong with the payment initiation."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!newNotes.trim()) {
            showNotification({ color: "red", title: "Missing Notes", message: "Please provide a reason." });
            return;
        }
        setLoading(true);
        try {
            await cancelAppointment(appointment._id, newNotes, true);
            showNotification({ color: "green", title: "Cancelled", message: "Appointment cancelled." });
            setCancelModal(false);
            setNewNotes("");
            refresh();
        } catch (err: any) {
            showNotification({ color: "red", title: "Error", message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleReschedule = async () => {
        if (!newDate || !newTime) {
            showNotification({ color: "red", title: "Missing Info", message: "Select date and time." });
            return;
        }
        setLoading(true);
        try {
            const dateString = newDate.toISOString().split('T')[0];
            await rescheduleAppointment(appointment._id, dateString, newTime, newNotes);
            showNotification({ color: "blue", title: "Rescheduled", message: "Successfully moved." });
            setRescheduleModal(false);
            refresh();
        } catch (err: any) {
            showNotification({ color: "red", title: "Error", message: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack gap="xs" align="stretch" className="w-full">
            {appointment.status === "Pending" && (
                <Button
                    size="xs"
                    color="green"
                    fullWidth
                    onClick={() => handlePay("Downpayment")}
                    disabled={loading}
                    leftSection={loading && <Loader color="white" size="xs" />}
                >
                    {loading ? "Processing..." : `Pay ₱${downpaymentAmount.toFixed(2)} (Downpayment)`}
                </Button>
            )}

            {nextType && appointment.status === "Approved" && remaining > 0 && (
                <Button
                    size="xs"
                    color={nextType === "Balance" ? "orange" : "green"}
                    fullWidth
                    onClick={() => handlePay(nextType)}
                    disabled={loading}
                    leftSection={loading && <Loader color="white" size="xs" />}
                >
                    {loading ? "Processing..." : `Pay ₱${remaining.toFixed(2)} (${nextType})`}
                </Button>
            )}

            {canReschedule && (
                <Button
                    size="xs"
                    color="blue"
                    variant="outline"
                    fullWidth
                    onClick={() => setRescheduleModal(true)}
                    disabled={loading}
                >
                    Reschedule
                </Button>
            )}

            {!["Cancelled", "Completed", "Refunded"].includes(appointment.status) && (
                <Button
                    size="xs"
                    color="red"
                    variant="outline"
                    fullWidth
                    onClick={() => setCancelModal(true)}
                    disabled={loading}
                >
                    Cancel Appointment
                </Button>
            )}

            {/* MODALS */}
            <Modal opened={cancelModal} onClose={() => setCancelModal(false)} title="Confirm Cancellation" centered size="sm">
                <Stack>
                    <Text size="sm">Are you sure you want to cancel?</Text>
                    <Textarea
                        label="Cancellation Notes"
                        placeholder="Reason..."
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.currentTarget.value)}
                        required
                    />
                    <Group grow mt="md">
                        <Button color="gray" variant="outline" onClick={() => setCancelModal(false)}>Go Back</Button>
                        <Button color="red" onClick={handleCancel} loading={loading}>Yes, Cancel</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={rescheduleModal} onClose={() => setRescheduleModal(false)} title="Reschedule Appointment" centered size="md">
                <Stack gap="md">
                    <Group grow>
                        <DateInput label="New Date" value={newDate} onChange={setNewDate} minDate={new Date()} />
                        <TimePicker label="New Start Time" value={newTime} onChange={setNewTime} format="12h" withDropdown />
                    </Group>
                    <Textarea label="Notes" value={newNotes} onChange={(e) => setNewNotes(e.currentTarget.value)} />
                    <Button fullWidth onClick={handleReschedule} loading={loading}>Save Changes</Button>
                </Stack>
            </Modal>
        </Stack>
    );
};