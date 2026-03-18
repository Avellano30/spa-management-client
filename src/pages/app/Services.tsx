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
    const [intensityModal, setIntensityModal] = useState<{
        service: Service;
    } | null>(null);
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
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    if (loading)
        return (
            <Center className="h-[70vh] flex-col">
                <Loader size="lg" />
            </Center>
        );

    return (
        <Stack align="center" className="w-full px-4 max-w-5xl mx-auto">

            {/* --- Terms & Conditions Modal --- */}
            <Modal
                opened={termsOpened}
                onClose={() => {
                    setTermsOpened(false);
                    setTermsChecked(false);
                    setPendingService(null);
                }}
                title="Terms & Conditions"
                size="xl"
            >
                <ScrollArea h={450} className="border border-gray-300 p-3 rounded-xl">
                    <Text size="xl" c="dimmed">
                        <strong>Booking Policy:</strong>
                        <br />• A downpayment is required to confirm your booking.
                        <br />• The downpayment or full payment is <strong>(REFUNDABLE upon cancellation)</strong>.
                        <br />• Remaining balance must be paid before or on the day of the appointment.
                        <br />• All appointments are subject to availability and are considered confirmed only after downpayment is received.
                        <br />• Only <strong>(2) PENDING</strong> bookings are allowed for security purposes.
                        <br />• <strong>Multiple Booking</strong> is allowed but only <strong>(1) TYPE OF SERVICE PER CATEGORY</strong> is permitted.
                        <br />
                        <br />
                        <strong>Cancellation & Rescheduling:</strong>
                        <br />• You may <strong>cancel</strong> an appointment only while it is still marked as <strong>Approved</strong>.
                        <br />• You may <strong>reschedule</strong> an appointment if it is <strong>Approved.</strong>
                        <br />• Cancellations or reschedule requests made less than 24 hours before the appointment may not be accommodated.
                        <br /><strong>• Refunds</strong> are provided for cancellations.
                        <br />
                        <br />
                        <strong>Late Arrival Policy:</strong>
                        <br />• Arriving more than <strong>15 minutes late</strong> may result in a shortened session to avoid impacting other clients.
                        <br />• Excessive delays may be treated as a no-show, resulting in forfeiture of any payments made.
                        <br />
                        <br />
                        <strong>Health & Safety:</strong>
                        <br />• Please inform your therapist of any medical conditions, injuries, allergies, or physical limitations before your session.
                        <br />• The spa reserves the right to decline or modify treatment based on health concerns for client safety.
                        <br />
                        <br />
                        <strong>Client Conduct & Etiquette:</strong>
                        <br />• Respectful behavior toward staff and other clients is required at all times.
                        <br />• Inappropriate or abusive behavior may result in the immediate termination of the session with no refund.
                        <br />
                        <br />
                        <strong>Privacy & Confidentiality:</strong>
                        <br />• All client information is kept confidential and is used only for booking and service purposes.
                        <br />
                        <br />
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

                <Button
                    mt="md"
                    fullWidth
                    disabled={!termsChecked}
                    onClick={handleContinueAgree}
                >
                    Continue
                </Button>
            </Modal>

            {/* --- Intensity Selection Modal --- */}
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
                        if (value && intensityModal) {
                            navigate(`/book?serviceId=${intensityModal.service._id}&intensity=${value}`);
                            setIntensityModal(null);
                        }
                    }}
                />
            </Modal>

            <Container size="lg" py="xl">
                <Group justify="center">
                    <Badge variant="filled" size="lg" className="bg-blue-600!">
                        {homepageSettings?.brand.name}
                    </Badge>
                </Group>
                <Title order={2} className={classes.title} ta="center" mt="sm">
                    Our Services
                </Title>

                <Text c="dimmed" className={classes.description} ta="center" mt="md">
                    Browse our range of luxurious treatments and book the perfect
                    experience to unwind and rejuvenate.
                </Text>
            </Container>

            <Grid mt="xl" className="max-w-6xl mx-auto">
                {services.map((s) => {
                    const isExpanded = expandedIds.has(s._id);
                    const isLong = s.description?.length > 100;

                    return (
                        <Grid.Col key={s._id} span={{ base: 12, sm: 6, md: 4 }}>
                            <Card
                                shadow="sm"
                                radius="lg"
                                padding="lg"
                                withBorder
                                className="transition-transform hover:scale-[1.02] flex flex-col h-full bg-white/80 backdrop-blur-sm"
                            >
                                <Card.Section className="overflow-hidden rounded-lg">
                                    <div className="h-[250px] w-full overflow-hidden">
                                        <Image
                                            src={s.imageUrl || "/img/placeholder.jpg"}
                                            alt={s.name}
                                            fit="contain"
                                            className="h-full w-full max-h-[250px]"
                                        />
                                    </div>
                                </Card.Section>

                                <div className="flex flex-col grow mt-3">
                                    <Text fw={500} size="lg" mb={2} lineClamp={1}>
                                        {s.name}
                                    </Text>

                                    <Text
                                        size="sm"
                                        c="dimmed"
                                        mb={isLong ? 2 : "auto"}
                                        lineClamp={isExpanded ? undefined : 2}
                                    >
                                        {s.description}
                                    </Text>

                                    {isLong && (
                                        <Text
                                            size="sm"
                                            c="blue"
                                            mb="auto"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => toggleExpanded(s._id)}
                                        >
                                            {isExpanded ? "See less" : "See more"}
                                        </Text>
                                    )}

                                    <Text fw={500} mt="sm" size="sm">
                                        ₱{s.price.toFixed(2)} • {s.duration} mins
                                    </Text>

                                    <Button
                                        mt="md"
                                        fullWidth
                                        color="blue"
                                        className="bg-blue-600! hover:bg-blue-700! text-white transition-all duration-200"
                                        disabled={s.status !== "available"}
                                        onClick={() => handleBookNow(s)}
                                    >
                                        {s.status === "available" ? "Book Now" : "Unavailable"}
                                    </Button>
                                </div>
                            </Card>
                        </Grid.Col>
                    );
                })}
            </Grid>
        </Stack>
    );
}