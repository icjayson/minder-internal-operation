"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  BellIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
  SmileIcon,
  TerminalIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/design-system/components/alert";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/design-system/components/breadcrumb";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/design-system/components/dialog";
import { DirectionProvider } from "@/design-system/components/direction";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/design-system/components/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/design-system/components/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/design-system/components/hover-card";
import { Input } from "@/design-system/components/input";
import { Label } from "@/design-system/components/label";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/design-system/components/menubar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/design-system/components/navigation-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/design-system/components/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/components/popover";
import { Toaster } from "@/design-system/components/sonner";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/design-system/components/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/design-system/components/tooltip";

import type { ComponentDoc } from "./types";

export const overlayDocs: ComponentDoc[] = [
  {
    name: "dialog",
    title: "Dialog",
    description: "A modal window overlaid on the page, trapping focus until dismissed.",
    category: "Overlay",
    usage: `import { Dialog, DialogContent, DialogTrigger } from "@/design-system/components/dialog"

<Dialog>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent>…</DialogContent>
</Dialog>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Open it — focus is trapped and Escape closes.",
        code: `<Dialog>
  <DialogTrigger asChild><Button variant="outline">Edit profile</Button></DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Edit profile</DialogTitle>
      <DialogDescription>Make changes to your profile here.</DialogDescription>
    </DialogHeader>
    <div className="grid gap-4">…</div>
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
      <Button type="submit">Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
        Component: () => (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Edit profile</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>
                  Make changes to your profile here. Click save when you&apos;re done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="demo-dialog-name">Name</Label>
                  <Input id="demo-dialog-name" defaultValue="Minder Ops" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="demo-dialog-handle">Handle</Label>
                  <Input id="demo-dialog-handle" defaultValue="@minder" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ),
      },
    ],
  },
  {
    name: "alert-dialog",
    title: "Alert Dialog",
    description: "A modal that interrupts the user with an action that needs confirming.",
    category: "Overlay",
    usage: `import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from "@/design-system/components/alert-dialog"

<AlertDialog>…</AlertDialog>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<AlertDialog>
  <AlertDialogTrigger asChild><Button variant="destructive">Delete deployment</Button></AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`,
        Component: () => (
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
        ),
      },
    ],
  },
  {
    name: "sheet",
    title: "Sheet",
    description: "A dialog that slides in from an edge of the screen.",
    category: "Overlay",
    usage: `import { Sheet, SheetContent, SheetTrigger } from "@/design-system/components/sheet"

<Sheet><SheetTrigger asChild><Button>Open</Button></SheetTrigger><SheetContent>…</SheetContent></Sheet>`,
    demos: [
      {
        id: "sides",
        title: "Sides",
        description: "Each button opens the sheet from a different edge.",
        code: `{["top", "right", "bottom", "left"].map((side) => (
  <Sheet key={side}>
    <SheetTrigger asChild><Button variant="outline">{side}</Button></SheetTrigger>
    <SheetContent side={side}>
      <SheetHeader>
        <SheetTitle>Edit profile</SheetTitle>
        <SheetDescription>Make changes here.</SheetDescription>
      </SheetHeader>
    </SheetContent>
  </Sheet>
))}`,
        Component: () => (
          <>
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <Sheet key={side}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="capitalize">
                    {side}
                  </Button>
                </SheetTrigger>
                <SheetContent side={side}>
                  <SheetHeader>
                    <SheetTitle>Edit profile</SheetTitle>
                    <SheetDescription>
                      Make changes to your profile here. Click save when you&apos;re done.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-4 px-4">
                    <Label htmlFor={`demo-sheet-${side}`}>Name</Label>
                    <Input id={`demo-sheet-${side}`} defaultValue="Minder Ops" />
                  </div>
                  <SheetFooter>
                    <Button>Save changes</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            ))}
          </>
        ),
      },
    ],
  },
  {
    name: "drawer",
    title: "Drawer",
    description: "A bottom sheet with drag-to-dismiss, built on Vaul.",
    category: "Overlay",
    usage: `import { Drawer, DrawerContent, DrawerTrigger } from "@/design-system/components/drawer"

<Drawer><DrawerTrigger asChild><Button>Open</Button></DrawerTrigger><DrawerContent>…</DrawerContent></Drawer>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Open it, then drag the handle down to dismiss.",
        code: `<Drawer>
  <DrawerTrigger asChild><Button variant="outline">Open drawer</Button></DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Move goal</DrawerTitle>
      <DrawerDescription>Set your daily activity goal.</DrawerDescription>
    </DrawerHeader>
    <DrawerFooter>
      <Button>Submit</Button>
      <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>`,
        Component: () => (
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Open drawer</Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="mx-auto w-full max-w-sm">
                <DrawerHeader>
                  <DrawerTitle>Move goal</DrawerTitle>
                  <DrawerDescription>Set your daily activity goal.</DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        ),
      },
    ],
  },
  {
    name: "popover",
    title: "Popover",
    description: "Rich content in a portal, triggered by a button.",
    category: "Overlay",
    usage: `import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/components/popover"

<Popover><PopoverTrigger asChild><Button>Open</Button></PopoverTrigger><PopoverContent>…</PopoverContent></Popover>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Popover>
  <PopoverTrigger asChild><Button variant="outline">Dimensions</Button></PopoverTrigger>
  <PopoverContent className="w-80">
    <div className="grid gap-3">
      <Label htmlFor="width">Width</Label>
      <Input id="width" defaultValue="100%" />
    </div>
  </PopoverContent>
</Popover>`,
        Component: () => (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Dimensions</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-3">
                <p className="text-sm font-medium">Dimensions</p>
                <div className="grid grid-cols-3 items-center gap-3">
                  <Label htmlFor="demo-popover-width">Width</Label>
                  <Input id="demo-popover-width" defaultValue="100%" className="col-span-2 h-8" />
                </div>
                <div className="grid grid-cols-3 items-center gap-3">
                  <Label htmlFor="demo-popover-height">Height</Label>
                  <Input id="demo-popover-height" defaultValue="25px" className="col-span-2 h-8" />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ),
      },
    ],
  },
  {
    name: "hover-card",
    title: "Hover Card",
    description: "A preview card shown when the user hovers a link.",
    category: "Overlay",
    usage: `import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/design-system/components/hover-card"

<HoverCard>…</HoverCard>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Hover the link to open the card.",
        code: `<HoverCard>
  <HoverCardTrigger asChild><Button variant="link">@minder</Button></HoverCardTrigger>
  <HoverCardContent className="w-72">
    The internal operations console — vendored components, no CLI.
  </HoverCardContent>
</HoverCard>`,
        Component: () => (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="link">@minder</Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 text-sm">
              <p className="font-semibold">Minder Ops</p>
              <p className="mt-1 text-muted-foreground">
                The internal operations console — vendored components, no CLI.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarIcon className="size-3.5" /> Joined August 2026
              </p>
            </HoverCardContent>
          </HoverCard>
        ),
      },
    ],
  },
  {
    name: "tooltip",
    title: "Tooltip",
    description: "A label shown on hover or focus of an element.",
    category: "Overlay",
    usage: `import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system/components/tooltip"

<Tooltip><TooltipTrigger asChild><Button>Hover</Button></TooltipTrigger><TooltipContent>Label</TooltipContent></Tooltip>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Hover or tab to the button.",
        code: `<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild><Button variant="outline">Hover me</Button></TooltipTrigger>
    <TooltipContent>Add to library</TooltipContent>
  </Tooltip>
</TooltipProvider>`,
        Component: () => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>Add to library</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Add">
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New deployment</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      },
    ],
  },
  {
    name: "dropdown-menu",
    title: "Dropdown Menu",
    description: "A menu of actions or functions, triggered by a button.",
    category: "Overlay",
    usage: `import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/design-system/components/dropdown-menu"

<DropdownMenu>…</DropdownMenu>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="outline">Open menu</Button></DropdownMenuTrigger>
  <DropdownMenuContent className="w-56" align="start">
    <DropdownMenuLabel>My account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem><UserIcon /> Profile <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut></DropdownMenuItem>
    <DropdownMenuItem variant="destructive"><LogOutIcon /> Log out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
        Component: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon /> Profile
                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCardIcon /> Billing
                <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <SettingsIcon /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <LogOutIcon /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
  },
  {
    name: "context-menu",
    title: "Context Menu",
    description: "A menu triggered by a right-click or long-press.",
    category: "Overlay",
    usage: `import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/design-system/components/context-menu"

<ContextMenu>…</ContextMenu>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Right-click inside the dashed box.",
        code: `<ContextMenu>
  <ContextMenuTrigger className="grid h-32 w-72 place-items-center rounded-md border border-dashed text-sm">
    Right-click here
  </ContextMenuTrigger>
  <ContextMenuContent className="w-52">
    <ContextMenuItem>Back <ContextMenuShortcut>⌘[</ContextMenuShortcut></ContextMenuItem>
    <ContextMenuCheckboxItem checked>Show bookmarks</ContextMenuCheckboxItem>
  </ContextMenuContent>
</ContextMenu>`,
        Component: () => (
          <ContextMenu>
            <ContextMenuTrigger className="grid h-32 w-72 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
              Right-click here
            </ContextMenuTrigger>
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
              <ContextMenuCheckboxItem>Show full URLs</ContextMenuCheckboxItem>
            </ContextMenuContent>
          </ContextMenu>
        ),
      },
    ],
  },
  {
    name: "menubar",
    title: "Menubar",
    description: "A persistent menu bar, common in desktop applications.",
    category: "Navigation",
    usage: `import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/design-system/components/menubar"

<Menubar>…</Menubar>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Open one menu, then hover across the others.",
        code: `<Menubar>
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>New tab <MenubarShortcut>⌘T</MenubarShortcut></MenubarItem>
      <MenubarSeparator />
      <MenubarItem>Print… <MenubarShortcut>⌘P</MenubarShortcut></MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>`,
        Component: () => (
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  New tab <MenubarShortcut>⌘T</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>New window</MenubarItem>
                <MenubarSeparator />
                <MenubarItem>
                  Print… <MenubarShortcut>⌘P</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>Edit</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  Undo <MenubarShortcut>⌘Z</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>View</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>Reload</MenubarItem>
                <MenubarItem>Toggle fullscreen</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        ),
      },
    ],
  },
  {
    name: "navigation-menu",
    title: "Navigation Menu",
    description: "A collection of links for navigating a site.",
    category: "Navigation",
    usage: `import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from "@/design-system/components/navigation-menu"

<NavigationMenu>…</NavigationMenu>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Hover a trigger to reveal its panel.",
        code: `<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Product</NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[380px] gap-2 p-3">
          <li><NavigationMenuLink>Overview</NavigationMenuLink></li>
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>`,
        Component: () => (
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Product</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[380px] gap-2 p-3">
                    {[
                      ["Overview", "What the console does, at a glance."],
                      ["Deployments", "Track every FDE kit rollout."],
                      ["Alerts", "Everything the agents flagged."],
                    ].map(([title, blurb]) => (
                      <li key={title}>
                        <NavigationMenuLink className="block rounded-md p-2">
                          <div className="text-sm font-medium">{title}</div>
                          <p className="text-sm text-muted-foreground">{blurb}</p>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[260px] gap-2 p-3">
                    {["Documentation", "Changelog", "Support"].map((title) => (
                      <li key={title}>
                        <NavigationMenuLink className="block rounded-md p-2 text-sm">
                          {title}
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        ),
      },
    ],
  },
  {
    name: "command",
    title: "Command",
    description: "Fast, composable command palette and filtered list.",
    category: "Navigation",
    usage: `import { Command, CommandInput, CommandItem, CommandList } from "@/design-system/components/command"

<Command><CommandInput /><CommandList>…</CommandList></Command>`,
    demos: [
      {
        id: "inline",
        title: "Inline",
        description: "Type to filter the list.",
        code: `<Command className="rounded-lg border shadow-md md:min-w-[420px]">
  <CommandInput placeholder="Type a command or search…" />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem><CalendarIcon /> Calendar</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>`,
        Component: () => (
          <Command className="rounded-lg border shadow-md md:min-w-[420px]">
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
                <CommandItem>
                  <SettingsIcon /> Settings
                  <CommandShortcut>⌘S</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        ),
      },
      {
        id: "dialog",
        title: "Command dialog",
        description: "Press ⌘J (or Ctrl J) with the preview focused.",
        code: `const [open, setOpen] = React.useState(false)

<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Type a command…" />
  <CommandList>…</CommandList>
</CommandDialog>`,
        Component: () => <CommandDialogDemo />,
      },
    ],
  },
  {
    name: "breadcrumb",
    title: "Breadcrumb",
    description: "Shows the path to the current resource with links.",
    category: "Navigation",
    usage: `import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "@/design-system/components/breadcrumb"

<Breadcrumb>…</Breadcrumb>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbPage>Button</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`,
        Component: () => (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Design system</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Components</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ),
      },
    ],
  },
  {
    name: "pagination",
    title: "Pagination",
    description: "Page navigation with next and previous links.",
    category: "Navigation",
    usage: `import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/design-system/components/pagination"

<Pagination>…</Pagination>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Pagination>
  <PaginationContent>
    <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
    <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
    <PaginationItem><PaginationEllipsis /></PaginationItem>
    <PaginationItem><PaginationNext href="#" /></PaginationItem>
  </PaginationContent>
</Pagination>`,
        Component: () => <PaginationDemo />,
      },
    ],
  },
  {
    name: "alert",
    title: "Alert",
    description: "Displays a callout for user attention.",
    category: "Feedback",
    usage: `import { Alert, AlertDescription, AlertTitle } from "@/design-system/components/alert"

<Alert><AlertTitle>Heads up!</AlertTitle><AlertDescription>…</AlertDescription></Alert>`,
    demos: [
      {
        id: "default",
        title: "Variants",
        code: `<Alert>
  <TerminalIcon />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertCircleIcon />
  <AlertTitle>Deployment failed</AlertTitle>
  <AlertDescription>Step 4 of 8 timed out. Retry when ready.</AlertDescription>
</Alert>`,
        Component: () => (
          <div className="grid w-full max-w-lg gap-4">
            <Alert>
              <CheckCircle2Icon />
              <AlertTitle>Snapshot up to date</AlertTitle>
              <AlertDescription>
                All 61 components match the vendored new-york-v4 source.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Deployment failed</AlertTitle>
              <AlertDescription>Step 4 of 8 timed out. Retry when ready.</AlertDescription>
            </Alert>
          </div>
        ),
      },
    ],
  },
  {
    name: "sonner",
    title: "Sonner",
    description: "An opinionated toast component.",
    category: "Feedback",
    usage: `import { Toaster } from "@/design-system/components/sonner"
import { toast } from "sonner"

<Toaster />
toast("Event has been created")`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Click to fire a real toast.",
        code: `<Toaster />
<Button variant="outline" onClick={() => toast("Deployment queued", {
  description: "Acme Corp · FDE kit v1.4",
  action: { label: "Undo", onClick: () => {} },
})}>
  Show toast
</Button>`,
        Component: () => (
          <>
            <Toaster />
            <Button
              variant="outline"
              onClick={() =>
                toast("Deployment queued", {
                  description: "Acme Corp · FDE kit v1.4",
                  action: { label: "Undo", onClick: () => undefined },
                })
              }
            >
              Show toast
            </Button>
            <Button variant="outline" onClick={() => toast.success("Deployment finished")}>
              Success
            </Button>
            <Button variant="outline" onClick={() => toast.error("Step 4 of 8 timed out")}>
              Error
            </Button>
          </>
        ),
      },
    ],
  },
  {
    name: "direction",
    title: "Direction",
    description: "Provides reading direction to every component below it.",
    category: "Layout",
    usage: `import { DirectionProvider } from "@/design-system/components/direction"

<DirectionProvider dir="rtl">…</DirectionProvider>`,
    demos: [
      {
        id: "default",
        title: "RTL",
        description: "The same menu, mirrored by the provider.",
        code: `<DirectionProvider dir="rtl">
  <div dir="rtl">
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline">القائمة</Button></DropdownMenuTrigger>
      <DropdownMenuContent><DropdownMenuItem>الملف الشخصي</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
  </div>
</DirectionProvider>`,
        Component: () => (
          <DirectionProvider dir="rtl">
            <div dir="rtl" className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <BellIcon /> القائمة
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>الملف الشخصي</DropdownMenuItem>
                  <DropdownMenuItem>الإعدادات</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button>إرسال</Button>
            </div>
          </DirectionProvider>
        ),
      },
    ],
  },
];

function CommandDialogDemo() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open command dialog
      </Button>
      <span className="text-sm text-muted-foreground">or press ⌘J</span>
      <CommandDialog open={open} onOpenChange={setOpen}>
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
            <CommandItem>
              <TerminalIcon /> Run command
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

function PaginationDemo() {
  const [page, setPage] = React.useState(2);
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setPage((value) => Math.max(1, value - 1));
            }}
          />
        </PaginationItem>
        {[1, 2, 3].map((value) => (
          <PaginationItem key={value}>
            <PaginationLink
              href="#"
              isActive={page === value}
              onClick={(event) => {
                event.preventDefault();
                setPage(value);
              }}
            >
              {value}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setPage((value) => Math.min(3, value + 1));
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
