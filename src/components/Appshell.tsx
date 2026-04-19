import {
    AppShell,
    Group,
    Burger,
    ScrollArea,
    NavLink,
    Divider,
    Stack,
    Text,
    Badge,
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
import { getSpaSettings } from "../api/settings";
const navData = [
    { icon: IconCalendarWeek, label: "Appointments", href: "/my-appointments" },
    { icon: IconMassage, label: "Services", href: "/services" },
    { icon: IconSettings, label: "Settings", href: "/settings" },
];

function Layout({ children }: { children: React.ReactNode }) {
    // 1. Logic Hooks
    const [currentTime, setCurrentTime] = useState(dayjs());
    const [openingHour, setOpeningHour] = useState(9);
    const [closingHour, setClosingHour] = useState(20);
    const [opened, { toggle }] = useDisclosure(); // Re-add this
    const { authState } = useAuth();
    const { handleLogout } = useHandleLogout();
    const location = useLocation();
    const navigate = useNavigate();

    // 2. Effects (Clock & Sync)
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(dayjs()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const syncHours = async () => {
            try {
                const data = await getSpaSettings();
                if (data?.openingTime) {
                    setOpeningHour(parseInt(data.openingTime.split(':')[0], 10));
                    setClosingHour(parseInt(data.closingTime.split(':')[0], 10));
                }
            } catch (err) { console.error(err); }
        };
        syncHours();
        window.addEventListener('focus', syncHours);
        return () => window.removeEventListener('focus', syncHours);
    }, []);

    // 3. Status Calculation
    const currentHour = currentTime.hour();
    const isOpen = openingHour < closingHour
        ? (currentHour >= openingHour && currentHour < closingHour)
        : (currentHour >= openingHour || currentHour < closingHour);

    const formatHour = (h: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:00 ${ampm}`;
    };

    // 4. Navigation Mapping
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

                        {/* Displaying Time & Badge */}
                        <Stack gap="xs">
                            <Stack gap={0}>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                                    Current Time
                                </Text>
                                <Text size="xl" fw={800} ff="monospace" c="dark">
                                    {currentTime.format("h:mm:ss A")}
                                </Text>
                            </Stack>

                            {/* Added Store Hours & Status Badge */}
                            <Group justify="space-between" align="flex-end">
                                <Stack gap={0}>
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">Store Hours</Text>
                                    <Text size="sm" fw={600} c="dark.9">
                                        {formatHour(openingHour)} - {formatHour(closingHour)}
                                    </Text>
                                </Stack>
                                <Badge
                                    color={isOpen ? "green" : "red"}
                                    variant="light"
                                    size="sm"
                                >
                                    {isOpen ? "OPEN" : "CLOSED"}
                                </Badge>
                            </Group>
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