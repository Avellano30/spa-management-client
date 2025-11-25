import { Title, Text, Stack, Divider } from "@mantine/core";
import AppServices from "./Services";

export default function AppHome() {
  return (
    <Stack align="center" mt={40} className="w-full px-4 max-w-5xl mx-auto">
      <Title order={2} className="text-gray-900 font-semibold">
        Welcome to Serenity Spa
      </Title>

      <Text ta="center" maw={600} className="text-gray-600 leading-relaxed">
        Relax, rejuvenate, and rediscover your balance. Explore our services
        designed for total wellness.
      </Text>

      {/* <Divider
        mt={40}
        label={<span className="text-sm font-medium text-gray-600 px-3 bg-white">Services</span>}
        labelPosition="center"
        className="w-full max-w-md"
      /> */}

      <Divider
        mt="xl"
        label={
          <span className="text-lg font-semibold text-black px-2 bg-white">
            Services
          </span>
        }
        labelPosition="center"
        size="sm"
        className="w-full max-w-[75%]"
      />

      <AppServices />

      <footer className="w-full py-6 mt-20 border-t border-gray-200">
        <Text ta="center" size="sm" className="text-gray-500">
          &copy; {new Date().getFullYear()} Serenity Spa. All rights reserved.
        </Text>
      </footer>
    </Stack>
  );
}
