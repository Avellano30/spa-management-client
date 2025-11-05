import { Container, Title, Text } from "@mantine/core";

export default function AppAbout() {
  return (
    <Container size="sm" mt="xl">
      <Title order={2}>About Us</Title>
      <Text mt="sm">
        Serenity Spa has been providing holistic wellness and rejuvenating treatments since 2010.
        Our professional therapists ensure a relaxing and restorative experience for every guest.
      </Text>
    </Container>
  );
}
