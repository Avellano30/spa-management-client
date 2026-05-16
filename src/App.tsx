import {
    Box,
    Burger,
    Button,

    Drawer,
    Group,
    ScrollArea,
    Menu,
    Loader,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate, useLocation, Outlet } from "react-router";
import { useAuth } from "./utils/AuthContext";
import useHandleLogout from "./modules/auth/handleLogout";
import { useEffect, useState } from "react";
import { getHomepageSettings, type HomepageSettings } from "./api/settings";
import { HomepageSettingsContext } from "./utils/HomepageSettingsContext";
import ThemeProvider from "./utils/ThemeProvider";
import ThemeToggle from "./components/ThemeToggle";

export default function AppLayout() {
    const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
        useDisclosure(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { authState } = useAuth();
    const { handleLogout } = useHandleLogout();
    const [homepageSettings, setHomepageSettings] =
        useState<HomepageSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const navLinks = [
        { label: "Home", path: "/" },
        { label: "Services", path: "/services" },
        { label: "About", path: "/about" },
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
                <Loader size="lg" />
            </Box>
        );
    }

    return (
        <ThemeProvider>
            <HomepageSettingsContext.Provider value={homepageSettings}>

                {/* ── NAVBAR ───────────────────────────────────────────────────── */}
                <header
                    style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 100,
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        backgroundColor: "light-dark(rgba(255,255,255,0.82), rgba(20,20,22,0.82))",
                        borderBottom: "1px solid light-dark(rgba(0,0,0,0.07), rgba(255,255,255,0.07))",
                        transition: "background-color 0.2s ease",
                    }}
                >
                    <div
                        style={{
                            maxWidth: 1200,
                            margin: "0 auto",
                            padding: "0 24px",
                            height: 76,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 16,
                        }}
                    >

                        {/* ── LEFT: Logo ── */}
                        <div
                            onClick={() => navigate("/")}
                            style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                cursor: "pointer",
                                textDecoration: "none",
                                minWidth: 0,
                            }}
                        >
                            <img
                                src={homepageSettings?.brand.logoUrl}
                                style={{ width: 64, height: 64, objectFit: "contain", flexShrink: 0 }}
                                alt=""
                            />
                            <span
                                className="hidden sm:block"
                                style={{
                                    fontWeight: 700,
                                    fontSize: 20,
                                    letterSpacing: "-0.01em",
                                    color: "light-dark(#1a1a1a, #f0f0f0)",
                                    whiteSpace: "nowrap",
                                }}
                            >
                {homepageSettings?.brand.name}
              </span>
                        </div>

                        {/* ── CENTER: Nav Links ── */}
                        <nav
                            className="hidden sm:flex"
                            style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 2,
                            }}
                        >
                            {navLinks.map((link) => {
                                const isActive = location.pathname === link.path;
                                return (
                                    <button
                                        key={link.path}
                                        onClick={() => navigate(link.path)}
                                        style={{
                                            position: "relative",
                                            padding: "6px 14px",
                                            borderRadius: 8,
                                            border: "none",
                                            background: isActive
                                                ? "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))"
                                                : "transparent",
                                            color: isActive
                                                ? "light-dark(#111, #f5f5f5)"
                                                : "light-dark(#555, #999)",
                                            fontSize: 18,
                                            fontWeight: isActive ? 600 : 450,
                                            letterSpacing: "-0.01em",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            whiteSpace: "nowrap",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                (e.currentTarget as HTMLButtonElement).style.background =
                                                    "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.05))";
                                                (e.currentTarget as HTMLButtonElement).style.color =
                                                    "light-dark(#222, #ddd)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                                (e.currentTarget as HTMLButtonElement).style.color =
                                                    "light-dark(#555, #999)";
                                            }
                                        }}
                                    >
                                        {link.label}
                                        {isActive && (
                                            <span
                                                style={{
                                                    position: "absolute",
                                                    bottom: -1,
                                                    left: "50%",
                                                    transform: "translateX(-50%)",
                                                    width: 16,
                                                    height: 2,
                                                    borderRadius: 99,
                                                    background: "light-dark(#1971c2, #4dabf7)",
                                                }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* ── RIGHT: Actions ── */}
                        <div
                            className="hidden sm:flex"
                            style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: 8,
                            }}
                        >
                            <ThemeToggle />

                            {!authState ? (
                                <>
                                    <button
                                        onClick={() => navigate("/sign-in")}
                                        style={{
                                            padding: "6px 14px",
                                            borderRadius: 8,
                                            border: "1px solid light-dark(rgba(0,0,0,0.12), rgba(255,255,255,0.12))",
                                            background: "transparent",
                                            color: "light-dark(#333, #ccc)",
                                            fontSize: 13,
                                            fontWeight: 500,
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            whiteSpace: "nowrap",
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.background =
                                                "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))";
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                        }}
                                    >
                                        Log in
                                    </button>
                                    <button
                                        onClick={() => navigate("/sign-up")}
                                        style={{
                                            padding: "6px 14px",
                                            borderRadius: 8,
                                            border: "none",
                                            background: "light-dark(#1971c2, #1c7ed6)",
                                            color: "#fff",
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            whiteSpace: "nowrap",
                                            letterSpacing: "-0.01em",
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.background =
                                                "light-dark(#1864ab, #1971c2)";
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.background =
                                                "light-dark(#1971c2, #1c7ed6)";
                                        }}
                                    >
                                        Sign up
                                    </button>
                                </>
                            ) : (
                                <Menu shadow="md" width={200} position="bottom-end">
                                    <Menu.Target>
                                        <div
                                            style={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: "50%",
                                                background: "light-dark(#e7f5ff, #1a3a5c)",
                                                border: "1.5px solid light-dark(#1971c2, #4dabf7)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: "light-dark(#1864ab, #74c0fc)",
                                                cursor: "pointer",
                                                transition: "transform 0.15s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLDivElement).style.transform = "scale(1.06)";
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                                            }}
                                        >
                                            {authState.firstName.charAt(0).toUpperCase()}
                                        </div>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>Hello, {authState.firstName}</Menu.Label>
                                        <Menu.Item onClick={() => navigate("/my-appointments")}>
                                            My Appointments
                                        </Menu.Item>
                                        <Menu.Item onClick={() => navigate("/settings")}>
                                            Settings
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item color="red" onClick={handleLogout}>
                                            Logout
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            )}
                        </div>

                        {/* ── MOBILE: Burger ── */}
                        <Burger
                            opened={drawerOpened}
                            onClick={toggleDrawer}
                            hiddenFrom="sm"
                            size="sm"
                        />
                    </div>
                </header>

                {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
                <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
                    <Outlet />
                </main>

                {/* ── MOBILE DRAWER ────────────────────────────────────────────── */}
                <Drawer
                    opened={drawerOpened}
                    onClose={closeDrawer}
                    size="100%"
                    padding="md"
                    title={
                        <span style={{ fontWeight: 650, fontSize: 15, letterSpacing: "-0.01em" }}>
              {homepageSettings?.brand.name ?? "Menu"}
            </span>
                    }
                    hiddenFrom="sm"
                >
                    <ScrollArea h="calc(100vh - 80px)">


                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {navLinks.map((link) => {
                                const isActive = location.pathname === link.path;
                                return (
                                    <button
                                        key={link.path}
                                        onClick={() => {
                                            navigate(link.path);
                                            closeDrawer();
                                        }}
                                        style={{
                                            width: "100%",
                                            textAlign: "left",
                                            padding: "11px 14px",
                                            borderRadius: 10,
                                            border: "none",
                                            background: isActive
                                                ? "light-dark(#e7f5ff, #1a3a5c)"
                                                : "transparent",
                                            color: isActive
                                                ? "light-dark(#1864ab, #74c0fc)"
                                                : "light-dark(#444, #aaa)",
                                            fontSize: 15,
                                            fontWeight: isActive ? 600 : 450,
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        {link.label}
                                    </button>
                                );
                            })}
                        </div>


                        <Group pb="md">
                            <ThemeToggle />
                        </Group>

                        {!authState ? (
                            <Group justify="center" grow pb="xl" px="md">
                                <Button variant="default" onClick={() => navigate("/sign-in")}>
                                    Log in
                                </Button>
                                <Button
                                    style={{ background: "#1971c2", color: "#fff" }}
                                    onClick={() => navigate("/sign-up")}
                                >
                                    Sign up
                                </Button>
                            </Group>
                        ) : (
                            <Group justify="center" grow pb="xl" px="md">
                                <Button onClick={() => navigate("/my-appointments")}>
                                    My Appointments
                                </Button>
                                <Button color="red" variant="outline" onClick={handleLogout}>
                                    Logout
                                </Button>
                            </Group>
                        )}
                    </ScrollArea>
                </Drawer>

            </HomepageSettingsContext.Provider>
        </ThemeProvider>
    );
}