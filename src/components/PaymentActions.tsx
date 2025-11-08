import { useState } from "react";
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
import {
    cancelAppointment,
    rescheduleAppointment,
} from "../api/appointments";
import { createOnlinePayment, getNextPaymentType } from "../api/payment";

export const PaymentActions = ({ appointment, refresh }: any) => {
    const [loading, setLoading] = useState(false);
    const [rescheduleModal, setRescheduleModal] = useState(false);
    const [cancelModal, setCancelModal] = useState(false);
    const [newDate, setNewDate] = useState<string | null>(null);
    const [newTime, setNewTime] = useState<string | undefined>(undefined);
    const [newNotes, setNewNotes] = useState("");

    const nextType = getNextPaymentType(appointment.payments);

    // --- Payment Calculations ---
    const totalPaid = appointment.payments
        .filter((p: any) => p.status === "Completed")
        .reduce((sum: number, p: any) => sum + p.amount, 0);

    const remaining = Math.max(appointment.serviceId.price - totalPaid, 0);
    const downpaymentAmount = appointment.serviceId.price * 0.3;

    // --- Time Validation (for reschedule) ---
    const appointmentStart = new Date(appointment.date);
    const [startHour, startMinute] = appointment.startTime.split(":").map(Number);
    appointmentStart.setHours(startHour, startMinute, 0, 0);

    const canReschedule =
        ["Approved", "Rescheduled"].includes(appointment.status) &&
        appointmentStart.getTime() - Date.now() > 24 * 60 * 60 * 1000;

    // --- Handle Payment ---
    const handlePay = async (type: "Downpayment" | "Balance" | "Full") => {
        setLoading(true);
        try {
            const { url } = await createOnlinePayment(appointment._id, type);
            window.location.href = url;
        } catch (err: any) {
            showNotification({
                color: "red",
                title: "Payment Error",
                message: err.message || "Failed to create Stripe session",
            });
        } finally {
            setLoading(false);
        }
    };

    // --- Handle Cancel ---
    const handleCancel = async () => {
        setLoading(true);
        try {
            await cancelAppointment(appointment._id);
            showNotification({
                color: "green",
                title: "Cancelled",
                message: "Appointment successfully cancelled",
            });
            setCancelModal(false);
            refresh();
        } catch (err: any) {
            showNotification({
                color: "red",
                title: "Error",
                message: err.message || "Failed to cancel appointment",
            });
        } finally {
            setLoading(false);
        }
    };

    // --- Handle Reschedule ---
    const handleReschedule = async () => {
        if (!newDate || !newTime) {
            showNotification({
                color: "red",
                title: "Missing Info",
                message: "Please select both date and time.",
            });
            return;
        }

        setLoading(true);
        try {
            await rescheduleAppointment(
                appointment._id,
                newDate,
                newTime,
                newNotes
            );
            showNotification({
                color: "blue",
                title: "Rescheduled",
                message: "Appointment successfully rescheduled",
            });
            setRescheduleModal(false);
            refresh();
        } catch (err: any) {
            showNotification({
                color: "red",
                title: "Error",
                message: err.message || "Failed to reschedule appointment",
            });
        } finally {
            setLoading(false);
        }
    };

    // --- Pending: Downpayment ---
    if (
        appointment.status === "Pending"
    ) {
        return (
            <Stack gap="xs" align="stretch" className="w-full">
                <Button
                    size="xs"
                    color="green"
                    fullWidth
                    onClick={() => handlePay("Downpayment")}
                    disabled={loading}
                    leftSection={loading && <Loader color="white" size="xs" />}
                >
                    {loading
                        ? "Processing..."
                        : `Pay ₱${downpaymentAmount.toFixed(2)} (Downpayment)`}
                </Button>
            </Stack>
        );
    }

    // --- Approved or Rescheduled: Balance or Reschedule ---
    return (
        <Stack gap="xs" align="stretch" className="w-full">
            {nextType && appointment.status === "Approved" && remaining > 0 && (
                <Button
                    size="xs"
                    color={nextType === "Balance" ? "orange" : "green"}
                    fullWidth
                    onClick={() => handlePay(nextType)}
                    disabled={loading}
                    leftSection={loading && <Loader color="white" size="xs" />}
                >
                    {loading
                        ? "Processing..."
                        : `Pay ₱${remaining.toFixed(2)} (${nextType})`}
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

            { appointment.status !== "Cancelled" && appointment.status !== "Completed" && <Button
                size="xs"
                color="red"
                variant="outline"
                fullWidth
                onClick={() => setCancelModal(true)}
                disabled={loading}
            >
                Cancel Appointment
            </Button>}

            {/* CANCEL CONFIRMATION MODAL */}
            <Modal
                opened={cancelModal}
                onClose={() => setCancelModal(false)}
                title="Confirm Cancellation"
                centered
                size="sm"
            >
                <Stack>
                    <Text size="sm">
                        Are you sure you want to cancel your appointment?
                    </Text>
                    <Text size="sm" c="red">
                        ⚠️ Downpayments are <strong>non-refundable</strong>.
                    </Text>

                    <Group grow mt="md">
                        <Button
                            color="gray"
                            variant="outline"
                            onClick={() => setCancelModal(false)}
                        >
                            Go Back
                        </Button>
                        <Button color="red" onClick={handleCancel} loading={loading}>
                            Yes, Cancel
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* RESCHEDULE MODAL */}
            <Modal
                opened={rescheduleModal}
                onClose={() => setRescheduleModal(false)}
                title={`Reschedule: ${appointment?.serviceId?.name || ""}`}
                centered
                size="md"
            >
                <Text size="sm" mb="sm" c="dimmed">
                    Choose a new date and time for your appointment.
                </Text>

                <Group grow mb="md">
                    <DateInput
                        label="New Date"
                        value={newDate}
                        onChange={setNewDate}
                        minDate={new Date()}
                    />
                    <TimePicker
                        label="New Start Time"
                        value={newTime}
                        onChange={setNewTime}
                        format="12h"
                        withDropdown
                    />
                </Group>

                <Textarea
                    label="Notes (optional)"
                    placeholder="Add any notes for this reschedule..."
                    minRows={3}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.currentTarget.value)}
                    mb="md"
                />

                <Button
                    fullWidth
                    onClick={handleReschedule}
                    loading={loading}
                    disabled={!newDate || !newTime}
                >
                    Save Changes
                </Button>
            </Modal>
        </Stack>
    );
};
