"use client";

import * as React from "react";
import { AlertCircleIcon, CheckCircle2Icon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/design-system/components/alert";
import { Badge } from "@/design-system/components/badge";
import { Button } from "@/design-system/components/button";
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/design-system/components/empty";
import { Input } from "@/design-system/components/input";
import { Label } from "@/design-system/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/components/popover";
import { Progress } from "@/design-system/components/progress";
import { Skeleton } from "@/design-system/components/skeleton";
import { Toaster } from "@/design-system/components/sonner";
import { Spinner } from "@/design-system/components/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/design-system/components/tooltip";

import sweep from "../ambient-sweep.module.css";
import { LottieIcon } from "../lottie-icon";
import emptyStateLottie from "./lottie/empty-state.json";
import loadingStateLottie from "./lottie/loading-state.json";
import { useDesignSystemTheme } from "../theme-context";
import { Spec, SpecGrid, generalStyles as styles } from "./shell";

function ProgressSpec() {
  const [value, setValue] = React.useState(13);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setValue(66), 500);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className={styles.stack}>
      <Progress value={value} />
      <Progress value={100} />
    </div>
  );
}

export function FeedbackSection() {
  /* Sonner reads its theme from next-themes, which this app does not use — so
     it falls back to "system" and paints its dark-theme text colours onto a
     light toast. Handing it the design system's own sky fixes that; the
     vendored component spreads props last, so this wins without touching it. */
  const { dark } = useDesignSystemTheme();

  return (
    <SpecGrid>
      <Spec label="Alert / Banner" source="components/alert" wide>
        <div className={styles.stack}>
          <Alert>
            <InfoIcon />
            <AlertTitle>Snapshot up to date</AlertTitle>
            <AlertDescription>All 61 components match the vendored source.</AlertDescription>
          </Alert>
          <Alert>
            <CheckCircle2Icon />
            <AlertTitle>Deployment finished</AlertTitle>
            <AlertDescription>Acme Corp is live on kit v1.4.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Deployment failed</AlertTitle>
            <AlertDescription>Step 4 of 8 timed out. Retry when ready.</AlertDescription>
          </Alert>
        </div>
      </Spec>

      <Spec label="Toast / Notification" source="components/sonner">
        <Toaster
          theme={dark ? "dark" : "light"}
          richColors
          toastOptions={{ className: sweep.toastSweep }}
        />
        <div className={styles.row}>
          <Button
            variant="outline"
            onClick={() =>
              toast("Deployment queued", {
                description: "Acme Corp · kit v1.4",
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
        </div>

      </Spec>

      <Spec label="Modal / Dialog" source="components/dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Set up workspace</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Set up your workspace</DialogTitle>
              <DialogDescription>Name the workspace and invite the first teammates.</DialogDescription>
            </DialogHeader>
            <div className={styles.stack}>
              <div className={styles.field}>
                <Label htmlFor="gs-modal-name">Workspace name</Label>
                <Input id="gs-modal-name" defaultValue="Acme workspace" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button>Continue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Spec>

      <Spec label="Popover" source="components/popover">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Dimensions</Button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <div className={styles.stack}>
              <p className="text-sm font-medium">Dimensions</p>
              <div className={styles.field}>
                <Label htmlFor="gs-pop-w">Width</Label>
                <Input id="gs-pop-w" defaultValue="100%" className="h-8" />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </Spec>

      <Spec label="Tooltip" source="components/tooltip">
        <TooltipProvider>
          <div className={styles.row}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>Add to library</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Info">
                  <InfoIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Shown on hover and focus</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </Spec>

      <Spec label="Progress bar" source="components/progress">
        <ProgressSpec />
      </Spec>

      <Spec label="Spinner / Loading" source="components/spinner">
        <div className={styles.row}>
          <Spinner />
          <Spinner className="size-6" />
          <Spinner className="size-8 text-muted-foreground" />
          <Button disabled>
            <Spinner /> Loading
          </Button>
        </div>
      </Spec>

      <Spec label="Skeleton loader" source="components/skeleton">
        <div className={styles.row}>
          <Skeleton className="size-12 rounded-full" />
          <div className={styles.stack}>
            <Skeleton className="h-4 w-[220px]" />
            <Skeleton className="h-4 w-[180px]" />
          </div>
        </div>
      </Spec>

      {/* The sibling of Empty state: the same surface, before the answer is
          known rather than after it comes back empty. Composed from Empty's
          own parts so the two read as one pair — there is no vendored
          loading-state primitive. `tall` matches Empty's two rows, otherwise
          the pair sits at different heights side by side. */}
      <Spec label="Loading state" source="composed · empty + lottie + skeleton" tall>
        <Empty className={styles.emptyFrame}>
          <EmptyHeader>
            {/* Rendered larger than the empty icon on purpose. The loading
                document inks only 75%x54% of its own 128x128 canvas against the
                empty one's 92%x64%, so at a matching 72px its artwork came out
                39px tall against 46px — visibly smaller inside the same frame.
                86px cancels that built-in padding and lands them level. */}
            <EmptyMedia variant="icon" className="size-30">
              <LottieIcon data={loadingStateLottie} size={86} />
            </EmptyMedia>
            <EmptyTitle>Loading deployments</EmptyTitle>
            <EmptyDescription>Fetching the latest rollout history.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className={styles.stack}>
              <Skeleton className="h-4 w-[220px]" />
              <Skeleton className="h-4 w-[160px]" />
            </div>
          </EmptyContent>
        </Empty>
      </Spec>

      <Spec label="Empty state" source="components/empty" tall>
        <Empty className={styles.emptyFrame}>
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-30">
              <LottieIcon data={emptyStateLottie} size={72} />
            </EmptyMedia>
            <EmptyTitle>No deployments yet</EmptyTitle>
            <EmptyDescription>Kick off the first rollout to see it here.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm">New deployment</Button>
          </EmptyContent>
        </Empty>
      </Spec>

      {/* Last in source, but `grid-auto-flow: dense` drops it into the free
          slot under Skeleton loader rather than trailing the two tall cards. */}
      <Spec label="Badge / Tag / Chip" source="components/badge">
        <div className={styles.row}>
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="secondary">
            <TriangleAlertIcon /> Needs review
          </Badge>
        </div>
      </Spec>
    </SpecGrid>
  );
}
