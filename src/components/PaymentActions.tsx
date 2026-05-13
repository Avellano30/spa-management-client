import { useEffect, useState } from "react";
import {
    Button,
    Group,
    Loader,
    Modal,
    Stack,
    Text,
    Textarea,
    Box,
    Badge,
    SimpleGrid,
    Alert,
    ScrollArea
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import type { DateValue } from "@mantine/dates";
import { showNotification } from "@mantine/notifications";
import { cancelAppointment, rescheduleAppointment, getAppointments, getOccupancyData, type Appointment } from "../api/appointments";
import { createPaymongoPayment, getNextPaymentType } from "../api/payment";
import { getSpaSettings, type SpaSettings } from "../api/settings";
import dayjs from "dayjs";
import { IconAlertTriangle } from "@tabler/icons-react";
export const PaymentActions = ({ appointment, refresh }: any) => {
    const [loading, setLoading] = useState(false);
    const [rescheduleModal, setRescheduleModal] = useState(false);
    const [cancelModal, setCancelModal] = useState(false);
    const [termsModal, setTermsModal] = useState(false);
    const [newDate, setNewDate] = useState<DateValue>(null);
    const [newTime, setNewTime] = useState<string>("");
    const [newNotes, setNewNotes] = useState("");
    const [spaSettings, setSpaSettings] = useState<SpaSettings | null>(null);

    const [occupancy, setOccupancy] = useState<{
        openingTime: string;
        closingTime: string;
        totalRooms: number;
        bufferTime?: number;
        bookings: { start: string; end: string }[];
    } | null>(null);

    const [appointmentsForDay, setAppointmentsForDay] = useState<Appointment[]>([]);

    useEffect(() => {
        getSpaSettings().then(setSpaSettings).catch(console.error);
    }, []);

    // Fetch occupancy and appointments when date changes
    useEffect(() => {
        if (!newDate) return;
        const dateStr = dayjs(newDate as Date).format("YYYY-MM-DD");

        getSpaSettings().then(setSpaSettings).catch(console.error);

        getOccupancyData(dateStr).then((data) => {
            setOccupancy(data);
        }).catch(console.error);

        Promise.all([
            getAppointments({ status: "Approved" }),
            getAppointments({ status: "Pending" }),
            getAppointments({ status: "Rescheduled" }),
        ]).then(([approved, pending, rescheduled]) => {
            const all = [...approved, ...pending, ...rescheduled];
            // Exclude current appointment from busy check
            setAppointmentsForDay(
                all.filter((a) =>
                    a.date.split("T")[0] === dateStr && a._id !== appointment._id
                )
            );
        });
    }, [newDate]);

    // ── Slot logic ─────────────────────────────────────────────────────────────

    function isSlotDisabled(checkTime: string): boolean {
        if (!occupancy) return false;
        const { openingTime, closingTime, totalRooms, bookings } = occupancy;

        // 1. Business hours check
        const isWithinHours =
            closingTime > openingTime
                ? checkTime >= openingTime && checkTime < closingTime
                : checkTime >= openingTime || checkTime < closingTime;
        if (!isWithinHours) return true;

        // 2. Cutoff check — service must finish before closing time
        const isOvernight = closingTime < openingTime;
        const baseDate = isOvernight && checkTime < openingTime
            ? "2026-01-02"
            : "2026-01-01";
        const slotStart = dayjs(`${baseDate}T${checkTime}`);
        const slotEnd = slotStart.add(serviceDuration, 'minute');
        const adjustedClosing = isOvernight
            ? dayjs(`2026-01-02T${closingTime}`)
            : dayjs(`2026-01-01T${closingTime}`);
        if (slotEnd.isAfter(adjustedClosing)) return true;

        // 3. All rooms full check
        const overlapping = bookings.filter(({ start, end }) => {
            const check = dayjs(`2026-01-01T${checkTime}`);
            const s = dayjs(`2026-01-01T${start}`);
            const e = dayjs(`2026-01-01T${end}`).add(occupancy.bufferTime ?? 15, "minute");
            return (check.isSame(s) || check.isAfter(s)) && check.isBefore(e);
        }).length;
        if (overlapping >= totalRooms) return true;

        // 4. Therapist busy check
        if (appointment.employee?._id) {
            const therapistBusy = appointmentsForDay.some((appt) => {
                const check = dayjs(`2026-01-01T${checkTime}`);
                const s = dayjs(`2026-01-01T${appt.startTime}`);
                const e = dayjs(`2026-01-01T${appt.endTime}`).add(occupancy.bufferTime ?? 15, "minute");
                return (
                    appt.employee?._id === appointment.employee?._id &&
                    (check.isSame(s) || check.isAfter(s)) &&
                    check.isBefore(e)
                );
            });
            if (therapistBusy) return true;
        }

        return false;
    }

    function generateSlots(): string[] {
        const openingTime = occupancy?.openingTime ?? spaSettings?.openingTime;
        const closingTime = occupancy?.closingTime ?? spaSettings?.closingTime;
        if (!openingTime || !closingTime) return [];

        const bufferMins = occupancy?.bufferTime ?? spaSettings?.bufferTime ?? 15;
        const slots: string[] = [];

        let current = dayjs(`2026-01-01T${openingTime}`);
        const closing = dayjs(`2026-01-01T${closingTime}`);
        const end = closing.isBefore(current) ? closing.add(1, "day") : closing;

        while (current.isBefore(end)) {
            slots.push(current.format("HH:mm"));
            current = current.add(1, "hour");
        }

        // Add buffer end times
        if (occupancy?.bookings) {
            occupancy.bookings.forEach(({ end: bookingEnd }) => {
                const bufferEndTime = dayjs(`2026-01-01T${bookingEnd}`)
                    .add(bufferMins, "minute")
                    .format("HH:mm");
                if (!slots.includes(bufferEndTime)) {
                    slots.push(bufferEndTime);
                }
            });
        }

        return slots.sort((a, b) =>
            dayjs(`2026-01-01T${a}`).valueOf() - dayjs(`2026-01-01T${b}`).valueOf()
        );
    }

    // ── Payment logic ──────────────────────────────────────────────────────────

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

    const handlePay = async (type: "Downpayment" | "Balance" | "Full") => {
        setLoading(true);
        try {
            const url = await createPaymongoPayment(appointment._id, type);
            window.location.href = url;
        } catch (err: any) {
            showNotification({ color: "red", title: "Error", message: "Payment could not be initiated." });
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
            await cancelAppointment(appointment._id, newNotes);
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
        if (isSlotDisabled(newTime)) {
            showNotification({ color: "red", title: "Invalid Slot", message: "This time slot is unavailable." });
            return;
        }

        setLoading(true);
        try {
            const dateStr = dayjs(newDate as Date).format("YYYY-MM-DD");
            await rescheduleAppointment(appointment._id, dateStr, newTime, newNotes);
            showNotification({ color: "blue", title: "Rescheduled", message: "Successfully moved." });
            setRescheduleModal(false);
            setNewDate(null);
            setNewTime("");
            setNewNotes("");
            refresh();
        } catch (err: any) {
            showNotification({ color: "red", title: "Error", message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const serviceDuration = (appointment.services || []).reduce(
        (sum: number, s: any) => sum + (s.service?.duration || 0), 0
    );

    // ── Render ─────────────────────────────────────────────────────────────────

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

            {/* Cancel Modal */}
            {/* Terms Modal */}
            <Modal
                opened={termsModal}
                onClose={() => setTermsModal(false)}
                title={<Text fw={700} size="lg">Terms & Conditions</Text>}
                centered
                size="xl"
                overlayProps={{ blur: 3, backgroundOpacity: 0.4 }}
            >
                <ScrollArea h={450} className="border border-gray-300 p-3 rounded-xl">
                    <Text size="xl" c="dimmed">
                        <strong>Booking Policy:</strong>
                        <br />• A downpayment is required to confirm your booking.
                        <br />• The downpayment or full payment is <strong>(REFUNDABLE upon cancellation)</strong> only from the <strong>SPA Administrator</strong>.
                        <br />• Remaining balance must be paid before or on the day of the appointment.
                        <br />• All appointments are subject to availability and are considered confirmed only after downpayment is received.
                        <br />• Only <strong>(2) PENDING</strong> bookings are allowed for security purposes.
                        <br />• <strong>Multiple Booking</strong> is allowed but only <strong>(1) TYPE OF SERVICE PER CATEGORY</strong> is permitted.
                        <br /><br />
                        <strong>Cancellation & Rescheduling:</strong>
                        <br />• You may <strong>cancel</strong> an appointment only while it is still marked as <strong>Approved</strong>.
                        <br />• You may <strong>reschedule</strong> an appointment if it is <strong>Approved.</strong>
                        <br />• You are <strong>ENTITLED</strong> to the <strong>SAME THERAPIST YOU SELECTED</strong> prior to the rescheduling process.
                        <br />• Cancellations or reschedule requests made less than 24 hours before the appointment may not be accommodated.
                        <br /><br />
                        <strong>Late Arrival Policy:</strong>
                        <br />• Arriving more than <strong>15 minutes late</strong> may result in a shortened session to avoid impacting other clients.
                        <br />• Excessive delays may be treated as a no-show, resulting in forfeiture of any payments made.
                        <br /><br />
                        <strong>Health & Safety:</strong>
                        <br />• Please inform your therapist of any medical conditions, injuries, allergies, or physical limitations before your session.
                        <br />• The spa reserves the right to decline or modify treatment based on health concerns for client safety.
                        <br /><br />
                        <strong>Client Conduct & Etiquette:</strong>
                        <br />• Respectful behavior toward staff and other clients is required at all times.
                        <br />• Inappropriate or abusive behavior may result in the immediate termination of the session with no refund.
                        <br /><br />
                        <strong>Privacy & Confidentiality:</strong>
                        <br />• All client information is kept confidential and is used only for booking and service purposes.
                        <br /><br />
                        <strong>Agreement:</strong>
                        <br />• By checking the agreement box and proceeding with the booking, you acknowledge that you have read, understood, and agreed to all terms and conditions listed above.
                    </Text>
                </ScrollArea>
                <Button mt="md" fullWidth onClick={() => setTermsModal(false)} radius="xl">
                    Close
                </Button>
            </Modal>

            {/* Cancel Modal */}
            <Modal
                opened={cancelModal}
                onClose={() => setCancelModal(false)}
                title={<Text fw={700} size="lg">Confirm Cancellation</Text>}
                centered
                size="md"
                overlayProps={{ blur: 3, backgroundOpacity: 0.4 }}
            >
                <Stack gap="md">
                    {/* Appointment summary */}
                    {appointment && (
                        <Box p="sm" style={{ backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                            <Text size="xs" c="dimmed" fw={600} mb={4}>CANCELLING APPOINTMENT</Text>
                            <Text size="sm" fw={600}>
                                {appointment.services?.map((s: any) => s.service?.name).join(", ")}
                            </Text>
                            <Text size="xs" c="dimmed">
                                {new Date(appointment.date).toLocaleDateString()} at {appointment.startTime}
                            </Text>
                        </Box>
                    )}

                    <Alert
                        variant="light"
                        color="red"
                        title={<Text fw={700}>Refund Notice</Text>}
                        icon={<IconAlertTriangle size={28} stroke={2.5} />}
                        styles={{
                            title: { marginBottom: '4px' },
                            icon: { marginTop: '2px' }
                        }}
                    >
                        <Text size="sm" fw={500} c="red.9">
                            Your payment will <Text span fw={900} td="underline">NOT</Text> be automatically refunded.
                            Refunds are processed manually through the spa administrators as per our{" "}
                            <Text
                                span
                                c="blue"
                                fw={600}
                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => {
                                    setCancelModal(false); // 👈 close cancel modal
                                    setTermsModal(true);   // 👈 open terms modal
                                }}
                            >
                                Terms & Conditions
                            </Text>.
                        </Text>
                    </Alert>

                    <Textarea
                        label="Reason for Cancellation"
                        placeholder="Please tell us why you're cancelling..."
                        onChange={(e) => setNewNotes(e.currentTarget.value)}
                        required
                        minRows={3}
                        autosize
                        styles={{ input: { borderRadius: '10px' } }}
                    />

                    <Text size="xs" c="dimmed" ta="center">
                        This action cannot be undone.
                    </Text>

                    <Group grow>
                        <Button color="gray" variant="outline" onClick={() => setCancelModal(false)} radius="xl">
                            Go Back
                        </Button>
                        <Button
                            color="red"
                            onClick={handleCancel}
                            loading={loading}
                            radius="xl"
                            leftSection={<IconAlertTriangle size={16} />}
                        >
                            Yes, Cancel
                        </Button>
                    </Group>
                </Stack>
            </Modal>
            {/* Reschedule Modal */}
            <Modal
                opened={rescheduleModal}
                onClose={() => {
                    setRescheduleModal(false);
                    setNewDate(null);
                    setNewTime("");
                    setOccupancy(null);
                }}
                title="Reschedule Appointment"
                centered
                size="lg"
                overlayProps={{ blur: 3, backgroundOpacity: 0.4 }}

            >
                <Stack gap="md">
                    {/* Date Picker */}
                    <Box p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '14px' }}>
                        <Group justify="space-between" mb="xs">
                            <Text fw={700} size="md" c="dark.3">SELECT DATE</Text>
                            {newDate && (
                                <Badge variant="dot" color="green" size="sm">
                                    {dayjs(newDate as Date).format("dddd, MMMM D")}
                                </Badge>
                            )}
                        </Group>
                        <DateInput
                            placeholder="Pick a date"
                            value={newDate}
                            onChange={(val: DateValue) => {
                                setNewDate(val);
                                setNewTime(""); // reset time when date changes
                            }}
                            minDate={new Date()}
                            size="md"
                            radius="xl"
                            styles={(theme) => ({
                                input: {
                                    backgroundColor: 'white',
                                    border: `1.5px solid ${newDate ? theme.colors.green[5] : theme.colors.gray[3]}`,
                                    borderRadius: '12px',
                                    fontSize: '15px',
                                    fontWeight: 500,
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                },
                            })}
                            rightSection={
                                newDate ? (
                                    <Text
                                        size="xs"
                                        c="red"
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        onClick={() => setNewDate(null)}
                                    >
                                        ✕
                                    </Text>
                                ) : null
                            }
                        />
                        {newDate && (
                            <Group gap="xs" mt="sm">
                                <Badge color="green" variant="light" size="sm">
                                    📅 {dayjs(newDate as Date).format("MMM D, YYYY")}
                                </Badge>
                                <Badge color="blue" variant="light" size="sm">
                                    {dayjs(newDate as Date).format("dddd")}
                                </Badge>
                            </Group>
                        )}
                    </Box>

                    {/* Time Picker */}
                    <Box p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '14px' }}>
                        <Group justify="space-between" mb="xs" align="flex-start">
                            <div>
                                <Text fw={700} size="md" c="dark.3" mb={4}>SELECT TIME</Text>
                                {(occupancy?.bufferTime ?? spaSettings?.bufferTime) ? (
                                    <Text size="xs" fw={600} c="blue.6">
                                        ⏱ {occupancy?.bufferTime ?? spaSettings?.bufferTime} min buffer between appointments
                                    </Text>
                                ) : null}
                            </div>
                            {!newDate && (
                                <Badge variant="dot" color="gray" size="sm">
                                    Pick a date first
                                </Badge>
                            )}
                        </Group>

                        <SimpleGrid cols={3} spacing="sm">
                            {generateSlots().map((slot) => {
                                const disabled = isSlotDisabled(slot);
                                const noDate = !newDate;
                                const selected = newTime === slot;
                                return (
                                    <Button
                                        key={slot}
                                        onClick={() => !disabled && !noDate && setNewTime(slot)}
                                        disabled={disabled || noDate}
                                        variant={selected ? "filled" : "light"}
                                        color={selected ? "blue" : disabled || noDate ? "gray" : "teal"}
                                        radius="xl"
                                        size="sm"
                                        styles={(theme) => ({
                                            root: {
                                                transition: 'all 0.2s ease',
                                                opacity: disabled || noDate ? 0.4 : 1,
                                                border: selected ? 'none' : `1px solid ${disabled || noDate ? 'transparent' : theme.colors.teal[1]}`,
                                                padding: '6px 4px',
                                                '&:hover': {
                                                    transform: disabled || noDate ? 'none' : 'translateY(-2px)',
                                                    boxShadow: disabled || noDate ? 'none' : theme.shadows.xs,
                                                },
                                            },
                                            inner: {
                                                textDecoration: disabled ? 'line-through' : 'none',
                                                flexDirection: 'column',
                                                gap: 0,
                                            },
                                            label: {
                                                fontSize: '11px',
                                                lineHeight: 1.2,
                                                whiteSpace: 'pre-line',
                                            }
                                        })}
                                    >
                                        {dayjs(`2026-01-01 ${slot}`).format("h:mm[\n]A")}
                                    </Button>
                                );
                            })}
                        </SimpleGrid>

                        {/* Session info */}
                        {newTime && (
                            <Box mt="md" p="xs" style={{ backgroundColor: '#f0faf0', borderRadius: '8px' }}>
                                <Text size="xs" c="dimmed">
                                    <b>Service Duration:</b> {serviceDuration} mins
                                </Text>
                                <Text size="xs" c="dimmed">
                                    <b>Buffer Time:</b> {occupancy?.bufferTime ?? spaSettings?.bufferTime ?? 0} mins
                                </Text>
                                <Text size="xs" fw={700} c="green.7">
                                    <b>Session ends at:</b> {dayjs(`2026-01-01T${newTime}`)
                                    .add(serviceDuration, 'minute')
                                    .format('h:mm A')}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    <b>Room clears at:</b> {dayjs(`2026-01-01T${newTime}`)
                                    .add(serviceDuration + (occupancy?.bufferTime ?? spaSettings?.bufferTime ?? 0), 'minute')
                                    .format('h:mm A')}
                                </Text>
                            </Box>
                        )}

                        <Group gap="xs" mt="md" justify="center">
                            <Badge color="teal" variant="light" size="xs">Available</Badge>
                            <Badge color="blue" variant="filled" size="xs">Selected</Badge>
                            <Badge color="gray" variant="light" size="xs" style={{ opacity: 0.5 }}>Full / Busy</Badge>
                        </Group>
                    </Box>

                    <Textarea
                        label="Notes (optional)"
                        placeholder="Reason for rescheduling..."
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.currentTarget.value)}
                    />

                    <Button
                        fullWidth
                        onClick={handleReschedule}
                        loading={loading}
                        disabled={!newDate || !newTime}
                    >
                        Save Changes
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    );
};