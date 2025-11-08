import {
  Box,
  Burger,
  Button,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  Menu,
  Avatar,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate, useLocation, Outlet } from "react-router";
import { useAuth } from "./utils/AuthContext";
import useHandleLogout from "./modules/auth/handleLogout";

export default function AppLayout() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { authState } = useAuth();
  const { handleLogout } = useHandleLogout();

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "About", path: "/about" },
    { label: "Services", path: "/services" },
  ];

  return (
    <Box pb={120}>
      {/* HEADER */}
      <header className="flex items-center justify-between h-[60px] px-6 border-b border-gray-200 dark:border-gray-700">
        <img
          src="/vite.svg"
          alt="logo"
          className="w-8 h-8 cursor-pointer"
          onClick={() => navigate("/")}
        />

        {/* NAV LINKS (Desktop) */}
        <Group h="100%" gap={0} visibleFrom="sm">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`relative px-4 py-2 text-sm font-medium transition-colors duration-200 
                  ${
                    isActive
                      ? "text-blue-500 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:text-blue-500"
                  }`}
              >
                {link.label}
                <span
                  className={`absolute left-1/2 -bottom-0.5 h-0.5 w-1/2 rounded transform -translate-x-1/2 transition-all duration-200 
                    ${
                      isActive
                        ? "bg-blue-500 dark:bg-blue-400 scale-x-100"
                        : "bg-transparent scale-x-0"
                    }`}
                />
              </button>
            );
          })}
        </Group>

        {/* RIGHT SIDE BUTTONS */}
        <Group visibleFrom="sm">
          {!authState ? (
            <>
              <Button variant="default" onClick={() => navigate("/sign-in")}>
                Log in
              </Button>
              <Button onClick={() => navigate("/sign-up")}>Sign up</Button>
            </>
          ) : (
            <Menu shadow="md" width={180}>
              <Menu.Target>
                <Avatar color="blue" className="cursor-pointer">
                  {authState.firstName.charAt(0).toUpperCase()}
                </Avatar>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  Hello, {authState.firstName} 👋
                </Menu.Label>
                <Menu.Item onClick={() => navigate("/my-appointments")}>
                  My Appointments
                </Menu.Item>
                <Menu.Item onClick={() => navigate("/settings")}>
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" onClick={() => handleLogout()}>
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>

        {/* MOBILE BURGER */}
        <Burger opened={drawerOpened} onClick={toggleDrawer} hiddenFrom="sm" />
      </header>

      {/* MAIN CONTENT */}
      <main className="p-6">
        <Outlet />
      </main>

      {/* DRAWER FOR MOBILE */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title="Navigation"
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px)" mx="-md">
          <Divider my="sm" />
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  closeDrawer();
                }}
                className={`block w-full text-left px-4 py-3 rounded-md text-base font-medium transition-colors 
                  ${
                    isActive
                      ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
              >
                {link.label}
              </button>
            );
          })}

          <Divider my="sm" />

          {!authState ? (
            <Group justify="center" grow pb="xl" px="md">
              <Button variant="default" onClick={() => navigate("/sign-in")}>
                Log in
              </Button>
              <Button onClick={() => navigate("/sign-up")}>Sign up</Button>
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
    </Box>
  );
}

