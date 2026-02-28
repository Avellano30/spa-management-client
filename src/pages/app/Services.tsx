import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
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
    Container
} from "@mantine/core";
import { getAllServices, type Service } from "../../api/services";
import classes from "./components/FeaturesCards.module.css";
import {useHomepageSettings} from "../../utils/HomepageSettingsContext.tsx";

export default function AppServices() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const homepageSettings = useHomepageSettings();
    const navigate = useNavigate();

    useEffect(() => {
        getAllServices()
            .then(setServices)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleBookNow = (serviceId: string) => {
        const session = localStorage.getItem("session");
        if (!session) {
            navigate(`/sign-in?redirect=/book?serviceId=${serviceId}`);
            return;
        }
        navigate(`/book?serviceId=${serviceId}`);
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

    if (loading) return <Center className="h-[70vh] flex-col"><Loader size="lg" /></Center>;

    return (
        <Stack align="center" className="w-full px-4 max-w-5xl mx-auto">
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
                    Browse our range of luxurious treatments and book the perfect experience to unwind and rejuvenate.
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

                                    <Text size="sm" c="dimmed" mb={isLong ? 2 : "auto"} lineClamp={isExpanded ? undefined : 2}>
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
                                        onClick={() => handleBookNow(s._id)}
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