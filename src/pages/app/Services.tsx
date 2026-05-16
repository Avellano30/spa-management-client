import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
    Modal,
    Select,
    Grid,
    Card,
    Image,
    Text,
    Button,
    Loader,
    Center,
    Stack,
    Title,
    Badge,
    Group,
    Container,
    ScrollArea,
    Checkbox,
} from "@mantine/core";
import { getAllServices, type Service } from "../../api/services";
import classes from "./components/FeaturesCards.module.css";
import { useHomepageSettings } from "../../utils/HomepageSettingsContext.tsx";

export default function AppServices() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const homepageSettings = useHomepageSettings();
    const navigate = useNavigate();
    const [intensityModal, setIntensityModal] = useState<{ service: Service } | null>(null);
    const [termsOpened, setTermsOpened] = useState(false);
    const [termsChecked, setTermsChecked] = useState(false);
    const [pendingService, setPendingService] = useState<Service | null>(null);

    useEffect(() => {
        getAllServices()
            .then(setServices)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const proceedToBook = (service: Service) => {
        const intensityOptions = service.intensity
            ? service.intensity.split(",").map((i) => i.trim()).filter((i) => i)
            : [];
        if (intensityOptions.length > 0) {
            setIntensityModal({ service });
        } else {
            navigate(`/book?serviceId=${service._id}`);
        }
    };

    const handleBookNow = (service: Service) => {
        const session = localStorage.getItem("session");
        if (!session) {
            navigate(`/sign-in?redirect=/book?serviceId=${service._id}`);
            return;
        }
        const agreed = localStorage.getItem("termsAgreed");
        if (agreed !== "true") {
            setPendingService(service);
            setTermsOpened(true);
            return;
        }
        proceedToBook(service);
    };

    const handleContinueAgree = () => {
        localStorage.setItem("termsAgreed", "true");
        setTermsOpened(false);
        setTermsChecked(false);
        if (pendingService) {
            proceedToBook(pendingService);
            setPendingService(null);
        }
    };

    const toggleExpanded = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (loading)
        return (
            <Center className="h-[70vh] flex-col">
                <Loader size="lg" color="blue" />
            </Center>
        );

    return (
        <Stack align="center" className="w-full px-4" gap={0}>

            {/* Terms & Conditions Modal */}
            <Modal
                opened={termsOpened}
                onClose={() => {
                    setTermsOpened(false);
                    setTermsChecked(false);
                    setPendingService(null);
                }}
                title={<Text fw={500}>Terms &amp; Conditions</Text>}
                size="xl"
                radius="lg"
            >
                <ScrollArea h={450} className="border border-gray-300 p-3 rounded-xl">
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.8 }}>
                        <strong>Booking Policy:</strong>
                        <br />• A downpayment is required to confirm your booking.
                        <br />• The downpayment or full payment is <strong>(REFUNDABLE upon cancellation)</strong> only from the <strong>SPA Administrator</strong>.
                        <br />• Remaining balance must be paid before or on the day of the appointment.
                        <br />• All appointments are subject to availability and are considered confirmed only after downpayment is received.
                        <br />• Only <strong>(2) PENDING</strong> bookings are allowed for security purposes.
                        <br />• <strong>Multiple Booking</strong> is allowed but only <strong>(1) TYPE OF SERVICE PER CATEGORY</strong> is permitted.
                        <br /><br />
                        <strong>Cancellation &amp; Rescheduling:</strong>
                        <br />• You may <strong>cancel</strong> an appointment only while it is still marked as <strong>Approved</strong>.
                        <br />• You may <strong>reschedule</strong> an appointment if it is <strong>Approved.</strong>
                        <br />• You are <strong>ENTITLED</strong> to the <strong>SAME THERAPIST YOU SELECTED</strong> prior to the rescheduling process.
                        <br />• Cancellations or reschedule requests made less than 24 hours before the appointment may not be accommodated.
                        <br /><br />
                        <strong>Late Arrival Policy:</strong>
                        <br />• Arriving more than <strong>15 minutes late</strong> may result in a shortened session to avoid impacting other clients.
                        <br />• Excessive delays may be treated as a no-show, resulting in forfeiture of any payments made.
                        <br /><br />
                        <strong>Health &amp; Safety:</strong>
                        <br />• Please inform your therapist of any medical conditions, injuries, allergies, or physical limitations before your session.
                        <br />• The spa reserves the right to decline or modify treatment based on health concerns for client safety.
                        <br /><br />
                        <strong>Client Conduct &amp; Etiquette:</strong>
                        <br />• Respectful behavior toward staff and other clients is required at all times.
                        <br />• Inappropriate or abusive behavior may result in the immediate termination of the session with no refund.
                        <br /><br />
                        <strong>Privacy &amp; Confidentiality:</strong>
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
                    color="blue"
                />

                <Button
                    mt="md"
                    fullWidth
                    disabled={!termsChecked}
                    onClick={handleContinueAgree}
                    radius="xl"
                    color="blue"
                >
                    Continue
                </Button>
            </Modal>

            {/* Intensity Selection Modal */}
            <Modal
                opened={!!intensityModal}
                onClose={() => setIntensityModal(null)}
                title={
                    <Text fw={500}>
                        Select Intensity for {intensityModal?.service.name}
                    </Text>
                }
                size="sm"
                radius="lg"
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
                        if (value && intensityModal) {
                            navigate(`/book?serviceId=${intensityModal.service._id}&intensity=${value}`);
                            setIntensityModal(null);
                        }
                    }}
                />
            </Modal>

            {/* Header */}
            <Container size="lg" py="xl">
                <Group justify="center">
                    <Badge variant="filled" size="lg" color="blue">
                        {homepageSettings?.brand.name}
                    </Badge>
                </Group>
                <Title order={2} className={classes.title} ta="center" mt="sm">
                    Our{' '}
                    <em style={{ fontStyle: 'italic', color: 'var(--mantine-color-blue-6)' }}>
                        Services
                    </em>
                </Title>
                <Text c="dimmed" className={classes.description} ta="center" mt="md">
                    Browse our range of luxurious treatments and book the perfect experience to unwind and rejuvenate.
                </Text>
            </Container>

            {/* Service Cards */}
            <Grid mt="md" mb="xl" className="w-full px-4">
                {services.map((s) => {
                    const isExpanded = expandedIds.has(s._id);
                    const isLong = s.description?.length > 100;
                    const available = s.status === "available";

                    return (
                        <Grid.Col key={s._id} span={{ base: 12, sm: 6, md: 4 }}>
                            <Card
                                shadow="sm"
                                radius="lg"
                                padding="lg"
                                className="flex flex-col h-full transition-transform hover:scale-[1.02]"
                                style={{
                                    border: '0.5px solid var(--mantine-color-gray-2)',
                                    borderTop: '3px solid var(--mantine-color-blue-6)',
                                    background: '#fff',
                                }}
                            >
                                <Card.Section className="overflow-hidden rounded-lg">
                                    <div className="h-[360px] w-full overflow-hidden">
                                        <Image
                                            src={s.imageUrl || "/img/placeholder.jpg"}
                                            alt={s.name}
                                            fit="cover"
                                            className="h-full w-full"
                                        />
                                    </div>
                                </Card.Section>

                                <div className="flex flex-col grow mt-3">
                                    <Text fw={500} size="xl" mb={2} lineClamp={1}>
                                        {s.name}
                                    </Text>

                                    <Text
                                        size="sm"
                                        c="dimmed"
                                        mb={isLong ? 2 : "auto"}
                                        lineClamp={isExpanded ? undefined : 2}
                                        style={{ lineHeight: 1.65 }}
                                    >
                                        {s.description}
                                    </Text>

                                    {isLong && (
                                        <Text
                                            size="sm"
                                            c="blue"
                                            mb="auto"
                                            style={{ cursor: "pointer", fontWeight: 500 }}
                                            onClick={() => toggleExpanded(s._id)}
                                        >
                                            {isExpanded ? "See less" : "See more"}
                                        </Text>
                                    )}

                                    <Text fw={600} mt="sm" size="sm" c="blue">
                                        ₱{s.price.toFixed(2)} · {s.duration} mins
                                    </Text>

                                    <Button
                                        size="md"
                                        mt="md"
                                        fullWidth
                                        radius="xl"
                                        color="blue"
                                        disabled={!available}
                                        onClick={() => handleBookNow(s)}
                                    >
                                        {available ? "Book Now" : "Unavailable"}
                                    </Button>
                                </div>
                            </Card>
                        </Grid.Col>
                    );
                })}
            </Grid>

            <footer className="w-full py-6 mt-4 border-t border-gray-200">
                <Text ta="center" size="sm" c="dimmed">
                    &copy; {new Date().getFullYear()} {homepageSettings?.brand.name}. All rights reserved.
                </Text>
            </footer>
        </Stack>
    );
}