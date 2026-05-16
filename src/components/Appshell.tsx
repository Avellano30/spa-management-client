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
    Box,
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

const navStyles = {
    root: {
        borderRadius: 8,
        paddingTop: 10,
        paddingBottom: 10,
        transition: "all 150ms ease",
    },
    label: {
        fontSize: 14,
        fontWeight: 600,
    },
};

function Layout({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();
    const [currentTime, setCurrentTime] = useState(dayjs());
    const [openingTime, setOpeningTime] = useState("09:00");
    const [closingTime, setClosingTime] = useState("20:00");

    const { authState } = useAuth();
    const { handleLogout } = useHandleLogout();
    const location = useLocation();
    const navigate = useNavigate();

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
            } catch (err) {
                console.error(err);
            }
        };

        syncHours();
        window.addEventListener("focus", syncHours);
        return () => window.removeEventListener("focus", syncHours);
    }, []);

    const currentTimeString = currentTime.format("HH:mm");

    const isOpen =
        openingTime < closingTime
            ? currentTimeString >= openingTime && currentTimeString < closingTime
            : currentTimeString >= openingTime || currentTimeString < closingTime;

    const formatHour = (timeStr: string) => {
        if (!timeStr?.includes(":")) return timeStr;
        const [h, m] = timeStr.split(":");
        const hour = parseInt(h, 10);
        return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    };

    const items = navData.map((item) => {
        const active = location.pathname.startsWith(item.href);

        return (
            <NavLink
                key={item.label}
                label={item.label}
                leftSection={<item.icon size={22} stroke={1.5} />}
                active={active}
                onClick={() => {
                    navigate(item.href);
                    if (opened) toggle();
                }}
                styles={{
                    ...navStyles,
                    root: {
                        ...navStyles.root,
                        backgroundColor: active ? "rgba(0,0,0,0.06)" : "transparent",
                        borderLeft: active ? "3px solid var(--mantine-color-blue-6)" : "3px solid transparent",
                        paddingLeft: 12,
                    },
                }}
            />
        );
    });

    return (
        <AppShell
            header={{ height: 64 }}
            navbar={{ width: 280, breakpoint: "sm", collapsed: { mobile: !opened } }}
            padding="md"
        >
            {/* HEADER */}
            <AppShell.Header bg="dark">
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="white" />
                        <Box>
                            <Text c="dimmed" size="xs">
                                Welcome back
                            </Text>
                            <Text c="white" fw={600} size="md">
                                {authState?.firstName}
                            </Text>
                        </Box>
                    </Group>
                </Group>
            </AppShell.Header>

            {/* NAVBAR */}
            <AppShell.Navbar p="sm">


                    <Stack gap={6}>
                        <Text size="xs" tt="uppercase" c="dimmed" fw={700}>
                            {currentTime.format("dddd, MMM D")}
                        </Text>

                        <Text fw={700} style={{ fontVariantNumeric: "tabular-nums" }}>
                            {currentTime.format("h:mm:ss A")}
                        </Text>

                        <Divider my={6} />

                        <Group justify="space-between">
                            <Stack gap={0}>
                                <Text size="xs" c="dimmed" tt="uppercase">
                                    Store Hours
                                </Text>
                                <Text size="sm" fw={600}>
                                    {formatHour(openingTime)} – {formatHour(closingTime)}
                                </Text>
                            </Stack>

                            <Badge color={isOpen ? "green" : "red"} variant="light">
                                {isOpen ? "OPEN" : "CLOSED"}
                            </Badge>
                        </Group>
                    </Stack>

                {/* NAV */}
                <ScrollArea mt="md" style={{ flex: 1 }}>
                    <Stack gap={4}>{items}</Stack>
                </ScrollArea>


                {/* LOGOUT */}
                <NavLink
                    label="Sign out"
                    leftSection={<IconLogout size={22} />}
                    onClick={handleLogout}
                    styles={{
                        root: {
                            borderRadius: 8,
                            paddingTop: 10,
                            paddingBottom: 10,
                            color: "var(--mantine-color-red-6)",
                        },
                        label: {
                            fontWeight: 600,
                        },
                    }}
                />
            </AppShell.Navbar>

            <AppShell.Main>{children}</AppShell.Main>
        </AppShell>
    );
}

export default React.memo(Layout);