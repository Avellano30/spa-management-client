import {Container, Title, Text, Badge, Group, Card, SimpleGrid, Stack} from "@mantine/core";
import {useHomepageSettings} from "../../utils/HomepageSettingsContext.tsx";
import {IconPhone, IconMail, IconMapPin} from "@tabler/icons-react";
import classes from "./components/FeaturesCards.module.css";

export default function AppAbout() {
    const homepageSettings = useHomepageSettings();

    const contactInfo = [
        {
            title: 'Phone',
            value: homepageSettings?.contact.phone,
            icon: IconPhone,
        },
        {
            title: 'Email',
            value: homepageSettings?.contact.email,
            icon: IconMail,
        },
        {
            title: 'Address',
            value: homepageSettings?.contact.address,
            icon: IconMapPin,
        },
    ];

    const contactCards = contactInfo.map((info) => (
        <Card key={info.title} shadow="md" radius="md" padding="xl">
            <info.icon size={40} stroke={1.5} className="text-blue-600"/>
            <Text fz="lg" fw={500} mt="md">
                {info.title}
            </Text>
            <Text fz="sm" c="dimmed" mt="sm">
                {info.value}
            </Text>
        </Card>
    ));

    return (
        <Stack align="center" className="w-full px-4 max-w-5xl mx-auto">
            <Container size="lg" py="xl">
                {/* About Section */}
                <Group justify="center">
                    <Badge variant="filled" size="lg" className="bg-blue-600!">
                        {homepageSettings?.brand.name}
                    </Badge>
                </Group>

                <Title order={2} className={classes.title} ta="center" mt="sm">
                    About Us
                </Title>

                <Text c="dimmed" className={classes.description} ta="center" mt="md">
                    {homepageSettings?.content.bodyDescription}
                </Text>

                <Title order={2} className={classes.title} ta="center" mt="sm">
                    Contact Us
                </Title>

                <Text c="dimmed" className={classes.description} ta="center" mt="md">
                    We'd love to hear from you. Reach out to us through any of the following channels.
                </Text>

                <SimpleGrid cols={{base: 1, md: 3}} spacing="xl" mt={50}>
                    {contactCards}
                </SimpleGrid>
            </Container>
        </Stack>
    );
}