import { Title, Text, Button, Stack } from "@mantine/core";
import { useNavigate } from "react-router";

export default function AppHome() {
    const navigate = useNavigate();

    return (
        <Stack align="center" mt="xl">
            <Title order={2}>Welcome to Serenity Spa</Title>
            <Text ta="center" maw={500}>
                Relax, rejuvenate, and rediscover your balance. Explore our services designed for total wellness.
            </Text>
            <Button mt="md" size="md" onClick={() => navigate('/services')}>View Services</Button>
        </Stack>
    );
}
