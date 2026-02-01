import {Text, Stack} from "@mantine/core";
import {useHomepageSettings} from "../../utils/HomepageSettingsContext.tsx";
import {FeaturesCards} from "./components/FeaturesCards.tsx";
import {CardsCarousel} from "./components/CardsCarousel.tsx";

export default function AppHome() {
    const homepageSettings = useHomepageSettings();

    return (
        <Stack align="center" className="w-full px-4 max-w-5xl mx-auto">
            <FeaturesCards />
            <CardsCarousel />
            <footer className="w-full py-6 mt-10 border-t border-gray-200">
                <Text ta="center" size="sm" className="text-gray-500">
                    &copy; {new Date().getFullYear()} {homepageSettings?.brand.name}. All rights reserved.
                </Text>
            </footer>
        </Stack>
    );
}
