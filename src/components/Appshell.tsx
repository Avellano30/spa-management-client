import {
    AppShell,
    Group,
    Burger,
    ScrollArea,
    NavLink,
    Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
    IconLogout,
    IconMassage,
    IconSettings,
    IconCalendarWeek,
} from "@tabler/icons-react";
import React from "react";
import useHandleLogout from "../modules/auth/handleLogout";
import { useLocation, useNavigate } from "react-router"; // Added useNavigate for navigation
import { useAuth } from "../utils/AuthContext";

type NavItem = { icon: any; label: string; href: string };

const navData: NavItem[] = [
    { icon: IconCalendarWeek, label: "Appointments", href: "/my-appointments" },
    { icon: IconMassage, label: "Services", href: "/services" },
    { icon: IconSettings, label: "Settings", href: "/settings" },
];

function Layout({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();
    const { authState } = useAuth();
    const { handleLogout } = useHandleLogout();
    const location = useLocation();
    const navigate = useNavigate(); // Hook for programmatic navigation

    const items = navData.map((item) => (
        <NavLink
            key={item.label}
            active={location.pathname.startsWith(item.href)}
            label={item.label}
            // 1. Matched icon size to 40
            leftSection={<item.icon size={25} stroke={1.5} />}
            // 2. Matched text styles to Sign Out
            styles={{
                label: { fontSize: '15px', fontWeight: 600 },
                root: { paddingTop: '12px', paddingBottom: '12px' } // Added padding for better click area
            }}
            onClick={() => {
                navigate(item.href);
                if (opened) toggle(); // Close mobile menu on click
            }}
        />
    ));

    return (
        <AppShell
            header={{ height: 70 }} // Slightly increased to fit 2xl text better
            navbar={{ width: 300, breakpoint: "sm", collapsed: { mobile: !opened } }}
            padding="md"
        >
            <AppShell.Header bg="black">
                <Group h="100%" px="md">
                    <Burger
                        opened={opened}
                        onClick={toggle}
                        hiddenFrom="sm"
                        size="sm"
                        color="white"
                    />
                    <span className="text-white font-medium text-2xl">
            Welcome back, {authState?.firstName}!
          </span>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar>
                <Divider mt="md" mx="md" />
                <AppShell.Section grow my="md" component={ScrollArea} px="md">
                    {items}
                </AppShell.Section>

                <Divider mx="md" />

                <AppShell.Section p="md">
                    <NavLink
                        href="/"
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