import {
    Box,
    Burger,
    Button,
    Divider,
    Drawer,
    Group,
    ScrollArea,
    Menu,
    Avatar, Loader,
} from "@mantine/core";
import {useDisclosure} from "@mantine/hooks";
import {useNavigate, useLocation, Outlet} from "react-router";
import {useAuth} from "./utils/AuthContext";
import useHandleLogout from "./modules/auth/handleLogout";
import {useEffect, useState} from "react";
import {getHomepageSettings, type HomepageSettings} from "./api/settings";
import {HomepageSettingsContext} from "./utils/HomepageSettingsContext";

export default function AppLayout() {
    const [drawerOpened, {toggle: toggleDrawer, close: closeDrawer}] = useDisclosure(false);
    const navigate = useNavigate();
    const location = useLocation();
    const {authState} = useAuth();
    const {handleLogout} = useHandleLogout();
    const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const navLinks = [
        {label: "Home", path: "/"},
        {label: "Services", path: "/services"},
        {label: "About", path: "/about"},
    ];

    useEffect(() => {
        getHomepageSettings()
            .then(setHomepageSettings)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Box className="h-screen flex items-center justify-center">
                <Loader size="lg"/>
            </Box>
        );
    }

    return (
        <HomepageSettingsContext.Provider value={homepageSettings}>
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 h-[62px] flex items-center justify-between">

                    {/* Logo */}
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => navigate("/")}
                    >
                        <img src={homepageSettings?.brand.logoUrl} className="w-8 h-8" alt=""/>
                        <span className="hidden sm:block font-semibold text-gray-900 text-lg">
              {homepageSettings?.brand.name}
            </span>
                    </div>

                    {/* Desktop Navigation */}
                    <Group gap={24} visibleFrom="sm">
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.path;
                            return (
                                <button
                                    key={link.path}
                                    onClick={() => navigate(link.path)}
                                    className={`
                    relative text-sm font-medium transition
                    ${isActive ? "text-gray-900" : "text-gray-600 hover:text-gray-900"}
                  `}
                                >
                                    {link.label}

                                    {/* Minimal underline */}
                                    {isActive && (
                                        <span
                                            className="absolute left-0 right-0 -bottom-1 h-0.5 bg-gray-900 rounded-full"></span>
                                    )}
                                </button>
                            );
                        })}
                    </Group>

                    {/* Right User Actions */}
                    <Group visibleFrom="sm">
                        {!authState ? (
                            <>
                                <Button variant="default" size="xs" onClick={() => navigate("/sign-in")}>
                                    Log in
                                </Button>
                                <Button
                                    size="xs"
                                    className="bg-blue-600! hover:bg-blue-700! text-white"
                                    onClick={() => navigate("/sign-up")}
                                >
                                    Sign up
                                </Button>
                            </>
                        ) : (
                            <Menu shadow="md" width={200} position="bottom-end">
                                <Menu.Target>
                                    <Avatar radius="xl" className="cursor-pointer bg-gray-200 text-gray-900">
                                        {authState.firstName.charAt(0).toUpperCase()}
                                    </Avatar>
                                </Menu.Target>

                                <Menu.Dropdown>
                                    <Menu.Label>Hello, {authState.firstName}</Menu.Label>
                                    <Menu.Item onClick={() => navigate("/my-appointments")}>My Appointments</Menu.Item>
                                    <Menu.Item onClick={() => navigate("/settings")}>Settings</Menu.Item>
                                    <Menu.Divider/>
                                    <Menu.Item color="red" onClick={handleLogout}>Logout</Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        )}
                    </Group>

                    <Burger opened={drawerOpened} onClick={toggleDrawer} hiddenFrom="sm"/>
                </div>
            </header>

            {/* Main content */}
            <main className="p-6 max-w-7xl mx-auto">
                <Outlet/>
            </main>

            {/* Mobile Drawer */}
            <Drawer
                opened={drawerOpened}
                onClose={closeDrawer}
                size="100%"
                padding="md"
                title="Navigation"
                hiddenFrom="sm"
            >
                <ScrollArea h="calc(100vh - 80px)">
                    <Divider my="sm"/>

                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.path;
                        return (
                            <button
                                key={link.path}
                                onClick={() => {
                                    navigate(link.path);
                                    closeDrawer();
                                }}
                                className={`
                  w-full text-left px-4 py-3 rounded-md text-base font-medium
                  ${isActive ? "text-blue-600 bg-blue-50" : "text-gray-700 hover:bg-gray-100"}
                `}
                            >
                                {link.label}
                            </button>
                        );
                    })}

                    <Divider my="sm"/>

                    {!authState ? (
                        <Group justify="center" grow pb="xl" px="md">
                            <Button variant="default" onClick={() => navigate("/sign-in")}>Log in</Button>
                            <Button className="bg-blue-600! hover:bg-blue-700! text-white"
                                    onClick={() => navigate("/sign-up")}>
                                Sign up
                            </Button>
                        </Group>
                    ) : (
                        <Group justify="center" grow pb="xl" px="md">
                            <Button onClick={() => navigate("/my-appointments")}>My Appointments</Button>
                            <Button color="red" variant="outline" onClick={handleLogout}>
                                Logout
                            </Button>
                        </Group>
                    )}
                </ScrollArea>
            </Drawer>
        </HomepageSettingsContext.Provider>
    );
}

