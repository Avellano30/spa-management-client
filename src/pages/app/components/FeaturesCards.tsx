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
import { useHomepageSettings } from "../../../utils/HomepageSettingsContext.tsx";
import { IconFlower, IconLeaf, IconSparkles } from "@tabler/icons-react";

const data = [
    {
        title: 'Rejuvenating Treatments',
        description:
            'Experience our signature massage therapies and body treatments designed to release tension, restore balance, and leave you feeling completely refreshed and renewed.',
        icon: IconSparkles,
        tag: 'Signature',
    },
    {
        title: 'Natural & Organic',
        description:
            'We use only premium organic products sourced from nature. Our commitment to clean beauty means no harsh chemicals, just pure ingredients that nourish your skin.',
        icon: IconLeaf,
        tag: 'Certified Organic',
    },
    {
        title: 'Essential Oils',
        description:
            'Our spa offers essential oils such as Sweet almond oil, Virgin coconut oil, and Grapeseed oil.',
        icon: IconFlower,
        tag: 'Pure Extract',
    },
];

export function FeaturesCards() {
    const homepageSettings = useHomepageSettings();

    const features = data.map((feature) => (
        <Card key={feature.title} shadow="sm" radius="md" className={classes.card} padding={32}>
            <div className={classes.cardIcon}>
                <feature.icon size={26} stroke={1.5} />
            </div>
            <Text fz="lg" fw={500} className={classes.cardTitle} mt="md">
                {feature.title}
            </Text>
            <Text fz="sm" c="dimmed" mt="sm" style={{ lineHeight: 1.65 }}>
                {feature.description}
            </Text>
            <div style={{ marginTop: 12 }}>
                <span className={classes.cardTag}>{feature.tag}</span>
            </div>
        </Card>
    ));

    return (
        <Container size="lg" py="xl">
            <Group justify="center">
                <Badge variant="filled" size="lg" color="blue">
                    {homepageSettings?.brand.name}
                </Badge>
            </Group>

            <Title order={2} className={classes.title} ta="center" mt="sm">
                Discover your path to{' '}
                <em style={{ fontStyle: 'italic', color: 'var(--mantine-color-blue-6)' }}>
                    total relaxation
                </em>
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