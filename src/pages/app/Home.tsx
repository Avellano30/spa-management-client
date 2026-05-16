import { Text, Stack, Divider } from "@mantine/core";
import { useHomepageSettings } from "../../utils/HomepageSettingsContext.tsx";
import { FeaturesCards } from "./components/FeaturesCards.tsx";
import { CardsCarousel } from "./components/CardsCarousel.tsx";

export default function AppHome() {
    const homepageSettings = useHomepageSettings();

    return (
        <Stack align="center" className="w-full" gap={0}>
            <div className="w-full max-w-5xl px-4 mx-auto">
                <FeaturesCards />
            </div>

            <Divider
                w="100%"
                label="✦"
                labelPosition="center"
                color="blue.1"
            />

            <div className="w-full max-w-5xl px-4 mx-auto py-8">
                <CardsCarousel />
            </div>

            <footer className="w-full py-6 mt-6 border-t border-gray-200">
                <Text ta="center" size="sm" c="dimmed">
                    &copy; {new Date().getFullYear()} {homepageSettings?.brand.name}. All rights reserved.
                </Text>
            </footer>
        </Stack>
    );
}