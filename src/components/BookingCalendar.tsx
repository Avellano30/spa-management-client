import { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Card, Center, Loader, Title, Group, SegmentedControl, ActionIcon, Text, Stack } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { getAppointments } from "../api/appointments";
import { getSpaSettings, type SpaSettings } from "../api/settings";
import { showNotification } from "@mantine/notifications";
import dayjs from "dayjs";

interface Props {
    employee?: any;
    onDateSelect?: (date: string) => void;
    onAvailabilityChange?: (availableBeds: number) => void;
}

// Define the shape of your booking events for TypeScript
interface BookingEvent {
    title: string;
    start: string;
    end: string;
    color: string;
    extendedProps: {
        employee: string;
    };
}

export default function BookingCalendar({
                                            onDateSelect,
                                            onAvailabilityChange,
                                        }: Props) {
    // Use 'null' as initial value and type it with FullCalendar
    const calendarRef = useRef<FullCalendar>(null);
    const [view, setView] = useState("dayGridMonth");

    // Fix: Initialize as an empty array [] instead of an object {}
    const [bookings, setBookings] = useState<BookingEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [spaSettings, setSpaSettings] = useState<SpaSettings | null>(null);

    useEffect(() => {
        load();
        getSpaSettings().then(setSpaSettings).catch(console.error);
    }, []);

    const handlePrev = () => calendarRef.current?.getApi().prev();
    const handleNext = () => calendarRef.current?.getApi().next();
    const handleToday = () => calendarRef.current?.getApi().today();

    const handleViewChange = (newView: string) => {
        setView(newView);
        calendarRef.current?.getApi().changeView(newView);
    };

    const load = async () => {
        try {
            console.log("1. Load started...");
            const [approved, rescheduled, pending] = await Promise.all([
                getAppointments({ status: "Approved" }),
                getAppointments({ status: "Rescheduled" }),
                getAppointments({ status: "Pending" }),
            ]);

            const data = [...approved, ...rescheduled, ...pending];
            console.log("2. Raw data from API:", data); // Check if startTime here has minutes!

            const formatted: BookingEvent[] = data.map((item) => {
                console.log(`3. Mapping ${item._id}: ${item.startTime}`);

                const [date] = item.date.split("T");
                const start12 = to12Hour(item.startTime);
                const end12 = to12Hour(item.endTime);

                return {
                    title: `${start12} - ${end12}`,
                    start: `${date}T${item.startTime}:00`,
                    end: `${date}T${item.endTime}:00`,
                    color: "#fa5252",
                    extendedProps: { employee: `${item.employee}` },
                };
            });

            setBookings(formatted);
        } catch (err: any) {
            console.error("4. Load Error:", err);
            showNotification({ color: "red", title: "Error", message: err.message });
        } finally {
            setLoading(false);
        }
    };

    function to12Hour(time24: string) {
        if (!time24) return "";

        // Split by colon
        const parts = time24.split(":");
        const hourStr = parts[0];

        // FIX: If parts[1] is missing, use "00"
        const minute = parts[1] ? parts[1].padStart(2, "0") : "00";

        let hour = parseInt(hourStr, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;

        return `${hour}:${minute} ${ampm}`;
    }

    if (loading) return <Center h="70vh"><Loader size="lg" /></Center>;

    return (
        <Card shadow="md" padding="xl" radius="lg" withBorder>
            <Stack gap="md" mb="xl">
                {/* Title */}
                <Group justify="space-between">
                    <Stack gap={0}>
                        <Title order={3} fw={800}>Availability</Title>
                        <Text size="sm" c="dimmed">Select a date to see available slots</Text>
                    </Stack>
                    {/* Navigation */}
                    <Group gap={5}>
                        <ActionIcon variant="default" size="lg" onClick={handlePrev} radius="md">
                            <IconChevronLeft size={18} />
                        </ActionIcon>
                        <ActionIcon variant="default" size="lg" onClick={handleToday} radius="md" px="md" style={{ width: 'auto' }}>
                            <Text size="xs" fw={700}>TODAY</Text>
                        </ActionIcon>
                        <ActionIcon variant="default" size="lg" onClick={handleNext} radius="md">
                            <IconChevronRight size={18} />
                        </ActionIcon>
                    </Group>
                </Group>

                {/* Legend + View Toggle */}
                <Group justify="space-between" wrap="wrap">
                    <Group gap="xs" wrap="wrap">
                        <Group gap={4}>
                            <div style={{ width: 15, height: 15, borderRadius: '50%', backgroundColor: '#40c057' }} />
                            <Text size="md" c="dimmed">Available</Text>
                        </Group>
                        <Group gap={4}>
                            <div style={{ width: 15, height: 15, borderRadius: '50%', backgroundColor: '#f59f00' }} />
                            <Text size="md" c="dimmed">Limited (1-2 slots)</Text>
                        </Group>
                        <Group gap={4}>
                            <div style={{ width: 15, height: 15, borderRadius: '50%', backgroundColor: '#fa5252' }} />
                            <Text size="md" c="dimmed">Fully Booked</Text>
                        </Group>
                    </Group>
                    <SegmentedControl
                        value={view}
                        onChange={handleViewChange}
                        data={[
                            { label: 'Month', value: 'dayGridMonth' },
                            { label: 'Week', value: 'timeGridWeek' },
                        ]}
                        radius="md"
                    />
                </Group>
            </Stack>
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={false}
                validRange={{
                    start: dayjs().startOf("day").format("YYYY-MM-DD"),
                }}
                events={bookings}
                dateClick={(arg) => {
                    const eventsOnDate = bookings.filter((event) =>
                        event.start.startsWith(arg.dateStr)
                    ).length;
                    const totalRooms = spaSettings?.totalRooms || 0;
                    const availableBeds = totalRooms - eventsOnDate;
                    if (onAvailabilityChange) onAvailabilityChange(availableBeds);
                    if (onDateSelect) onDateSelect(arg.dateStr);
                }}
                height="auto"
                editable={false}
                selectable={true}
                displayEventTime={true}
                eventDisplay="block"
                eventTimeFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short',
                    hour12: true,
                    omitZeroMinute: false
                }}
                eventClassNames="client-event-pill"
                dayCellContent={(arg) => {
                    const totalRooms = spaSettings?.totalRooms || 0; // 👈 define it here
                    const dateStr = dayjs(arg.date).format("YYYY-MM-DD");
                    const booked = bookings.filter((event) =>
                        event.start.startsWith(dateStr)
                    ).length;
                    const available = Math.max(0, totalRooms - booked);
                    const isPast = dayjs(arg.date).isBefore(dayjs().startOf("day"));
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <div>{arg.dayNumberText}</div>
                            {!isPast && totalRooms > 0 && (
                                <div style={{
                                    backgroundColor: available === 0 ? '#fa5252' : available <= 2 ? '#f59f00' : '#40c057',
                                    color: 'white',
                                    borderRadius: '999px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    minWidth: '25px',
                                    textAlign: 'center',
                                }}>
                                    {available === 0 ? 'Full' : available}
                                </div>
                            )}
                        </div>
                    );
                }}
            />
        </Card>
    );
}