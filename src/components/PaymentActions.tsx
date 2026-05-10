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
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import type { DateValue } from "@mantine/dates";
import { showNotification } from "@mantine/notifications";
import { cancelAppointment, rescheduleAppointment, getAppointments, getOccupancyData, type Appointment } from "../api/appointments";
import { createPaymongoPayment, getNextPaymentType } from "../api/payment";
import { getSpaSettings, type SpaSettings } from "../api/settings";
import dayjs from "dayjs";

export const PaymentActions = ({ appointment, refresh }: any) => {
    const [loading, setLoading] = useState(false);
    const [rescheduleModal, setRescheduleModal] = useState(false);
    const [cancelModal, setCancelModal] = useState(false);

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

        // 2. All rooms full check
        const overlapping = bookings.filter(({ start, end }) => {
            const check = dayjs(`2026-01-01T${checkTime}`);
            const s = dayjs(`2026-01-01T${start}`);
            const e = dayjs(`2026-01-01T${end}`).add(occupancy.bufferTime ?? 15, "minute");
            return (check.isSame(s) || check.isAfter(s)) && check.isBefore(e);
        }).length;
        if (overlapping >= totalRooms) return true;

        // 3. Therapist busy check
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
        (sum: number, s: any) => sum + (s.service?.duration || 0),
        0
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
            <Modal
                opened={cancelModal}
                onClose={() => setCancelModal(false)}
                title="Confirm Cancellation"
                centered
                size="sm"
            >
                <Stack>
                    <Text size="sm">Are you sure you want to cancel?</Text>
                    <Textarea
                        label="Cancellation Notes"
                        placeholder="Reason..."
                        onChange={(e) => setNewNotes(e.currentTarget.value)}
                        required
                    />
                    <Group grow mt="md">
                        <Button color="gray" variant="outline" onClick={() => setCancelModal(false)}>
                            Go Back
                        </Button>
                        <Button color="red" onClick={handleCancel} loading={loading}>
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