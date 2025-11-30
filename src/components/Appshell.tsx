import { AppShell, Group, Burger, ScrollArea, NavLink, Divider } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconLogout, IconMassage, IconSettings, IconCalendarWeek } from '@tabler/icons-react';
import React from 'react';
import useHandleLogout from '../modules/auth/handleLogout';
import { useLocation } from 'react-router';
import { useAuth } from '../utils/AuthContext';

type NavItem = { icon: any; label: string; href: string };

const navData: NavItem[] = [
    { icon: IconCalendarWeek, label: "Appointments", href: "/my-appointments" },
    { icon: IconMassage, label: "Services", href: "/#" },
    { icon: IconSettings, label: "Settings", href: "/settings" },
];

function Layout({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();
    const { authState } = useAuth();
    const { handleLogout } = useHandleLogout();
    const location = useLocation();

    const items = navData.map((item) => (
        <NavLink
            href={item.href}
            key={item.label}
            active={location.pathname.startsWith(item.href)}
            label={item.label}
            leftSection={<item.icon size={16} stroke={1.5} />}
        />
    ));

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
            padding="md"
        >
            <AppShell.Header bg="black">
                <Group h="100%" px="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color='white'/>
                    <span className="text-white font-medium">Welcome back, {authState?.firstName}!</span>
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
                        href='/'
                        label="Sign out"
                        leftSection={<IconLogout size={16} stroke={1.5} />}
                        onClick={handleLogout}
                    />
                </AppShell.Section>
            </AppShell.Navbar>
            <AppShell.Main>{children}</AppShell.Main>
        </AppShell>
    );
}

export default React.memo(Layout);

