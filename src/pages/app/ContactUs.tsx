import {
  Container,
  Title,
  Text,
  Card,
  Stack,
  Group,
} from "@mantine/core";
import { IconPhone, IconMail, IconMapPin } from "@tabler/icons-react";
import { useHomepageSettings } from "../../utils/HomepageSettingsContext";

export default function AppContactUs() {
  const homepageSettings = useHomepageSettings();
  const contact = homepageSettings?.contact;

  return (
    <Container size="sm" mt="xl">
      <Card shadow="sm" radius="md" padding="lg" withBorder>
        <Stack gap="md">
          <Title order={2} ta="center">
            Contact Us
          </Title>

          <Text c="dimmed" ta="center" size="sm">
            We’d love to hear from you
          </Text>

          <Group gap="sm">
            <IconPhone size={20} />
            <Text>
              <strong>Phone:</strong>{" "}
              {contact?.phone ? (
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              ) : (
                "Not available"
              )}
            </Text>
          </Group>

          <Group gap="sm">
            <IconMail size={20} />
            <Text>
              <strong>Email:</strong>{" "}
              {contact?.email ? (
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              ) : (
                "Not available"
              )}
            </Text>
          </Group>

          <Group gap="sm" align="flex-start">
            <IconMapPin size={20} />
            <Text>
              <strong>Address:</strong>{" "}
              {contact?.address ?? "Not available"}
            </Text>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}
