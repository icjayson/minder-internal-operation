"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/design-system/components/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/design-system/components/navigation-menu";

import styles from "./page.module.css";
import { useDesignSystemTheme } from "./theme-context";

export const SECTIONS = [
  { href: "/design-system/general", label: "General design system" },
  { href: "/design-system/dashboard", label: "Dashboard design system" },
  { href: "/design-system/chat", label: "AI chat design system" },
  { href: "/design-system/library", label: "All component library" },
] as const;

export function DesignSystemNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggleDark } = useDesignSystemTheme();

  /** Sends you to the general system's stylesheet, from wherever you are. */
  function goToStylesheet() {
    const target = "/design-system/general";
    if (pathname === target) {
      document.getElementById("stylesheet")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    router.push(`${target}#stylesheet`);
  }

  return (
    <header className={styles.systemNav}>
      <Link className={styles.brand} href="/design-system/general">
        <Image
          src="/minder-platform-icon.png"
          alt=""
          width={28}
          height={28}
          className={styles.brandLogo}
          priority
        />
        <span>Minder</span>
      </Link>

      <NavigationMenu className={styles.systemNavMenu}>
        <NavigationMenuList>
          {SECTIONS.map((section) => (
            <NavigationMenuItem key={section.href}>
              <NavigationMenuLink
                asChild
                active={pathname === section.href}
                className={styles.systemTab}
              >
                <Link href={section.href}>{section.label}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <div className={styles.systemNavActions}>
        <Button size="sm" onClick={goToStylesheet}>
          Get global.css
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={dark}
          aria-label={dark ? "Switch to the light sky" : "Switch to the dark sky"}
          onClick={toggleDark}
        >
          {dark ? <MoonIcon /> : <SunIcon />}
        </Button>
      </div>
    </header>
  );
}
