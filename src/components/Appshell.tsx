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
    // 1. Logic Hooks & State
    const [opened, { toggle }] = useDisclosure();
    const [currentTime, setCurrentTime] = useState(dayjs());
    const [openingTime, setOpeningTime] = useState("09:00");
    const [closingTime, setClosingTime] = useState("20:00");

    const { authState } = useAuth();
    const { handleLogout } = useHandleLogout();
    const location = useLocation();
    const navigate = useNavigate();

    // 2. Effects (Clock & Data Sync)
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(dayjs()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const syncHours = async () => {
            try {
                const data = await getSpaSettings();
                if (data?.openingTime && data?.closingTime) {
                    setOpeningTime(data.openingTime);
                    setClosingTime(data.closingTime);
                }
            } catch (err) { console.error("Failed to sync hours:", err); }
        };
        syncHours();
        window.addEventListener('focus', syncHours);
        return () => window.removeEventListener('focus', syncHours);
    }, []);

    // 3. Status Calculation (Fixes the "minutes" display bug)
    const currentTimeString = currentTime.format("HH:mm");
    const isOpen = openingTime < closingTime
        ? (currentTimeString >= openingTime && currentTimeString < closingTime)
        : (currentTimeString >= openingTime || currentTimeString < closingTime);

    const formatHour = (timeStr: string) => {
        if (!timeStr || !timeStr.includes(':')) return timeStr;
        const [hourStr, minuteStr] = timeStr.split(':');
        let h = parseInt(hourStr, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${minuteStr} ${ampm}`; // Preserves minutes like :30
    };

    // 4. Navigation Mapping
    const items = navData.map((item) => (
        <NavLink
            key={item.label}
            active={location.pathname.startsWith(item.href)}
            label={item.label}
            leftSection={<item.icon size={25} stroke={1.5} />}
            styles={{
                label: { fontSize: '15px', fontWeight: 600 },
                root: { paddingTop: '12px', paddingBottom: '12px' }
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
                {/* 5. Restored Sidebar Info Section */}
                <AppShell.Section p="md">
                    <Stack gap="xs">
                        <Stack gap={0}>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase">{currentTime.format("dddd")}</Text>
                            <Text size="md" fw={600}>{currentTime.format("MMMM D, YYYY")}</Text>
                        </Stack>

                        <Divider variant="dashed" />

                        <Stack gap="xs">
                            <Stack gap={0}>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Current Time</Text>
                                <Text size="xl" fw={800} ff="monospace">{currentTime.format("h:mm:ss A")}</Text>
                            </Stack>

                            <Group justify="space-between" align="flex-end">
                                <Stack gap={0}>
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">Store Hours</Text>
                                    <Text size="sm" fw={600}>
                                        {formatHour(openingTime)} - {formatHour(closingTime)}
                                    </Text>
                                </Stack>
                                <Badge color={isOpen ? "green" : "red"} variant="light" size="sm">
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
                        leftSection={<IconLogout size={25} stroke={1.5} />}
                        styles={{
                            label: { fontSize: '15px', fontWeight: 600 },
                            root: { paddingTop: '12px', paddingBottom: '12px' }
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