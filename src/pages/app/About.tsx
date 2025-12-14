import { Container, Title, Text, Card, Stack } from "@mantine/core";
import { useHomepageSettings } from "../../utils/HomepageSettingsContext";

export default function AppAbout() {
  const homepageSettings = useHomepageSettings();

  return (
    <Container size="sm" mt="xl">
      <Card shadow="sm" radius="md" padding="lg" withBorder>
        <Stack gap="sm">
          <Title order={2} ta="center">
            About Us
          </Title>

          <Text c="dimmed" ta="center" size="sm">
            Learn more about who we are and what we do
          </Text>

          <Text mt="md" size="md" lh={1.7}>
            {homepageSettings?.content.bodyDescription ??
              "Information about our company will be available soon."}
          </Text>
        </Stack>
      </Card>
    </Container>
  );
}
