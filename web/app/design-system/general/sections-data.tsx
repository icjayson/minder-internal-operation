"use client";

import * as React from "react";
import { CloudIcon, FolderIcon, TrendingUpIcon } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/design-system/components/accordion";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/design-system/components/avatar";
import { Badge } from "@/design-system/components/badge";
import { Button } from "@/design-system/components/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/design-system/components/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/design-system/components/carousel";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/design-system/components/item";
import { Marker, MarkerContent, MarkerIcon } from "@/design-system/components/marker";
import { Separator } from "@/design-system/components/separator";
import { Spinner } from "@/design-system/components/spinner";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/design-system/components/table";

import { Spec, SpecGrid, generalStyles as styles } from "./shell";

export function DataSection() {
  return (
    <SpecGrid>
      <Spec label="Card" source="components/card">
        <Card>
          <CardHeader>
            <CardTitle>Deploy the kit</CardTitle>
            <CardDescription>Roll it out to a new customer.</CardDescription>
            <CardAction>
              <Badge variant="secondary">New</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Eight steps, tracked end to end.
          </CardContent>
          <CardFooter className="gap-2">
            <Button className="flex-1">Deploy</Button>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </Spec>

      <Spec label="Stat / KPI card" source="composed · card + badge">
        <div className={styles.kpiRow}>
          {[
            ["Total visitors", "84,392", "+12.8%"],
            ["Active workspaces", "1,284", "+8.4%"],
          ].map(([label, value, delta]) => (
            <Card key={label}>
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-2xl">{value}</CardTitle>
                <CardAction>
                  <Badge variant="secondary">
                    <TrendingUpIcon /> {delta}
                  </Badge>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Spec>

      <Spec label="Table / Data grid" source="components/table" wide>
        <Table>
          <TableCaption>Recent kit deployments.</TableCaption>
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
      </Spec>

      <Spec label="List" source="components/item">
        <ItemGroup>
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
              <ItemTitle>Kit sync</ItemTitle>
              <ItemDescription>Running · 3 of 8 steps</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Spinner />
            </ItemActions>
          </Item>
        </ItemGroup>
      </Spec>

      <Spec label="Avatar" source="components/avatar">
        <div className={styles.row}>
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
        </div>
      </Spec>

      <Spec label="Accordion / Collapse" source="components/accordion">
        <Accordion type="single" collapsible defaultValue="a1">
          <AccordionItem value="a1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>Yes. It follows the WAI-ARIA disclosure pattern.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="a2">
            <AccordionTrigger>Is the source local?</AccordionTrigger>
            <AccordionContent>Yes — design-system/components/accordion.tsx.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Spec>

      <Spec label="Timeline" source="composed · marker">
        <div className={styles.timeline}>
          {[
            ["Kit generated", "09:12"],
            ["Environment provisioned", "09:24"],
            ["Data migrated", "09:51"],
            ["Live", "10:04"],
          ].map(([label, time]) => (
            <Marker key={label} variant="border">
              <MarkerIcon>●</MarkerIcon>
              <MarkerContent>
                {label} <span className={styles.timelineTime}>{time}</span>
              </MarkerContent>
            </Marker>
          ))}
        </div>
      </Spec>

      <Spec label="Carousel" source="components/carousel">
        <Carousel className={styles.carouselFrame}>
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
      </Spec>

      <Spec label="Divider" source="components/separator">
        <div className={styles.stack}>
          <div className="text-sm font-medium">Minder Ops</div>
          <p className="text-sm text-muted-foreground">An internal operations console.</p>
          <Separator className="my-2" />
          <div className="flex h-5 items-center gap-4 text-sm">
            <span>Blog</span>
            <Separator orientation="vertical" />
            <span>Docs</span>
            <Separator orientation="vertical" />
            <span>Source</span>
          </div>
        </div>
      </Spec>
    </SpecGrid>
  );
}
