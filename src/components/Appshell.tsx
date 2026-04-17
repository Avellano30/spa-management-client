import {
    AppShell,
    Group,
    Burger,
    ScrollArea,
    NavLink,
    Divider,
    Stack,
    Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
    IconLogout,
    IconMassage,
    IconSettings,
    IconCalendarWeek,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../utils/AuthContext";
import useHandleLogout from "../modules/auth/handleLogout";

const navData = [
    { icon: IconCalendarWeek, label: "Appointments", href: "/my-appointments" },
    { icon: IconMassage, label: "Services", href: "/services" },
    { icon: IconSettings, label: "Settings", href: "/settings" },
];

function Layout({ children }: { children: React.ReactNode }) {
    const [currentTime, setCurrentTime] = useState(dayjs());
    const [opened, { toggle }] = useDisclosure();
    const { authState } = useAuth();
    const { handleLogout } = useHandleLogout();
    const location = useLocation();
    const navigate = useNavigate();

    // LIVE CLOCK EFFECT: Updates every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(dayjs());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const items = navData.map((item) => (
        <NavLink
            key={item.label}
            active={location.pathname.startsWith(item.href)}
            label={item.label}
            leftSection={<item.icon size={22} stroke={1.5} />}
            styles={{
                label: { fontSize: '15px', fontWeight: 600 },
                root: { padding: '12px' }
            }}
            onClick={() => {
                navigate(item.href);
                if (opened) toggle();
            }}
        />
    ));

    return (
        <AppShell
            header={{ height: 70 }}
            navbar={{ width: 300, breakpoint: "sm", collapsed: { mobile: !opened } }}
            padding="md"
        >
            <AppShell.Header bg="black">
                <Group h="100%" px="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="white" />
                    <Text c="white" fw={500} size="xl">
                        Welcome back, {authState?.firstName}!
                    </Text>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar>
                <AppShell.Section p="md">
                    <Stack gap="xs">
                        {/* Displaying Date */}
                        <Stack gap={0}>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                                {currentTime.format("dddd")}
                            </Text>
                            <Text size="md" fw={600}>
                                {currentTime.format("MMMM D, YYYY")}
                            </Text>
                        </Stack>

                        <Divider variant="dashed" />

                        {/* Displaying Time */}
                        <Stack gap={0}>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                                Current Time
                            </Text>
                            <Text size="xl" fw={800} ff="monospace" c="dark">
                                {currentTime.format("h:mm:ss A")}
                            </Text>
                        </Stack>
                    </Stack>
                </AppShell.Section>

                <Divider mx="md" />

                <AppShell.Section grow my="md" component={ScrollArea} px="md">
                    {items}
                </AppShell.Section>

                <Divider mx="md" />

                <AppShell.Section p="md">
                    <NavLink
                        label="Sign out"
                        leftSection={<IconLogout size={22} stroke={1.5} />}
                        styles={{
                            label: { fontSize: '15px', fontWeight: 600 },
                            root: { padding: '12px' }
                        }}
                        onClick={handleLogout}
                    />
                </AppShell.Section>
            </AppShell.Navbar>

            <AppShell.Main>{children}</AppShell.Main>
        </AppShell>
    );
}

export default React.memo(Layout);