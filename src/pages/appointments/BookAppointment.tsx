import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
    Button,
    Card,
    Text,
    Group,
    Loader,
    Image,
    Title,
    Container,
    Divider,
    SegmentedControl,
    Stack,
    Textarea,
    Stepper,
    Modal,
    Checkbox,
    ScrollArea,
    Box,
    Badge,
    SimpleGrid,
    Select,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { jwtDecode } from "jwt-decode";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { getAllServices, type Service } from "../../api/services";
import { getAllEmployees } from "../../api/employees";
import {  toMinutes } from "../../helpers/timeutils.ts";
import {
    confirmAppointment,
    createAppointment,
    deleteAppointment,
    getClientId,
    getAppointments,
    type Appointment,
    getOccupancyData,
} from "../../api/appointments";
import { createPaymongoPayment } from "../../api/payment";
import { getSpaSettings, type SpaSettings } from "../../api/settings";
import BookingCalendar from "../../components/BookingCalendar";
import dayjs from "dayjs";
import { IconCalendar, IconClock } from "@tabler/icons-react";
interface DecodedToken {
    userId: string;
}

interface SelectedService {
    service: Service;
    intensity?: string;
}

export default function BookAppointment() {
    const [searchParams] = useSearchParams();
    const serviceId = searchParams.get("serviceId");
    const intensityParam = searchParams.get("intensity");

    // ── State ──────────────────────────────────────────────────────────────────
    const [services, setServices] = useState<SelectedService[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [active, setActive] = useState(0);
    const [date, setDate] = useState<string | null>(null);
    const [time, setTime] = useState<string>("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [paymentType, setPaymentType] = useState<"Cash" | "Online">("Cash");
    const [paymentMode, setPaymentMode] = useState<"Full" | "Downpayment">("Full");
    const [tempAppointmentIds, setTempAppointmentIds] = useState<string[]>([]);
    const [confirmModal, setConfirmModal] = useState(false);
    const [termsOpened, setTermsOpened] = useState(false);
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [termsChecked, setTermsChecked] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [termsReadOnly, setTermsReadOnly] = useState(false);
    const [intensityModal, setIntensityModal] = useState<{
        service: Service;
        onSelect: (intensity: string) => void;
        isUpdate: boolean;
    } | null>(null);

    const [spaSettings, setSpaSettings] = useState<SpaSettings | null>(null);
    const downPaymentPercent = spaSettings?.downPayment ?? 30;

    const [employees, setEmployees] = useState<{ _id: string; name: string; status: string; schedule?: string[]; imageUrl?: string }[]>([]);
    const [availableBeds, setAvailableBeds] = useState<number>(0);
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

    const [occupancy, setOccupancy] = useState<{
        openingTime: string;
        closingTime: string;
        totalRooms: number;
        bufferTime?: number;
        bookings: { start: string; end: string }[];
    } | null>(null);

    const [appointmentsForDay, setAppointmentsForDay] = useState<Appointment[]>([]);

    const navigate = useNavigate();

    // ── Effects ────────────────────────────────────────────────────────────────

    // Initial load: settings, employees, services
    useEffect(() => {
        getSpaSettings()
            .then((settings) => {
                setSpaSettings(settings);
                setAvailableBeds(settings?.totalRooms || 0);
            })
            .catch(console.error);

        getAllEmployees().then(setEmployees);

        getAllServices().then((data) => {
            setAllServices(data);
            if (serviceId) {
                const selectedService = data.find((s) => s._id === serviceId);
                if (selectedService) {
                    setServices([{ service: selectedService, intensity: intensityParam || undefined }]);
                }
            }
        });
    }, [serviceId,intensityParam]);

    // Terms agreement check
    useEffect(() => {
        const agreed = localStorage.getItem("termsAgreed");
        if (agreed === "true") {
            setTermsAgreed(true);
            setTermsChecked(false);
        } else {
            setTermsAgreed(false);
            setTermsChecked(false);
            setTermsOpened(true);
        }
    }, []);

    // Fetch occupancy data when date changes
// Add to your existing date effect
    useEffect(() => {
        if (!date) return;
        getSpaSettings().then(setSpaSettings).catch(console.error); // 👈 refetch settings
        getOccupancyData(date).then((data) => {
            setOccupancy(data);
            setAvailableBeds(data.totalRooms);
        }).catch(console.error);
    }, [date]);

    // Recalculate available beds when time or occupancy changes
    useEffect(() => {
        if (!occupancy) return;

        // If a time is selected, show beds for that specific slot
        if (time) {
            const booked = occupancy.bookings.filter(({ start, end }) => {
                const check = dayjs(`2026-01-01T${time}`);
                const s = dayjs(`2026-01-01T${start}`);
                const e = dayjs(`2026-01-01T${end}`).add(occupancy.bufferTime ?? 15, "minute");
                return (check.isSame(s) || check.isAfter(s)) && check.isBefore(e);
            }).length;
            setAvailableBeds(Math.max(0, occupancy.totalRooms - booked));
        } else {
            // If no time is selected yet, show the beds available for the day
            // This prevents the "1 bed" from showing when the day is actually full
            const totalBookingsToday = occupancy.bookings.length;
            setAvailableBeds(Math.max(0, occupancy.totalRooms - totalBookingsToday));
        }
    }, [time, occupancy]);
// ^ Note: Removed 'time' from dependencies so it doesn't wait for a time pick

    // Fetch appointments for the selected day (for therapist busy check)
    useEffect(() => {
        if (!date) return;
        Promise.all([
            getAppointments({ status: "Approved" }),
            getAppointments({ status: "Pending" }),
            getAppointments({ status: "Rescheduled" }),
        ]).then(([approved, pending, rescheduled]) => {
            const all = [...approved, ...pending, ...rescheduled];
            setAppointmentsForDay(all.filter((a) => a.date.split("T")[0] === date));
        });
    }, [date]);

    // ── Helper functions ───────────────────────────────────────────────────────

    function isSlotDisabled(checkTime: string): boolean {
        const isToday = dayjs(date).isSame(dayjs(), "day");
        if (isToday) {
            const now = dayjs();
            const slotTime = dayjs(`${dayjs().format("YYYY-MM-DD")}T${checkTime}`);
            if (slotTime.isBefore(now)) return true;
        }
        if (!occupancy) return false;
        const { openingTime, closingTime, totalRooms, bookings } = occupancy;

        // 1. Business hours check
        const isWithinHours =
            closingTime > openingTime
                ? checkTime >= openingTime && checkTime < closingTime
                : checkTime >= openingTime || checkTime < closingTime;
        if (!isWithinHours) return true;

        // 2. Cutoff check — service must finish before closing time
        // 2. Cutoff check
        const serviceDuration = services.reduce((sum, s) => sum + s.service.duration, 0);
        const isOvernight = closingTime < openingTime;
        const baseDate = isOvernight && checkTime < openingTime
            ? "2026-01-02"  // after midnight = next day
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

        // 4. Selected therapist already booked at this time
        if (selectedEmployee) {
            const therapistBusy = appointmentsForDay.some((appt) => {
                const check = dayjs(`2026-01-01T${checkTime}`);
                const s = dayjs(`2026-01-01T${appt.startTime}`);
                const e = dayjs(`2026-01-01T${appt.endTime}`).add(occupancy.bufferTime ?? 15, "minute");
                return (
                    appt.employee?._id === selectedEmployee &&
                    (check.isSame(s) || check.isAfter(s)) &&
                    check.isBefore(e)
                );
            });
            if (therapistBusy) return true;
        }

        return false;
    }
    function isEmployeeWorkingOnDay(emp: { schedule?: string[] }, selectedDate: string | null) {        if (!selectedDate) return true;
        const dayOfWeek = dayjs(selectedDate).format("dddd").toLowerCase();
        if (!emp.schedule) return false;
        return emp.schedule.some((d: string) => d.toLowerCase().includes(dayOfWeek));
    }

    function isEmployeeBusy(emp: { _id: string }, selectedDate: string | null, selectedTime: string) {        if (!selectedDate || !selectedTime) return false;
        const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD");
        return appointmentsForDay.some((appt) => {
            const apptDate = appt.date.split("T")[0];
            return (
                apptDate === formattedDate &&
                appt.startTime === selectedTime &&
                appt.employee?._id === emp._id
            );
        });
    }

    // ── Terms modal handlers ───────────────────────────────────────────────────

    const openTermsModal = () => {
        setTermsChecked(false);
        setTermsOpened(true);
    };

    const handleContinueAgree = () => {
        setTermsAgreed(true);
        localStorage.setItem("termsAgreed", "true");
        setTermsOpened(false);
    };

    const handleCloseTermsModal = () => {
        setTermsOpened(false);
        setTermsChecked(false);
        if (!termsAgreed) {
            setTermsAgreed(false);
            localStorage.setItem("termsAgreed", "false");
        }
    };

    // ── Step handlers ──────────────────────────────────────────────────────────

    const handleNext = async () => {
        if (!termsAgreed) {
            return notifications.show({
                title: "Terms not agreed",
                message: (
                    <Text size="sm">
                        You must agree to the Terms & Conditions before booking.{" "}
                        <Text
                            span
                            c="blue"
                            fw={600}
                            style={{ cursor: "pointer", textDecoration: "underline" }}
                            onClick={openTermsModal}
                        >
                            Click here to review & agree.
                        </Text>
                    </Text>
                ),
                color: "yellow",
            });
        }

        if (active === 0 && services.length === 0) {
            return notifications.show({
                title: "No Services Selected",
                message: "Please select at least one service before continuing.",
                color: "yellow",
            });
        }

        if (active === 1 && (!date || !time)) {
            return notifications.show({
                title: "Incomplete Details",
                message: "Please select a date and time before continuing.",
                color: "yellow",
            });
        }

        if (active === 1 && isSlotDisabled(time)) {
            return notifications.show({
                title: "Invalid Time Slot",
                message: "This time is either outside business hours, fully booked, or conflicts with travel buffers.",
                color: "red",
            });
        }

        if (active === 1 && availableBeds <= 0) {
            return notifications.show({
                title: "No Available Beds",
                message: "There are no available beds for the selected date and time.",
                color: "red",
            });
        }

        if (active === 1 && !selectedEmployee) {
            return notifications.show({
                title: "No Therapist Selected",
                message: "Please select a therapist before continuing.",
                color: "yellow",
            });
        }

        if (active === 1 && tempAppointmentIds.length === 0) {
            const sessionToken = localStorage.getItem("session");
            if (!sessionToken)
                return navigate(`/sign-in?redirect=/book-appointment?serviceId=${serviceId}`);

            const decoded = jwtDecode<DecodedToken>(sessionToken);
            const clientId = decoded.userId;

            try {
                setLoading(true);
                const appointment = await createAppointment({
                    clientId,
                    services: services.map((selected) => ({
                        serviceId: selected.service._id,
                        intensity: selected.intensity,
                    })),
                    date: date!,
                    startTime: time,
                    notes,
                    isTemporary: true,
                    employee: selectedEmployee || undefined,
                });
                setTempAppointmentIds([appointment._id]);
            } catch (err) {
                notifications.show({
                    title: "Error",
                    message: (err as Error).message || "Could not create temporary bookings.",
                    color: "red",
                });
                return;
            } finally {
                setLoading(false);
            }
        }

        setActive((prev) => prev + 1);
    };

    const handleBack = async () => {
        if (active === 2 && tempAppointmentIds.length > 0) {
            try {
                await Promise.all(tempAppointmentIds.map((id) => deleteAppointment(id)));
                setTempAppointmentIds([]);
            } catch (err) {
                console.warn("Failed to delete temp appointments", err);
            }
        }
        setActive((prev) => prev - 1);
    };

    const handleSubmit = async () => {
        if (services.length === 0 || !date || !time) return;
        try {
            setLoading(true);
            let appointmentIds = tempAppointmentIds;
            if (appointmentIds.length === 0) {
                const appointment = await createAppointment({
                    clientId: getClientId(),
                    services: services.map((selected) => ({
                        serviceId: selected.service._id,
                        intensity: selected.intensity,
                    })),
                    date,
                    startTime: time,
                    notes,
                    employee: selectedEmployee || undefined,
                });
                appointmentIds = [appointment._id];
            }

            if (paymentType === "Online") {
                window.location.href = await createPaymongoPayment(appointmentIds[0], paymentMode);
            } else {
                await Promise.all(appointmentIds.map((id) => confirmAppointment(id)));
                notifications.show({
                    title: "Appointments Booked!",
                    message: "Your bookings have been saved. Please pay on site.",
                    color: "green",
                });
                navigate("/my-appointments");
            }
        } catch (err) {
            notifications.show({
                title: "Booking Failed",
                message: (err as Error).message || "Something went wrong, please try again.",
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    // ── Loading guard ──────────────────────────────────────────────────────────

    if (allServices.length === 0) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader size="lg" />
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Terms & Conditions Modal */}
            <Modal opened={termsOpened} onClose={handleCloseTermsModal} title="Terms & Conditions" size="xl">
                <ScrollArea h={450} className="border border-gray-300 p-3 rounded-xl">
                    <Text size="xl" c="dimmed">
                        <strong>Booking Policy:</strong>
                        <br />• A <strong>{downPaymentPercent}% downpayment</strong> is required to confirm your booking.
                        <br />• The downpayment or full payment is <strong>(REFUNDABLE upon cancellation)</strong>.
                        <br />• Remaining <strong>{100 - downPaymentPercent}% balance</strong> must be paid before or on the day of the appointment.
                        <br />• All appointments are subject to availability and are considered confirmed only after downpayment is received.
                        <br />• Only <strong>(2) PENDING</strong> bookings are allowed for security purposes.
                        <br />• <strong>Multiple Booking</strong> is allowed but only <strong>(1) TYPE OF SERVICE PER CATEGORY</strong> is permitted.
                        <br /><br />
                        <strong>Cancellation & Rescheduling:</strong>
                        <br />• You may <strong>cancel</strong> an appointment only while it is still marked as <strong>Approved</strong>.
                        <br />• You may <strong>reschedule</strong> an appointment if it is <strong>Approved.</strong>
                        <br />• Cancellations or reschedule requests made less than 24 hours before the appointment may not be accommodated.
                        <br /><strong>• Refunds</strong> are provided for cancellations.
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
                <Checkbox
                    mt="md"
                    checked={termsChecked}
                    onChange={(e) => setTermsChecked(e.currentTarget.checked)}
                    label="I agree to the Terms & Conditions"
                />
                <Button mt="md" radius="xl" fullWidth disabled={!termsChecked} onClick={handleContinueAgree}>
                    Continue
                </Button>
            </Modal>
            <Modal opened={termsReadOnly} onClose={() => setTermsReadOnly(false)} title="Terms & Conditions" size="xl">
                <ScrollArea h={450} className="border border-gray-300 p-3 rounded-xl">
                    <Text size="xl" c="dimmed">
                        <strong>Booking Policy:</strong>
                        <br />• A <strong>{downPaymentPercent}% downpayment</strong> is required to confirm your booking.
                        <br />• The downpayment or full payment is <strong>(REFUNDABLE upon cancellation)</strong>.
                        <br />• Remaining <strong>{100 - downPaymentPercent}% balance</strong> must be paid before or on the day of the appointment.
                        <br />• All appointments are subject to availability and are considered confirmed only after downpayment is received.
                        <br />• Only <strong>(2) PENDING</strong> bookings are allowed for security purposes.
                        <br />• <strong>Multiple Booking</strong> is allowed but only <strong>(1) TYPE OF SERVICE PER CATEGORY</strong> is permitted.
                        <br /><br />
                        <strong>Cancellation & Rescheduling:</strong>
                        <br />• You may <strong>cancel</strong> an appointment only while it is still marked as <strong>Approved</strong>.
                        <br />• You may <strong>reschedule</strong> an appointment if it is <strong>Approved.</strong>
                        <br />• Cancellations or reschedule requests made less than 24 hours before the appointment may not be accommodated.
                        <br /><strong>• Refunds</strong> are provided for cancellations.
                        <br /><br />
                        <strong>Late Arrival Policy:</strong>
                        <br />• Arriving more than <strong>15 minutes late</strong> may result in a shortened session.
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
                <Button
                    mt="md"
                    fullWidth
                    color="blue"          // 👈 Sets the color to blue
                    variant="filled"      // 👈 Makes it a solid blue button
                    radius="xl"
                    onClick={() => {
                        setTermsReadOnly(false);
                        setConfirmModal(true);
                    }}
                >
                    Close
                </Button>
            </Modal>

            {/* Intensity Selection Modal */}
            <Modal
                opened={!!intensityModal}
                onClose={() => setIntensityModal(null)}
                title={`Select Intensity for ${intensityModal?.service.name}`}
                size="sm"
            >
                <Select
                    label="Intensity"
                    placeholder="Choose intensity"
                    data={
                        intensityModal?.service.intensity
                            ? intensityModal.service.intensity
                                .split(",")
                                .map((i) => i.trim())
                                .filter((i) => i)
                                .map((i) => ({ value: i, label: i }))
                            : []
                    }
                    onChange={(value) => {
                        if (value && intensityModal) intensityModal.onSelect(value);
                    }}
                />
            </Modal>
            <Modal
                opened={confirmModal}
                onClose={() => setConfirmModal(false)}
                title="Review & Confirm Booking"
                centered
                size="md"
                overlayProps={{ blur: 4 }}

            >
                <Stack gap="md">
                    {/* Warning Banner */}
                    <Box
                        p="sm"
                        style={{
                            backgroundColor: "#fff3cd",
                            borderRadius: "10px",
                            border: "1px solid #ffc107",
                        }}
                    >
                        <Text size="sm" fw={700} c="yellow.8">
                            ⚠️ Important Notice
                        </Text>
                        <Text size="sm" c="yellow.9" mt={4}>
                            Client-initiated cancellations are <b>non-refundable</b>. Only admin-approved cancellations are eligible for a refund.
                        </Text>
                    </Box>

                    {/* Terms Summary */}
                    <Box
                        p="sm"
                        style={{
                            backgroundColor: "#f8f9fa",
                            borderRadius: "10px",
                            border: "1px solid #dee2e6",
                        }}
                    >
                        <Text size="md" fw={700} mb="xs">📋 Terms & Conditions Summary</Text>
                        <Stack gap={4}>
                            <Text size="md" c="dimmed">• A <b>{downPaymentPercent}% downpayment</b> is required to confirm your booking.</Text>
                            <Text size="md" c="dimmed">• Remaining <b>{100 - downPaymentPercent}% balance</b> must be paid before or on the day of the appointment.</Text>
                            <Text size="md" c="dimmed">• Only <b>2 pending</b> bookings are allowed at a time.</Text>
                            <Text size="md" c="dimmed">• Cancellations or reschedule requests made less than <b>24 hours</b> before the appointment may not be accommodated.</Text>
                            <Text size="md" c="dimmed">• Arriving more than <b>15 minutes late</b> may result in a shortened session.</Text>
                            <Text size="md" c="dimmed">• Inappropriate behavior may result in <b>immediate termination</b> of the session with no refund.</Text>
                        </Stack>
                        <Text
                            size="xs"
                            c="blue"
                            mt="xs"
                            style={{ cursor: "pointer", textDecoration: "underline" }}
                            onClick={() => {
                                setConfirmModal(false); // 👈 Add this line to close the review modal
                                setTermsReadOnly(true); // Open the full terms
                            }}
                        >
                            View full Terms & Conditions
                        </Text>
                    </Box>

                    {/* Booking Summary */}
                    <Box
                        p="sm"
                        style={{
                            backgroundColor: "#f0faf0",
                            borderRadius: "10px",
                            border: "1px solid #b2f2bb",
                        }}
                    >
                        <Text size="sm" fw={700} mb="xs">🗓 Booking Summary</Text>
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed">Date</Text>
                            <Text size="xs" fw={600}>{date}</Text>
                        </Group>
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed">Time</Text>
                            <Group justify="space-between">

                                <Text size="xs" fw={600}>
                                    {time ? dayjs(`2026-01-01T${time}`).format("h:mm A") : "-"}
                                </Text>
                            </Group>                                    </Group>
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed">Total</Text>
                            <Text size="xs" fw={600}>₱{services.reduce((sum, s) => sum + s.service.price, 0).toFixed(2)}</Text>
                        </Group>
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed">Payment</Text>
                            <Text size="xs" fw={600}>{paymentType} ({paymentMode})</Text>
                        </Group>
                    </Box>

                    <Group grow mt="xs">
                        <Button variant="outline" color="gray" onClick={() => setConfirmModal(false)}>
                            Go Back
                        </Button>
                        <Button
                            color="blue"
                            loading={loading}
                            onClick={() => {
                                setConfirmModal(false);
                                void handleSubmit();
                            }}
                        >
                            {paymentType === "Online" ? "Proceed to Payment" : "Confirm Booking"}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
            <Container size="2xl" className="py-1">
                <div className="flex flex-col md:flex-col gap-10">

                    {/* Selected Services Summary */}
                    <Card shadow="md" radius="md" withBorder className="flex-1 overflow-hidden bg-white/80 backdrop-blur-sm">
                        <Title order={4} mb="md">Selected Services</Title>

                        <ScrollArea h={300}>
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                {services.map((selected) => (
                                    <Card key={selected.service._id} withBorder radius="md" mb="sm">
                                        <Group>
                                            <div style={{ height: 60, width: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <Image src={selected.service.imageUrl || "/img/placeholder.jpg"} height="100%" width="100%" fit="contain" alt={selected.service.name} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <Text fw={500} size="sm">{selected.service.name}</Text>

                                                {selected.intensity && <Text size="sm" c="blue">Intensity: {selected.intensity}</Text>
                                                }
                                                <Text size="sm" c="dimmed">{selected.service.description}</Text>

                                                <Group justify="space-between" mt={15}>

                                                    <Text size="sm" c="dimmed">{selected.service.duration} mins</Text>
                                                </Group>
                                            </div>
                                            <Button
                                                variant="subtle"
                                                color="red"
                                                size="sm"
                                                onClick={() => setServices((prev) => prev.filter((s) => s.service._id !== selected.service._id))}
                                            >
                                                Remove
                                            </Button>
                                        </Group>

                                    </Card>

                                ))}
                            </SimpleGrid>
                        </ScrollArea>
                        <Divider my="md" />
                        <Group justify="space-between" align="flex-end">
                            <Text fw={600}>Total Price: ₱{services.reduce((sum, s) => sum + s.service.price, 0).toFixed(2)}</Text>
                            <div style={{ textAlign: 'right' }}>
                                <Text fw={600}>Total Duration: {services.reduce((sum, s) => sum + s.service.duration, 0)} mins</Text>
                                {(occupancy?.bufferTime ?? spaSettings?.bufferTime) ? (
                                    <Group gap="xs" justify="flex-end" mt={4}>
                                        <Text size="xs" c="dimmed">
                                            {services.reduce((sum, s) => sum + s.service.duration, 0)} mins + {occupancy?.bufferTime ?? spaSettings?.bufferTime} mins buffer
                                        </Text>
                                        <Badge variant="filled" color="teal" size="lg">
                                            ⏱ {services.reduce((sum, s) => sum + s.service.duration, 0) + (occupancy?.bufferTime ?? spaSettings?.bufferTime ?? 0)} mins total slot
                                        </Badge>
                                    </Group>
                                ) : null}
                            </div>
                        </Group>
                    </Card>

                    {/* Booking Stepper */}
                    <Card shadow="lg" radius="lg" withBorder className="flex-1 bg-white/80 backdrop-blur-sm relative">
                        <Title order={4} mb="md">Book Your Appointment</Title>

                        <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>

                            {/* Step 1: Select Services */}
                            <Stepper.Step label="Select Services">
                                <Text mb="md">Choose the services you want to book:</Text>
                                <ScrollArea h={700}>
                                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                        {allServices.map((s) => {
                                            const isSelected = services.some((sel) => sel.service._id === s._id);
                                            return (
                                                <Card
                                                    key={s._id}
                                                    shadow={isSelected ? "lg" : "sm"}
                                                    radius="md"
                                                    withBorder
                                                    style={{ cursor: "pointer", borderColor: isSelected ? "green" : undefined }}
                                                    onClick={() => {
                                                        const intensityOptions = s.intensity
                                                            ? s.intensity.split(",").map((i) => i.trim()).filter((i) => i)
                                                            : [];
                                                        if (isSelected) {
                                                            notifications.show({ title: "Already Added", message: `${s.name} is already in your selected services.`, color: "yellow" });
                                                            return;
                                                        }
                                                        if (intensityOptions.length > 0) {
                                                            setIntensityModal({
                                                                service: s,
                                                                onSelect: (intensity: string) => {
                                                                    setServices((prev) => [...prev, { service: s, intensity }]);
                                                                    setIntensityModal(null);
                                                                },
                                                                isUpdate: false,
                                                            });
                                                        } else {
                                                            setServices((prev) => [...prev, { service: s }]);
                                                        }
                                                    }}
                                                >
                                                    <Image src={s.imageUrl || "/img/placeholder.jpg"} h={350} fit="contain" alt={s.name} />
                                                    <Text fw={500} size="xl" mt="xs">{s.name}</Text>
                                                    <Text size="md" c="dimmed">{s.description}</Text>
                                                    <Group justify="space-between" mt="xs">
                                                        <Text fw={600} size="lg">₱{s.price}</Text>
                                                        <Text size="lg" c="dimmed">{s.duration} mins</Text>
                                                    </Group>
                                                    {isSelected && <Badge color="green" size="sm" mt="xs">Selected</Badge>}
                                                </Card>
                                            );
                                        })}
                                    </SimpleGrid>
                                </ScrollArea>
                                {services.length > 0 && (
                                    <Text mt="md" fw={600}>
                                        Selected Services: {services.length} (₱{services.reduce((sum, s) => sum + s.service.price, 0).toFixed(2)} total)
                                    </Text>
                                )}
                            </Stepper.Step>

                            {/* Step 2: Select Availability */}
                            <Stepper.Step label="Select Availability">
                                <Group grow mb="md">
                                    <Box mb="md">
                                        <Text fw={600} mb="xs">Massage Therapist</Text>
                                        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                                            {employees.map((emp, index) => {
                                                const statusUnavailable = emp.status === "unavailable";
                                                const worksThisDay = date ? isEmployeeWorkingOnDay(emp, date) : true;
                                                const isBusy = date && time ? isEmployeeBusy(emp, date, time) : false;
                                                const canClick = !statusUnavailable && worksThisDay && !isBusy;

                                                return (
                                                    <Card
                                                        key={`${emp._id}-${index}`}
                                                        shadow={selectedEmployee === emp._id ? "lg" : "sm"}
                                                        radius="md"
                                                        withBorder
                                                        style={{
                                                            cursor: statusUnavailable ? "not-allowed" : "pointer",
                                                            opacity: canClick ? 1 : 0.5,
                                                            borderColor: selectedEmployee === emp._id ? "green" : undefined,
                                                        }}
                                                        onClick={() => {
                                                            if (statusUnavailable) return;

                                                            // 1. Check if the therapist is within their "Occupancy" period (Service + Buffer)
                                                            // We use the same appointmentsForDay logic we added to isSlotDisabled
                                                            const therapistBusy = appointmentsForDay.some((appt) => {
                                                                if (appt.employee?._id !== emp._id) return false;

                                                                const buffer = occupancy?.bufferTime ?? 15;
                                                                const proposedStartMin = toMinutes(time);
                                                                const totalDuration = services.reduce((sum, s) => sum + s.service.duration, 0);
                                                                const proposedClearMin = proposedStartMin + totalDuration + buffer;

                                                                const existStartMin = toMinutes(appt.startTime);
                                                                const existEndMin = toMinutes(appt.endTime);
                                                                const existClearMin = existEndMin + buffer;

                                                                // Overlap Check: (StartA < EndB) AND (EndA > StartB)
                                                                return proposedStartMin < existClearMin && proposedClearMin > existStartMin;
                                                            });

                                                            if (therapistBusy) {
                                                                notifications.show({
                                                                    title: "Therapist Unavailable",
                                                                    message: `${emp.name} is currently in a session or cleanup buffer.`,
                                                                    color: "red"
                                                                });
                                                                return;
                                                            }

                                                            if (!worksThisDay) {
                                                                notifications.show({
                                                                    title: "Therapist Off-Duty",
                                                                    message: `${emp.name} does not work on ${dayjs(date).format("dddd")}.`,
                                                                    color: "yellow"
                                                                });
                                                                return;
                                                            }

                                                            setSelectedEmployee(emp._id);
                                                        }}
                                                        p="xs"

                                                    >
                                                        {isMobile ? (
                                                            <Group gap="sm" wrap="nowrap">
                                                                <Box style={{ width: 50, height: 50, flexShrink: 0, borderRadius: 8, overflow: 'hidden' }}>
                                                                    <Image src={emp.imageUrl || "/img/placeholder.jpg"} alt={emp.name} fit="cover" height="100%" width="100%" />
                                                                </Box>
                                                                <div style={{ flex: 1 }}>
                                                                    <Text ta="left" size="sm" fw={500}>{emp.name}</Text>
                                                                    {selectedEmployee === emp._id && (
                                                                        <Badge color="green" size="xs" mt={4} variant="light">Selected</Badge>
                                                                    )}
                                                                </div>
                                                            </Group>
                                                        ) : (
                                                            <>
                                                                <Box style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 8 }}>
                                                                    <Image src={emp.imageUrl || "/img/placeholder.jpg"} alt={emp.name} fit="cover" height="100%" width="100%" />
                                                                </Box>
                                                                <Text ta="center" size="sm" fw={500} mt="xs">{emp.name}</Text>
                                                                {selectedEmployee === emp._id && (
                                                                    <Badge color="green" size="sm" mt="xs" fullWidth variant="light">Selected</Badge>
                                                                )}
                                                            </>
                                                        )}

                                                    </Card>
                                                );
                                            })}
                                        </SimpleGrid>

                                        <Box mt="md">
                                            {(() => {
                                                const beds = (() => {
                                                    if (!occupancy) return availableBeds;
                                                    if (!time) return occupancy.totalRooms;
                                                    const booked = occupancy.bookings.filter(({ start, end }) => {
                                                        const check = dayjs(`2026-01-01T${time}`);
                                                        const s = dayjs(`2026-01-01T${start}`);
                                                        const e = dayjs(`2026-01-01T${end}`).add(occupancy?.bufferTime ?? 15, "minute");
                                                        return (check.isSame(s) || check.isAfter(s)) && check.isBefore(e);
                                                    }).length;
                                                    return Math.max(0, occupancy.totalRooms - booked);
                                                })();
                                                return (
                                                    <>
                                                        <Text fw={600} mb="xs" ta="center">Available Beds</Text>
                                                        <Text size="48px" fw={700} ta="center"
                                                              c={beds === 0 ? "red" : "green"}
                                                              style={{ lineHeight: 1 }}
                                                        >
                                                            {beds === 0 ? "No Available Beds" : beds}
                                                        </Text>
                                                    </>
                                                );
                                            })()}
                                        </Box>
                                    </Box>
                                </Group>
                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">

                                    {/* DATE */}
                                    <Box p="lg" style={{
                                        background: "white",
                                        borderRadius: "16px",
                                        border: "1px solid var(--mantine-color-gray-2)",
                                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                    }}>
                                        <Group justify="space-between" mb="sm" align="center">
                                            <Group gap="xs">
                                                <Box style={{
                                                    width: 32, height: 32, borderRadius: 8,
                                                    background: "var(--mantine-color-blue-0)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                }}>
                                                    <IconCalendar size={16} color="var(--mantine-color-blue-6)" />
                                                </Box>
                                                <Text fw={600} size="sm" c="dark.4">Date</Text>
                                            </Group>
                                            {date && (
                                                <Badge variant="light" color="blue" radius="xl" size="sm">
                                                    {dayjs(date).format("ddd, MMM D")}
                                                </Badge>
                                            )}
                                        </Group>

                                        <DateInput
                                            placeholder="Select a date"
                                            value={date ? new Date(date) : null}
                                            onChange={(val) => setDate(val ? dayjs(val).format("YYYY-MM-DD") : null)}
                                            minDate={new Date()}
                                            size="md"
                                            radius="md"
                                            styles={{
                                                input: {
                                                    border: "1.5px solid var(--mantine-color-gray-3)",
                                                    borderRadius: "10px",
                                                    fontWeight: 500,
                                                    fontSize: "14px",
                                                },
                                            }}
                                            rightSection={
                                                date ? (
                                                    <Text size="xs" c="dimmed" style={{ cursor: "pointer" }} onClick={() => setDate(null)}>✕</Text>
                                                ) : null
                                            }
                                        />

                                        {date && (
                                            <Group gap={6} mt="sm">
                                                <Badge variant="dot" color="green" size="xs" radius="xl">
                                                    {dayjs(date).format("MMMM D, YYYY")}
                                                </Badge>
                                                <Badge variant="dot" color="blue" size="xs" radius="xl">
                                                    {dayjs(date).format("dddd")}
                                                </Badge>
                                            </Group>
                                        )}
                                    </Box>

                                    {/* TIME */}
                                    <Box p="lg" style={{
                                        background: "white",
                                        borderRadius: "16px",
                                        border: "1px solid var(--mantine-color-gray-2)",
                                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                    }}>
                                        <Group justify="space-between" mb="sm" align="center">
                                            <Group gap="xs">
                                                <Box style={{
                                                    width: 32, height: 32, borderRadius: 8,
                                                    background: "var(--mantine-color-teal-0)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                }}>
                                                    <IconClock size={16} color="var(--mantine-color-teal-6)" />
                                                </Box>
                                                <Text fw={600} size="sm" c="dark.4">Time</Text>
                                            </Group>
                                            {!selectedEmployee ? (
                                                <Badge variant="light" color="gray" radius="xl" size="sm">Select a therapist first</Badge>
                                            ) : time && (occupancy?.bufferTime ?? spaSettings?.bufferTime) ? (
                                                <Badge variant="light" color="teal" radius="xl" size="sm">
                                                    Clears at {dayjs(`2026-01-01T${time}`)
                                                    .add(services.reduce((sum, s) => sum + s.service.duration, 0), "minute")
                                                    .add(occupancy?.bufferTime ?? spaSettings?.bufferTime ?? 0, "minute")
                                                    .format("h:mm A")}
                                                </Badge>
                                            ) : null}
                                        </Group>

                                        <SimpleGrid cols={4} spacing={8}>
                                            {(() => {
                                                const openingTime = occupancy?.openingTime ?? spaSettings?.openingTime;
                                                const closingTime = occupancy?.closingTime ?? spaSettings?.closingTime;
                                                if (!openingTime || !closingTime) return [];
                                                const bufferMins = occupancy?.bufferTime ?? spaSettings?.bufferTime ?? 15;
                                                const generatedSlots: string[] = [];
                                                let current = dayjs(`2026-01-01T${openingTime}`);
                                                const closing = dayjs(`2026-01-01T${closingTime}`);
                                                const end = closing.isBefore(current) ? closing.add(1, "day") : closing;
                                                while (current.isBefore(end)) {
                                                    generatedSlots.push(current.format("HH:mm"));
                                                    current = current.add(1, "hour");
                                                }
                                                if (occupancy?.bookings) {
                                                    occupancy.bookings.forEach(({ end: bookingEnd }) => {
                                                        const bufferEnd = dayjs(`2026-01-01T${bookingEnd}`)
                                                            .add(bufferMins, "minute")
                                                            .format("HH:mm");
                                                        if (!generatedSlots.includes(bufferEnd)) generatedSlots.push(bufferEnd);
                                                    });
                                                }
                                                return generatedSlots.sort((a, b) =>
                                                    dayjs(`2026-01-01T${a}`).valueOf() - dayjs(`2026-01-01T${b}`).valueOf()
                                                );
                                            })().map((slot) => {
                                                const disabled = isSlotDisabled(slot);
                                                const noTherapist = !selectedEmployee;
                                                const selected = time === slot;
                                                const unavailable = disabled || noTherapist;
                                                return (
                                                    <button
                                                        key={slot}
                                                        onClick={() => { if (!unavailable) setTime(slot); }}
                                                        disabled={unavailable}
                                                        style={{
                                                            borderRadius: 10,
                                                            padding: "10px 4px",
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            alignItems: "center",
                                                            gap: 2,
                                                            cursor: unavailable ? "not-allowed" : "pointer",
                                                            border: selected
                                                                ? "2px solid var(--mantine-color-blue-5)"
                                                                : unavailable
                                                                    ? "1.5px solid var(--mantine-color-gray-2)"
                                                                    : "1.5px solid var(--mantine-color-teal-3)",
                                                            background: selected
                                                                ? "var(--mantine-color-blue-0)"
                                                                : unavailable
                                                                    ? "white"
                                                                    : "var(--mantine-color-teal-0)",
                                                            opacity: unavailable ? 0.38 : 1,
                                                            transition: "border-color 0.14s ease, background 0.14s ease",
                                                            position: "relative",
                                                            width: "100%",
                                                        }}
                                                    >
                                                        {selected && (
                                                            <span style={{
                                                                position: "absolute", top: 0, left: 0, right: 0,
                                                                height: 3, borderRadius: "10px 10px 0 0",
                                                                background: "var(--mantine-color-blue-5)",
                                                            }} />
                                                        )}
                                                        <Text
                                                            size="sm"
                                                            fw={selected ? 600 : 500}
                                                            c={selected ? "blue.6" : unavailable ? "dimmed" : "teal.7"}
                                                            style={{ textDecoration: disabled ? "line-through" : "none", lineHeight: 1.2, pointerEvents: "none" }}
                                                        >
                                                            {dayjs(`2026-01-01 ${slot}`).format("h:mm")}
                                                        </Text>
                                                        <Text size="10px" c={selected ? "blue.4" : unavailable ? "dimmed" : "teal.5"} style={{ pointerEvents: "none" }}>
                                                            {dayjs(`2026-01-01 ${slot}`).format("A")}
                                                        </Text>
                                                    </button>
                                                );
                                            })}
                                        </SimpleGrid>

                                        {time && (
                                            <Box mt="md" p="sm" style={{
                                                background: "var(--mantine-color-blue-0)",
                                                borderRadius: 10,
                                                border: "1px solid var(--mantine-color-blue-2)",
                                            }}>
                                                <Group justify="space-between">
                                                    <Text size="xs" c="blue.7"><b>Start:</b> {dayjs(`2026-01-01T${time}`).format("h:mm A")}</Text>
                                                    <Text size="xs" c="blue.7">
                                                        <b>End:</b> {dayjs(`2026-01-01T${time}`)
                                                        .add(services.reduce((sum, s) => sum + s.service.duration, 0), "minute")
                                                        .format("h:mm A")}
                                                    </Text>
                                                    <Text size="xs" c="blue.7"><b>Buffer:</b> {occupancy?.bufferTime ?? spaSettings?.bufferTime ?? 0} min</Text>
                                                </Group>
                                            </Box>
                                        )}

                                        <Group gap={12} justify="center" mt="md">
                                            {[
                                                { color: "var(--mantine-color-teal-5)", label: "Available" },
                                                { color: "var(--mantine-color-blue-5)", label: "Selected" },
                                                { color: "var(--mantine-color-gray-4)", label: "Unavailable" },
                                            ].map(({ color, label }) => (
                                                <Group key={label} gap={6}>
                                                    <Box style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                                                    <Text size="xs" c="dimmed">{label}</Text>
                                                </Group>
                                            ))}
                                        </Group>
                                    </Box>

                                </SimpleGrid>

                                <BookingCalendar
                                    employee={employees.find((e) => e._id === selectedEmployee)}
                                    onDateSelect={(selectedDate) => {
                                        const normalized = dayjs(selectedDate).format("YYYY-MM-DD");
                                        console.log("BookingCalendar selected:", selectedDate, "→", normalized);
                                        setDate(normalized);
                                    }}
                                />

                            </Stepper.Step>

                            {/* Step 3: Notes & Payment */}
                            <Stepper.Step label="Notes & Payment">
                                <Textarea
                                    label="Notes (optional)"
                                    placeholder="Add any notes or preferences..."
                                    minRows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.currentTarget.value)}
                                    mb="lg"
                                />
                                <Stack gap="sm">
                                    <SegmentedControl
                                        fullWidth
                                        value={paymentType}
                                        onChange={(v) => setPaymentType(v as "Cash" | "Online")}
                                        data={[
                                            { label: "Pay on Site", value: "Cash" },
                                            { label: "Pay Online", value: "Online" },
                                        ]}
                                    />
                                    {paymentType === "Online" && (
                                        <SegmentedControl
                                            fullWidth
                                            value={paymentMode}
                                            onChange={(v) => setPaymentMode(v as "Full" | "Downpayment")}
                                            data={[
                                                { label: "Full Payment", value: "Full" },
                                                { label: `Downpayment (${downPaymentPercent}%)`, value: "Downpayment" },
                                            ]}
                                        />
                                    )}
                                </Stack>
                            </Stepper.Step>

                            {/* Step 4: Review & Confirm */}
                            <Stepper.Step label="Review & Confirm">
                                <Stack>
                                    <Text><b>Services:</b></Text>
                                    {services.map((selected) => (
                                        <Text key={selected.service._id} ml="md">
                                            • {selected.service.name} - ₱{selected.service.price} ({selected.service.duration} mins)
                                            {selected.intensity && ` (Intensity: ${selected.intensity})`}
                                        </Text>
                                    ))}
                                    <Text><b>Total Price:</b> ₱{services.reduce((sum, s) => sum + s.service.price, 0).toFixed(2)}</Text>
                                    <Text><b>Total Duration:</b> {services.reduce((sum, s) => sum + s.service.duration, 0)} mins</Text>
                                    <Text><b>Date:</b> {date}</Text>
                                    <Text><b>Time:</b> {time}</Text>
                                    <Text><b>Payment:</b> {paymentType} ({paymentMode})</Text>
                                </Stack>
                            </Stepper.Step>

                            <Stepper.Completed>
                                <Text ta="center" fw={500} c="green">Booking complete!</Text>
                            </Stepper.Completed>
                        </Stepper>

                        {/* Navigation Buttons */}
                        <Group justify="space-between" mt="xl" className="sticky bottom-0 py-4 border-t">
                            {active > 0 && (
                                <Button variant="default" onClick={handleBack}>Back</Button>
                            )}
                            {active < 2 ? (
                                <Button onClick={handleNext} loading={loading}>Next</Button>
                            ) : (
                                <Button loading={loading} onClick={() => setConfirmModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {paymentType === "Online" ? "Proceed to Payment" : "Confirm Booking"}
                                </Button>
                            )}
                        </Group>
                    </Card>
                </div>
            </Container>
        </>
    );
}

