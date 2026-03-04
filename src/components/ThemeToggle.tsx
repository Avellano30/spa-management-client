import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { useTheme } from "../utils/ThemeProvider";

export default function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useTheme();
  const dark = colorScheme === "dark";

  return (
    <Tooltip label={dark ? "Switch to light" : "Switch to dark"}>
      <ActionIcon
        variant="outline"
        onClick={() => toggleColorScheme()}
        title={dark ? "Switch to light" : "Switch to dark"}
        size="lg"
      >
        {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}
