import { Container, Title, Text, Badge, Group, Card, SimpleGrid, Stack } from "@mantine/core";
import { useHomepageSettings } from "../../utils/HomepageSettingsContext.tsx";
import { IconPhone, IconMail, IconMapPin } from "@tabler/icons-react";
import classes from "./components/FeaturesCards.module.css";

export default function AppAbout() {
    const homepageSettings = useHomepageSettings();

    const contactInfo = [
        {
            title: "Phone",
            value: homepageSettings?.contact.phone,
            icon: IconPhone,
        },
        {
            title: "Email",
            value: homepageSettings?.contact.email,
            icon: IconMail,
        },
        {
            title: "Address",
            value: homepageSettings?.contact.address,
            icon: IconMapPin,
        },
    ];

    const contactCards = contactInfo.map((info) => (
        <Card
            key={info.title}
            shadow="sm"
            radius="md"
            padding="xl"
            style={{
                border: '0.5px solid var(--mantine-color-gray-2)',
                borderTop: '3px solid var(--mantine-color-blue-6)',
                background: '#fff',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
            }}
            className="hover:scale-[1.02]"
        >
            <div
                style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: 'var(--mantine-color-blue-0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--mantine-color-blue-6)',
                }}
            >
                <info.icon size={26} stroke={1.5} />
            </div>
            <Text fz="lg" fw={500} mt="md">
                {info.title}
            </Text>
            <Text fz="sm" c="dimmed" mt="sm" style={{ lineHeight: 1.65 }}>
                {info.value}
            </Text>
        </Card>
    ));

    return (
        <Stack align="center" className="w-full px-4 max-w-5xl mx-auto" gap={0}>
            <Container size="lg" py="xl">
                <Group justify="center">
                    <Badge variant="filled" size="lg" color="blue">
                        {homepageSettings?.brand.name}
                    </Badge>
                </Group>

                <Title order={2} className={classes.title} ta="center" mt="sm">
                    About{' '}
                    <em style={{ fontStyle: 'italic', color: 'var(--mantine-color-blue-6)' }}>
                        Us
                    </em>
                </Title>

                <Text c="dimmed" className={classes.description} ta="center" mt="md">
                    {homepageSettings?.content.bodyDescription}
                </Text>

                <Title order={2} className={classes.title} ta="center" mt={60}>
                    Contact{' '}
                    <em style={{ fontStyle: 'italic', color: 'var(--mantine-color-blue-6)' }}>
                        Us
                    </em>
                </Title>

                <Text c="dimmed" className={classes.description} ta="center" mt="md">
                    We'd love to hear from you. Reach out to us through any of the following channels.
                </Text>

                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mt={50}>
                    {contactCards}
                </SimpleGrid>
            </Container>

            <footer className="w-full py-6 mt-10 border-t border-gray-200">
                <Text ta="center" size="sm" c="dimmed">
                    &copy; {new Date().getFullYear()} {homepageSettings?.brand.name}. All rights reserved.
                </Text>
            </footer>
        </Stack>
    );
}