import {useEffect, useState} from "react";
import {
    Accordion,
    Badge,
    Card,
    Divider,
    Flex,
    Group,
    Loader,
    Text,
    Title,
    Alert,
} from "@mantine/core";
import {IconInfoCircle} from "@tabler/icons-react";
import {showNotification} from "@mantine/notifications";
import {PaymentHistoryModal} from "../../components/PaymentHistoryModal";
import {PaymentActions} from "../../components/PaymentActions";
import {type Appointment, getClientAppointments} from "../../api/appointments";

const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes));
    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
};

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        Completed: "green",
        Approved: "blue",
        Pending: "yellow",
        Cancelled: "red",
    };
    return colors[status] || "orange";
};

const groupByDate = (appointments: Appointment[]) =>
    appointments.reduce((acc: Record<string, Appointment[]>, a) => {
        const dateKey = new Date(a.date).toISOString().split("T")[0];
        (acc[dateKey] ||= []).push(a);
        return acc;
    }, {});

export default function Appointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const data = await getClientAppointments();
            setAppointments(data);
        } catch (err: any) {
            showNotification({
                color: "red",
                title: "Error",
                message: err.message || "Failed to load appointments",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    if (loading)
        return (
            <Group justify="center" py="xl">
                <Loader/>
            </Group>
        );

    const grouped = groupByDate(appointments);

    const needsAction = (items: Appointment[]) =>
        items.some((a) => {
            if (a.status === "Pending") return true;
            const totalPaid = a.payments
                ?.filter((p: any) => p.status === "Completed")
                .reduce((sum: number, p: any) => sum + p.amount, 0);
            const remaining = a.serviceId?.price - (totalPaid || 0);
            return remaining > 0 && a.status !== "Cancelled" && a.status !== "Completed";
        });

    return (
        <>
            {/* --- TERMS AND CONDITIONS SECTION --- */}
            <Alert
                icon={<IconInfoCircle size={20}/>}
                title={<Title order={5}>Booking Terms & Conditions</Title>}
                color="blue"
                radius="md"
                mb="md"
            >
                <Text size="sm" c="dimmed">
                    • A <strong>30% downpayment</strong> is required to confirm your booking. Once paid, your
                    appointment will be marked as <strong>Approved</strong>.<br/>
                    • The downpayment is <strong>non-refundable</strong> to ensure schedule commitment and discourage
                    cancellations.<br/>
                    • The remaining <strong>70% balance</strong> must be paid before or on the day of your
                    appointment.<br/>
                    • You may <strong>cancel</strong> an appointment only while it is
                    still <strong>Pending</strong>.<br/>
                    • You may <strong>reschedule</strong> an appointment only if it
                    is <strong>Approved</strong> or <strong>Rescheduled</strong>, and at least <strong>24 hours
                    before</strong> your scheduled start time.<br/>
                </Text>
            </Alert>

            {/* --- APPOINTMENTS ACCORDION --- */}
            <Accordion variant="separated" radius="md" multiple>
                {Object.entries(grouped).map(([date, items]) => {
                    const actionRequired = needsAction(items);

                    return (
                        <Accordion.Item key={date} value={date}>
                            <Accordion.Control>
                                <Group justify="space-between">
                                    <Text fw={600}>
                                        {new Date(date).toLocaleDateString(undefined, {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </Text>

                                    {actionRequired && (
                                        <Text c="red" mr="sm" size="xs" fw="bold">
                                            Action Required *
                                        </Text>
                                    )}
                                </Group>
                            </Accordion.Control>

                            <Accordion.Panel>
                                {items.map((a) => (
                                    <Card
                                        key={a._id}
                                        withBorder
                                        radius="md"
                                        shadow="sm"
                                        className="p-4 mb-3 bg-white hover:shadow-md transition-all"
                                    >
                                        <Flex
                                            direction={{base: "column", sm: "row"}}
                                            align={{base: "stretch", sm: "center"}}
                                            justify="space-between"
                                            gap="md"
                                        >
                                            {/* LEFT SECTION */}
                                            <Flex direction="column" gap={6} className="flex-1">
                                                {a.serviceId ? (
                                                    <>
                                                        <Group justify="space-between">
                                                            <Text fw={600} size="xl">
                                                                {a.serviceId?.name}
                                                            </Text>
                                                            <Badge color={getStatusColor(a.status)}>
                                                                {a.status}
                                                            </Badge>
                                                        </Group>

                                                        <Text size="sm">{a.serviceId?.category}</Text>
                                                        <Text size="sm" c="dimmed">
                                                            {a.serviceId?.description}
                                                        </Text>

                                                        <Group justify="space-between">
                                                            <Text fw={500} size="md">
                                                                {formatTime(a.startTime)} –{" "}
                                                                {formatTime(a.endTime)}
                                                            </Text>
                                                            <Text fw={500}>
                                                                ₱{a.serviceId?.price.toFixed(2)}
                                                            </Text>
                                                        </Group>
                                                    </>
                                                ) : 'Appointment record is not available. Service has been deleted.'}

                                            </Flex>

                                            {/* Divider */}
                                            <Divider orientation="vertical" visibleFrom="sm"/>
                                            <Divider orientation="horizontal" hiddenFrom="sm"/>

                                            {/* RIGHT SECTION */}
                                            <Flex
                                                direction="column"
                                                gap="xs"
                                                align="center"
                                                className="w-full sm:w-[220px]"
                                            >
                                                <PaymentActions
                                                    appointment={a}
                                                    refresh={fetchAppointments}
                                                />
                                                <PaymentHistoryModal payments={a.payments ?? []}/>
                                            </Flex>
                                        </Flex>
                                    </Card>
                                ))}
                            </Accordion.Panel>
                        </Accordion.Item>
                    );
                })}
            </Accordion>
        </>
    );
}
