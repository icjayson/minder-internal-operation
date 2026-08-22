"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChevronsUpDownIcon,
  CloudIcon,
  FolderIcon,
  InboxIcon,
  MoreHorizontalIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/design-system/components/accordion";
import { AspectRatio } from "@/design-system/components/aspect-ratio";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/design-system/components/avatar";
import { Badge } from "@/design-system/components/badge";
import { Button } from "@/design-system/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/design-system/components/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/design-system/components/carousel";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/design-system/components/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/design-system/components/collapsible";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/design-system/components/empty";
import { Input } from "@/design-system/components/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/design-system/components/item";
import { Kbd, KbdGroup } from "@/design-system/components/kbd";
import { Label } from "@/design-system/components/label";
import { Progress } from "@/design-system/components/progress";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/design-system/components/resizable";
import { ScrollArea } from "@/design-system/components/scroll-area";
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
import { Skeleton } from "@/design-system/components/skeleton";
import { Spinner } from "@/design-system/components/spinner";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/design-system/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system/components/tabs";
import { Textarea } from "@/design-system/components/textarea";

import demoStyles from "./demos.module.css";
import type { ComponentDoc } from "./types";

export const layoutDocs: ComponentDoc[] = [
  {
    name: "card",
    title: "Card",
    description: "A container with a header, content, and footer.",
    category: "Layout",
    usage: `import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/components/card"

<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>Content</CardContent>
</Card>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Card className="w-[340px]">
  <CardHeader>
    <CardTitle>Deploy FDE kit</CardTitle>
    <CardDescription>Roll the kit out to a new customer.</CardDescription>
    <CardAction><Button variant="ghost" size="icon-sm"><MoreHorizontalIcon /></Button></CardAction>
  </CardHeader>
  <CardContent>
    <Label htmlFor="customer">Customer</Label>
    <Input id="customer" placeholder="Acme Corp" />
  </CardContent>
  <CardFooter className="gap-2">
    <Button className="flex-1">Deploy</Button>
    <Button variant="outline" className="flex-1">Cancel</Button>
  </CardFooter>
</Card>`,
        Component: () => (
          <Card className="w-[340px]">
            <CardHeader>
              <CardTitle>Deploy FDE kit</CardTitle>
              <CardDescription>Roll the kit out to a new customer.</CardDescription>
              <CardAction>
                <Button variant="ghost" size="icon-sm" aria-label="More">
                  <MoreHorizontalIcon />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Label htmlFor="demo-card-customer">Customer</Label>
              <Input id="demo-card-customer" placeholder="Acme Corp" />
            </CardContent>
            <CardFooter className="gap-2">
              <Button className="flex-1">Deploy</Button>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </CardFooter>
          </Card>
        ),
      },
    ],
  },
  {
    name: "item",
    title: "Item",
    description: "A dense row with media, text, and trailing actions.",
    category: "Layout",
    usage: `import { Item, ItemContent, ItemTitle } from "@/design-system/components/item"

<Item>
  <ItemContent><ItemTitle>Title</ItemTitle></ItemContent>
</Item>`,
    demos: [
      {
        id: "default",
        title: "Item group",
        code: `<ItemGroup className="w-full max-w-md">
  <Item variant="outline">
    <ItemMedia variant="icon"><FolderIcon /></ItemMedia>
    <ItemContent>
      <ItemTitle>Customer tracker</ItemTitle>
      <ItemDescription>Updated 12 minutes ago</ItemDescription>
    </ItemContent>
    <ItemActions><Button size="sm" variant="outline">Open</Button></ItemActions>
  </Item>
</ItemGroup>`,
        Component: () => (
          <ItemGroup className="w-full max-w-md">
            <Item variant="outline">
              <ItemMedia variant="icon">
                <FolderIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Customer tracker</ItemTitle>
                <ItemDescription>Updated 12 minutes ago</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button size="sm" variant="outline">
                  Open
                </Button>
              </ItemActions>
            </Item>
            <ItemSeparator />
            <Item variant="outline">
              <ItemMedia variant="icon">
                <CloudIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>FDE kit sync</ItemTitle>
                <ItemDescription>Running · 3 of 8 steps</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Spinner />
              </ItemActions>
            </Item>
          </ItemGroup>
        ),
      },
    ],
  },
  {
    name: "empty",
    title: "Empty",
    description: "A placeholder for a surface with nothing in it yet.",
    category: "Layout",
    usage: `import { Empty, EmptyHeader, EmptyTitle } from "@/design-system/components/empty"

<Empty><EmptyHeader><EmptyTitle>No results</EmptyTitle></EmptyHeader></Empty>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Empty className="w-full max-w-md border rounded-lg">
  <EmptyHeader>
    <EmptyMedia variant="icon"><InboxIcon /></EmptyMedia>
    <EmptyTitle>No deployments yet</EmptyTitle>
    <EmptyDescription>Kick off the first FDE kit deployment to see it here.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent><Button size="sm">New deployment</Button></EmptyContent>
</Empty>`,
        Component: () => (
          <Empty className="w-full max-w-md rounded-lg border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon />
              </EmptyMedia>
              <EmptyTitle>No deployments yet</EmptyTitle>
              <EmptyDescription>
                Kick off the first FDE kit deployment to see it here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm">New deployment</Button>
            </EmptyContent>
          </Empty>
        ),
      },
    ],
  },
  {
    name: "tabs",
    title: "Tabs",
    description: "Layered sections of content shown one panel at a time.",
    category: "Layout",
    usage: `import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system/components/tabs"

<Tabs defaultValue="account">
  <TabsList><TabsTrigger value="account">Account</TabsTrigger></TabsList>
  <TabsContent value="account">…</TabsContent>
</Tabs>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Click through — arrow keys move between triggers.",
        code: `<Tabs defaultValue="account" className="w-[400px]">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">Make changes to your account.</TabsContent>
  <TabsContent value="password">Change your password here.</TabsContent>
</Tabs>`,
        Component: () => (
          <Tabs defaultValue="account" className="w-[400px]">
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
        ),
      },
    ],
  },
  {
    name: "accordion",
    title: "Accordion",
    description: "A vertically stacked set of headings that each reveal a section of content.",
    category: "Layout",
    usage: `import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/design-system/components/accordion"

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>Yes.</AccordionContent>
  </AccordionItem>
</Accordion>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Open and close the panels — only one stays open at a time.",
        code: `<Accordion type="single" collapsible className="w-full max-w-md">
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
  </AccordionItem>
</Accordion>`,
        Component: () => (
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full max-w-md">
            <AccordionItem value="item-1">
              <AccordionTrigger>Is it accessible?</AccordionTrigger>
              <AccordionContent>
                Yes. It adheres to the WAI-ARIA design pattern.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Is it vendored locally?</AccordionTrigger>
              <AccordionContent>
                Yes. The source lives in <code>design-system/components/accordion.tsx</code> and is
                yours to edit.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Does it need the shadcn CLI?</AccordionTrigger>
              <AccordionContent>No. Nothing here depends on `shadcn add`.</AccordionContent>
            </AccordionItem>
          </Accordion>
        ),
      },
    ],
  },
  {
    name: "collapsible",
    title: "Collapsible",
    description: "An interactive component that expands and collapses a panel.",
    category: "Layout",
    usage: `import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/design-system/components/collapsible"

<Collapsible>
  <CollapsibleTrigger>Toggle</CollapsibleTrigger>
  <CollapsibleContent>Content</CollapsibleContent>
</Collapsible>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Collapsible className="w-[350px] space-y-2">
  <div className="flex items-center justify-between gap-4">
    <h4 className="text-sm font-semibold">3 repositories</h4>
    <CollapsibleTrigger asChild>
      <Button variant="ghost" size="icon-sm"><ChevronsUpDownIcon /></Button>
    </CollapsibleTrigger>
  </div>
  <div className="rounded-md border px-4 py-2 font-mono text-sm">@minder/ops</div>
  <CollapsibleContent className="space-y-2">
    <div className="rounded-md border px-4 py-2 font-mono text-sm">@minder/web</div>
  </CollapsibleContent>
</Collapsible>`,
        Component: () => (
          <Collapsible className="w-[350px] space-y-2">
            <div className="flex items-center justify-between gap-4">
              <h4 className="text-sm font-semibold">3 repositories</h4>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Toggle">
                  <ChevronsUpDownIcon />
                </Button>
              </CollapsibleTrigger>
            </div>
            <div className="rounded-md border px-4 py-2 font-mono text-sm">@minder/ops</div>
            <CollapsibleContent className="space-y-2">
              <div className="rounded-md border px-4 py-2 font-mono text-sm">@minder/web</div>
              <div className="rounded-md border px-4 py-2 font-mono text-sm">@minder/schema</div>
            </CollapsibleContent>
          </Collapsible>
        ),
      },
    ],
  },
  {
    name: "separator",
    title: "Separator",
    description: "Visually or semantically separates content.",
    category: "Layout",
    usage: `import { Separator } from "@/design-system/components/separator"

<Separator />`,
    demos: [
      {
        id: "default",
        title: "Horizontal and vertical",
        code: `<Separator />
<Separator orientation="vertical" />`,
        Component: () => (
          <div className="w-full max-w-sm">
            <div className="text-sm font-medium">Minder Ops</div>
            <p className="text-sm text-muted-foreground">An internal operations console.</p>
            <Separator className="my-4" />
            <div className="flex h-5 items-center gap-4 text-sm">
              <span>Blog</span>
              <Separator orientation="vertical" />
              <span>Docs</span>
              <Separator orientation="vertical" />
              <span>Source</span>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    name: "aspect-ratio",
    title: "Aspect Ratio",
    description: "Constrains content to a fixed width-to-height ratio.",
    category: "Layout",
    usage: `import { AspectRatio } from "@/design-system/components/aspect-ratio"

<AspectRatio ratio={16 / 9}>…</AspectRatio>`,
    demos: [
      {
        id: "default",
        title: "16 / 9",
        code: `<div className="w-[420px]">
  <AspectRatio ratio={16 / 9} className="rounded-lg bg-muted" />
</div>`,
        Component: () => (
          <div className="w-[420px]">
            <AspectRatio
              ratio={16 / 9}
              className="grid place-items-center rounded-lg bg-muted text-sm text-muted-foreground"
            >
              16 / 9
            </AspectRatio>
          </div>
        ),
      },
    ],
  },
  {
    name: "scroll-area",
    title: "Scroll Area",
    description: "Augments native scrolling with a styled, cross-browser scrollbar.",
    category: "Layout",
    usage: `import { ScrollArea } from "@/design-system/components/scroll-area"

<ScrollArea className="h-72 w-48 rounded-md border">…</ScrollArea>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Scroll inside the box — the bar fades in on hover.",
        code: `<ScrollArea className="h-56 w-64 rounded-md border p-4">
  {tags.map((tag) => <div key={tag}>{tag}</div>)}
</ScrollArea>`,
        Component: () => (
          <ScrollArea className="h-56 w-64 rounded-md border p-4">
            <div className="grid gap-3">
              {Array.from({ length: 30 }, (_, index) => (
                <React.Fragment key={index}>
                  <div className="text-sm">v1.2.0-beta.{30 - index}</div>
                  <Separator />
                </React.Fragment>
              ))}
            </div>
          </ScrollArea>
        ),
      },
    ],
  },
  {
    name: "resizable",
    title: "Resizable",
    description: "Accessible resizable panel groups and layouts.",
    category: "Layout",
    usage: `import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/design-system/components/resizable"

<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel>One</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel>Two</ResizablePanel>
</ResizablePanelGroup>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Drag the handle — panels resize with the keyboard too.",
        code: `<div className="h-52 w-full max-w-md">
  <ResizablePanelGroup orientation="horizontal" className="rounded-lg border">
    <ResizablePanel defaultSize="50%">Sidebar</ResizablePanel>
    <ResizableHandle withHandle />
    <ResizablePanel defaultSize="50%">Content</ResizablePanel>
  </ResizablePanelGroup>
</div>`,
        Component: () => (
          /* react-resizable-panels sets an inline height:100%, so the size has to
             come from a wrapper rather than a class on the group itself. */
          <div className="h-52 w-full max-w-md">
            <ResizablePanelGroup orientation="horizontal" className="rounded-lg border">
              <ResizablePanel defaultSize="40%">
                <div className="grid h-full place-items-center p-6 text-sm">Sidebar</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="60%">
                <ResizablePanelGroup orientation="vertical">
                  <ResizablePanel defaultSize="60%">
                    <div className="grid h-full place-items-center p-6 text-sm">Content</div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize="40%">
                    <div className="grid h-full place-items-center p-6 text-sm">Console</div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ),
      },
    ],
  },
  {
    name: "carousel",
    title: "Carousel",
    description: "A carousel with motion and swipe, built on Embla.",
    category: "Layout",
    usage: `import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/design-system/components/carousel"

<Carousel><CarouselContent><CarouselItem>…</CarouselItem></CarouselContent></Carousel>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Drag the slides or use the arrows.",
        code: `<Carousel className="w-full max-w-xs">
  <CarouselContent>
    {Array.from({ length: 5 }).map((_, index) => (
      <CarouselItem key={index}>
        <Card><CardContent className="grid aspect-square place-items-center">{index + 1}</CardContent></Card>
      </CarouselItem>
    ))}
  </CarouselContent>
  <CarouselPrevious />
  <CarouselNext />
</Carousel>`,
        Component: () => (
          <Carousel className="w-full max-w-xs">
            <CarouselContent>
              {Array.from({ length: 5 }, (_, index) => (
                <CarouselItem key={index}>
                  <Card>
                    <CardContent className="grid aspect-square place-items-center p-6 text-4xl font-semibold">
                      {index + 1}
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        ),
      },
    ],
  },
  {
    name: "table",
    title: "Table",
    description: "A responsive table component.",
    category: "Data display",
    usage: `import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/design-system/components/table"

<Table>…</Table>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Table>
  <TableCaption>Recent FDE kit deployments.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Customer</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Progress</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>…</TableBody>
</Table>`,
        Component: () => (
          <Table className="max-w-xl">
            <TableCaption>Recent FDE kit deployments.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["Acme Corp", "Hung", "Live", "100%"],
                ["Northwind", "Mai", "Deploying", "62%"],
                ["Globex", "Trung", "Blocked", "18%"],
              ].map(([customer, owner, status, progress]) => (
                <TableRow key={customer}>
                  <TableCell className="font-medium">{customer}</TableCell>
                  <TableCell>{owner}</TableCell>
                  <TableCell>
                    <Badge variant={status === "Blocked" ? "destructive" : "secondary"}>{status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{progress}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ),
      },
    ],
  },
  {
    name: "avatar",
    title: "Avatar",
    description: "An image element with a text fallback.",
    category: "Data display",
    usage: `import { Avatar, AvatarFallback, AvatarImage } from "@/design-system/components/avatar"

<Avatar><AvatarImage src="…" /><AvatarFallback>MO</AvatarFallback></Avatar>`,
    demos: [
      {
        id: "default",
        title: "Sizes and groups",
        code: `<Avatar><AvatarFallback>MO</AvatarFallback></Avatar>

<AvatarGroup>
  <Avatar><AvatarFallback>HN</AvatarFallback></Avatar>
  <Avatar><AvatarFallback>MT</AvatarFallback></Avatar>
  <AvatarGroupCount>+3</AvatarGroupCount>
</AvatarGroup>`,
        Component: () => (
          <>
            <Avatar>
              <AvatarFallback>MO</AvatarFallback>
            </Avatar>
            <Avatar className="size-12">
              <AvatarFallback>HN</AvatarFallback>
            </Avatar>
            <AvatarGroup>
              <Avatar>
                <AvatarFallback>HN</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>MT</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>TL</AvatarFallback>
              </Avatar>
              <AvatarGroupCount>+3</AvatarGroupCount>
            </AvatarGroup>
          </>
        ),
      },
    ],
  },
  {
    name: "badge",
    title: "Badge",
    description: "Displays a badge or a component that looks like one.",
    category: "Data display",
    usage: `import { Badge } from "@/design-system/components/badge"

<Badge variant="secondary">Badge</Badge>`,
    demos: [
      {
        id: "default",
        title: "Variants",
        code: `<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>`,
        Component: () => (
          <>
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="secondary">
              <StarIcon /> Starred
            </Badge>
          </>
        ),
      },
    ],
  },
  {
    name: "kbd",
    title: "Kbd",
    description: "Displays a keyboard key or a chord of them.",
    category: "Data display",
    usage: `import { Kbd, KbdGroup } from "@/design-system/components/kbd"

<KbdGroup><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<KbdGroup><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup>
<KbdGroup><Kbd>Ctrl</Kbd><Kbd>Shift</Kbd><Kbd>P</Kbd></KbdGroup>`,
        Component: () => (
          <>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>Shift</Kbd>
              <Kbd>P</Kbd>
            </KbdGroup>
          </>
        ),
      },
    ],
  },
  {
    name: "skeleton",
    title: "Skeleton",
    description: "Shows a placeholder while content is loading.",
    category: "Feedback",
    usage: `import { Skeleton } from "@/design-system/components/skeleton"

<Skeleton className="h-4 w-[250px]" />`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<div className="flex items-center gap-4">
  <Skeleton className="size-12 rounded-full" />
  <div className="grid gap-2">
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </div>
</div>`,
        Component: () => (
          <div className="flex items-center gap-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="grid gap-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ),
      },
    ],
  },
  {
    name: "spinner",
    title: "Spinner",
    description: "An indeterminate loading indicator.",
    category: "Feedback",
    usage: `import { Spinner } from "@/design-system/components/spinner"

<Spinner />`,
    demos: [
      {
        id: "default",
        title: "Sizes",
        code: `<Spinner />
<Spinner className="size-6" />
<Button disabled><Spinner /> Loading</Button>`,
        Component: () => (
          <>
            <Spinner />
            <Spinner className="size-6" />
            <Spinner className="size-8 text-muted-foreground" />
            <Button disabled>
              <Spinner /> Loading
            </Button>
          </>
        ),
      },
    ],
  },
  {
    name: "progress",
    title: "Progress",
    description: "Displays an indicator showing completion progress of a task.",
    category: "Feedback",
    usage: `import { Progress } from "@/design-system/components/progress"

<Progress value={62} />`,
    demos: [
      {
        id: "default",
        title: "Animated",
        description: "The value updates on mount, so the fill transitions.",
        code: `const [value, setValue] = React.useState(13)
React.useEffect(() => {
  const timer = setTimeout(() => setValue(66), 500)
  return () => clearTimeout(timer)
}, [])

<Progress value={value} className="w-[60%]" />`,
        Component: () => <ProgressDemo />,
      },
    ],
  },
  {
    name: "chart",
    title: "Chart",
    description: "Recharts wrappers that inherit the design system's tokens, tooltip, and legend.",
    category: "Data display",
    usage: `import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/components/chart"

<ChartContainer config={config}><BarChart data={data}>…</BarChart></ChartContainer>`,
    demos: [
      {
        id: "bar",
        title: "Bar chart",
        description: "Hover a column to see the shared tooltip.",
        code: `const chartConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig

<ChartContainer config={chartConfig} className="h-[240px] w-full">
  <BarChart data={chartData}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="month" tickLine={false} axisLine={false} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend content={<ChartLegendContent />} />
    <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
    <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
  </BarChart>
</ChartContainer>`,
        Component: () => <BarChartDemo />,
      },
      {
        id: "area",
        title: "Area chart",
        code: `<ChartContainer config={chartConfig} className="h-[240px] w-full">
  <AreaChart data={chartData}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="month" tickLine={false} axisLine={false} />
    <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
    <Area dataKey="desktop" type="natural" fill="var(--color-desktop)" stroke="var(--color-desktop)" />
  </AreaChart>
</ChartContainer>`,
        Component: () => <AreaChartDemo />,
      },
    ],
  },
  {
    name: "sidebar",
    title: "Sidebar",
    description: "A composable, collapsible application sidebar.",
    category: "Navigation",
    usage: `import { Sidebar, SidebarProvider, SidebarTrigger } from "@/design-system/components/sidebar"

<SidebarProvider><Sidebar>…</Sidebar><SidebarInset>…</SidebarInset></SidebarProvider>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Use the trigger to collapse the rail.",
        code: `<SidebarProvider>
  <Sidebar collapsible="icon">
    <SidebarHeader>Minder Ops</SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive><InboxIcon /> Inbox</SidebarMenuButton>
              <SidebarMenuBadge>12</SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
  <SidebarInset><SidebarTrigger /></SidebarInset>
</SidebarProvider>`,
        Component: () => <SidebarDemo />,
      },
    ],
  },
];

function ProgressDemo() {
  const [value, setValue] = React.useState(13);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setValue(66), 500);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="grid w-full max-w-sm gap-3">
      <Progress value={value} />
      <Progress value={100} />
    </div>
  );
}

const chartData = [
  { month: "March", desktop: 186, mobile: 80 },
  { month: "April", desktop: 305, mobile: 200 },
  { month: "May", desktop: 237, mobile: 120 },
  { month: "June", desktop: 173, mobile: 190 },
  { month: "July", desktop: 209, mobile: 130 },
  { month: "August", desktop: 264, mobile: 140 },
];

const chartConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig;

function BarChartDemo() {
  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full max-w-lg">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value: string) => value.slice(0, 3)} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
        <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

function AreaChartDemo() {
  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full max-w-lg">
      <AreaChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value: string) => value.slice(0, 3)} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Area dataKey="mobile" type="natural" fill="var(--color-mobile)" fillOpacity={0.4} stroke="var(--color-mobile)" stackId="a" />
        <Area dataKey="desktop" type="natural" fill="var(--color-desktop)" fillOpacity={0.4} stroke="var(--color-desktop)" stackId="a" />
      </AreaChart>
    </ChartContainer>
  );
}

function SidebarDemo() {
  const items = [
    { title: "Inbox", icon: InboxIcon, badge: "12" },
    { title: "Search", icon: SearchIcon },
    { title: "Projects", icon: FolderIcon, badge: "4" },
    { title: "Settings", icon: SettingsIcon },
  ];
  return (
    <div className={`${demoStyles.sidebarDemo} w-full max-w-2xl rounded-lg border`}>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-3 py-3 text-sm font-semibold">Minder Ops</SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item, index) => (
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
          <div className="p-4">
            <Textarea placeholder="Write a note…" className="max-w-sm" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
