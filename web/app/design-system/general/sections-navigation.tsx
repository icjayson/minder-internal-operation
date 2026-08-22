"use client";

import * as React from "react";
import { CheckIcon, FolderIcon, InboxIcon, SearchIcon, SettingsIcon } from "lucide-react";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/design-system/components/dropdown-menu";
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
import { Separator } from "@/design-system/components/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/design-system/components/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system/components/tabs";

import { Spec, SpecGrid, generalStyles as styles } from "./shell";

/** Composed from Separator + Button — the library has no stepper primitive. */
function Stepper() {
  const steps = ["Workspace", "Members", "Billing", "Done"];
  const current = 1;
  return (
    <ol className={styles.stepper}>
      {steps.map((step, index) => (
        <li key={step} data-state={index < current ? "done" : index === current ? "current" : "todo"}>
          <span className={styles.stepperDot}>{index < current ? <CheckIcon /> : index + 1}</span>
          <span className={styles.stepperLabel}>{step}</span>
          {index < steps.length - 1 ? <span className={styles.stepperLine} /> : null}
        </li>
      ))}
    </ol>
  );
}

export function NavigationSection() {
  return (
    <SpecGrid columns={2}>
      <Spec label="Navbar / Header" source="components/navigation-menu" wide overflow>
        <div className={styles.navbar}>
          <strong>Minder</strong>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Product</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className={styles.navPanel}>
                    {[
                      ["Overview", "What the console does, at a glance."],
                      ["Deployments", "Track every kit rollout."],
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
                  <ul className={styles.navPanelNarrow}>
                    {["Documentation", "Changelog", "Support"].map((title) => (
                      <li key={title}>
                        <NavigationMenuLink className="block rounded-md p-2 text-sm">{title}</NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <Button size="sm">Get started free</Button>
        </div>
      </Spec>

      <Spec label="Sidebar / Side navigation" source="components/sidebar" wide>
        <div className={styles.sidebarFrame}>
          <SidebarProvider>
            <Sidebar collapsible="icon">
              <SidebarHeader className="px-3 py-3 text-sm font-semibold">Minder</SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {[
                        { title: "Inbox", icon: InboxIcon, badge: "12" },
                        { title: "Search", icon: SearchIcon },
                        { title: "Projects", icon: FolderIcon, badge: "4" },
                        { title: "Settings", icon: SettingsIcon },
                      ].map((item, index) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton isActive={index === 0} tooltip={item.title}>
                            <item.icon />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                          {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <SidebarInset>
              <div className="flex items-center gap-2 border-b p-3">
                <SidebarTrigger />
                <span className="text-sm font-medium">Inbox</span>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </Spec>

      <Spec label="Breadcrumb" source="components/breadcrumb">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Design system</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Navigation</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Spec>

      <Spec label="Tabs" source="components/tabs">
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="pt-3 text-sm text-muted-foreground">
            Make changes to your account here.
          </TabsContent>
          <TabsContent value="password" className="pt-3 text-sm text-muted-foreground">
            Change your password here.
          </TabsContent>
          <TabsContent value="api" className="pt-3 text-sm text-muted-foreground">
            Rotate the workspace API key.
          </TabsContent>
        </Tabs>
      </Spec>

      <Spec label="Pagination" source="components/pagination">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Spec>

      <Spec label="Stepper" source="composed · separator + button">
        <Stepper />
      </Spec>

      <Spec label="Menu / Dropdown menu" source="components/dropdown-menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Open menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Profile <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Spec>

      <Spec label="Footer" source="composed · separator" wide>
        <div className={styles.footerSpec}>
          <div>
            <strong>Minder</strong>
            <p>General design system</p>
          </div>
          <Separator className="my-4" />
          <div className={styles.footerLinks}>
            <a href="#foundation">Foundation</a>
            <a href="#forms">Form &amp; input</a>
            <a href="#navigation">Navigation</a>
            <a href="#feedback">Feedback</a>
            <a href="#data">Data display</a>
          </div>
        </div>
      </Spec>
    </SpecGrid>
  );
}
