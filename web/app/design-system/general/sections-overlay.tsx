"use client";

import * as React from "react";
import { CalendarIcon, SettingsIcon, SmileIcon, UserIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/design-system/components/alert-dialog";
import { Button } from "@/design-system/components/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/design-system/components/command";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/design-system/components/context-menu";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/design-system/components/dropdown-menu";

import { Spec, SpecGrid, generalStyles as styles } from "./shell";

function CommandPaletteSpec() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={styles.stack}>
      {/* defaultValue is a sentinel that matches no item, and it is load-bearing.
          On mount cmdk auto-selects its first item whenever the value is empty
          (`n.current.value || W()`) and then calls scrollIntoView on it — which
          on a page this tall drags the reader from the top straight down to this
          specimen. Seeding a value that matches nothing skips the auto-select,
          so nothing is selected, so there is nothing to scroll to. Arrowing or
          typing selects normally from there; only the pre-highlighted first row
          is given up, which an inline specimen is better off without anyway.
          The palette below is a dialog and unmounted while closed, so it never
          had the problem. */}
      <Command className={styles.commandFrame} defaultValue="__no-initial-selection__">
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <CalendarIcon /> Calendar
            </CommandItem>
            <CommandItem>
              <SmileIcon /> Search emoji
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>
              <UserIcon /> Profile
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open as a dialog
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <CalendarIcon /> Calendar
            </CommandItem>
            <CommandItem>
              <SettingsIcon /> Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

export function OverlaySection() {
  return (
    <SpecGrid>
      <Spec label="Dropdown menu" source="components/dropdown-menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">View options</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>Status bar</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Activity bar</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Reset</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Spec>

      <Spec label="Context menu" source="components/context-menu">
        <ContextMenu>
          <ContextMenuTrigger className={styles.contextTarget}>Right-click here</ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            <ContextMenuLabel>Page</ContextMenuLabel>
            <ContextMenuItem>
              Back <ContextMenuShortcut>⌘[</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Reload <ContextMenuShortcut>⌘R</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem checked>Show bookmarks</ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenu>
      </Spec>

      <Spec label="Command palette" source="components/command" wide>
        <CommandPaletteSpec />
      </Spec>

      <Spec label="Confirmation dialog" source="components/alert-dialog">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete deployment</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the deployment and its progress history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Spec>
    </SpecGrid>
  );
}
