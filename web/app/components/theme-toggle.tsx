"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/design-system/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system/components/tooltip";

import { useAppTheme } from "./theme";

// Sidebar button that flips between the two skies.
export function ThemeToggle() {
  const { theme, mounted, toggle } = useAppTheme();

  // Icon and label reflect the sky you'll switch TO. Until mounted the answer
  // is not known yet, so it renders the same thing the server did.
  const goesLight = theme === "dark";
  const showMoon = mounted ? !goesLight : true;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {showMoon ? <MoonIcon /> : <SunIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{goesLight ? "Light" : "Dark"}</TooltipContent>
    </Tooltip>
  );
}
