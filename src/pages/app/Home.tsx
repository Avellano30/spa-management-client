import {Title, Text, Stack} from "@mantine/core";
import {useHomepageSettings} from "../../utils/HomepageSettingsContext.tsx";

export default function AppHome() {
    const homepageSettings = useHomepageSettings();

    return (
        <Stack align="center" mt={40} className="w-full px-4 max-w-5xl mx-auto">
            <Title order={2} className="text-gray-900 font-semibold">
                {homepageSettings?.content.heading}
            </Title>

            <Text ta="center" maw={600} className="text-gray-600 leading-relaxed">
                {homepageSettings?.content.description}
            </Text>

            <footer className="w-full py-6 mt-20 border-t border-gray-200">
                <Text ta="center" size="sm" className="text-gray-500">
                    &copy; {new Date().getFullYear()} {homepageSettings?.brand.name}. All rights reserved.
                </Text>
            </footer>
        </Stack>
    );
}
