import {Container, Title, Text} from "@mantine/core";
import {useHomepageSettings} from "../../utils/HomepageSettingsContext.tsx";

export default function AppAbout() {
    const homepageSettings = useHomepageSettings();

    return (
        <Container size="sm" mt="xl">
            <Title order={2}>About Us</Title>

            <Text mt="sm">
                {homepageSettings?.content.bodyDescription}
            </Text>

            {/* Space before Contact Us */}
            <Title order={2} mt="xl">Contact Us</Title>

            <Text mt="sm">
                <strong>Phone Number:</strong> {homepageSettings?.contact.phone} <br />
                <strong>Email:</strong> {homepageSettings?.contact.email} <br />
                <strong>Address:</strong> {homepageSettings?.contact.address}
            </Text>
        </Container>
    );
}
