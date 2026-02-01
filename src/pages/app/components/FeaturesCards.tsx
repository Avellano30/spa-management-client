import {
    Badge,
    Card,
    Container,
    Group,
    SimpleGrid,
    Text,
    Title,
} from '@mantine/core';
import classes from './FeaturesCards.module.css';
import {useHomepageSettings} from "../../../utils/HomepageSettingsContext.tsx";
import {IconFlower, IconLeaf, IconSparkles} from "@tabler/icons-react";

const data = [
    {
        title: 'Rejuvenating Treatments',
        description:
            'Experience our signature massage therapies and body treatments designed to release tension, restore balance, and leave you feeling completely refreshed and renewed.',
        icon: IconSparkles,
    },
    {
        title: 'Natural & Organic',
        description:
            'We use only premium organic products sourced from nature. Our commitment to clean beauty means no harsh chemicals, just pure ingredients that nourish your skin.',
        icon: IconLeaf,
    },
    {
        title: 'Holistic Wellness',
        description:
            'Our expert therapists combine ancient healing traditions with modern techniques to address your mind, body, and spirit for complete wellness and relaxation.',
        icon: IconFlower,
    },
];

export function FeaturesCards() {
    const homepageSettings = useHomepageSettings();
    const features = data.map((feature) => (
        <Card key={feature.title} shadow="md" radius="md" className={classes.card} padding="xl">
            <feature.icon size={50} stroke={1.5} className="text-blue-600" />
            <Text fz="lg" fw={500} className={classes.cardTitle} id={'title'} mt="md">
                {feature.title}
            </Text>
            <Text fz="sm" c="dimmed" mt="sm">
                {feature.description}
            </Text>
        </Card>
    ));

    return (
        <Container size="lg" py="xl">
            <Group justify="center">
                <Badge variant="filled" size="lg" className="bg-blue-600!">
                    {homepageSettings?.brand.name}
                </Badge>
            </Group>

            <Title order={2} className={classes.title} ta="center" mt="sm">
                {homepageSettings?.content.heading}
            </Title>

            <Text c="dimmed" className={classes.description} ta="center" mt="md">
                {homepageSettings?.content.description}
            </Text>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mt={50}>
                {features}
            </SimpleGrid>
        </Container>
    );
}