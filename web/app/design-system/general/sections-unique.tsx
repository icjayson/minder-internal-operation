"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/design-system/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/components/empty";
import { Skeleton } from "@/design-system/components/skeleton";

import sweep from "../ambient-sweep.module.css";
import { LottieIcon } from "../lottie-icon";
import emptyStateLottie from "./lottie/empty-state.json";
import loadingStateLottie from "./lottie/loading-state.json";
import { Group, Spec, SpecGrid, generalStyles as styles } from "./shell";

const TABS = ["General", "Dashboard", "AI chat", "Library"];

/**
 * A facsimile of the real nav, so the trace is judged on the chrome it runs on.
 *
 * The knobs land here rather than on the layer inside: .stage resolves
 * --sweep-color from --sweep-intensity on this element, so a value set on a
 * child arrives after the colour has already been computed and does nothing.
 */
function MiniNav({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={`${styles.miniNav} ${sweep.stage}`} style={style}>
      {children}
      <span className={styles.miniBrand}>
        <span className={styles.miniLogo} aria-hidden />
        Minder
      </span>
      <span className={styles.miniTabs}>
        {TABS.map((tab, index) => (
          <span key={tab} className={index === 0 ? styles.miniTabActive : styles.miniTab}>
            {tab}
          </span>
        ))}
      </span>
      <span className={styles.miniAction}>Get global.css</span>
    </div>
  );
}

/**
 * Section 02 — the parts of this system that are ours rather than the
 * registry's. Everything else on the page documents shadcn as it ships; these
 * are the pieces that would not survive a re-vendor, so they are collected in
 * one place instead of being scattered through the sections they belong to.
 */
export function UniqueSection() {
  /* Remounting restarts the animation from 0%, which is the only way to see a
     pass without waiting out the 18s cycle. */
  const [runId, setRunId] = React.useState(0);

  return (
    <>
      <Group title="Nav bar · outline trace" hint="--sweep-intensity 1.00 · --sweep-cycle 18s">
        <SpecGrid columns={1}>
          <Spec label="A · Outline trace" source="composed · ambient-sweep">
            <MiniNav
              key={runId}
              style={{ "--sweep-intensity": 1, "--sweep-cycle": "18s" } as React.CSSProperties}
            >
              <span className={sweep.traceLayer}>
                <span className={sweep.traceBloom} />
                <span className={sweep.trace} />
              </span>
            </MiniNav>
            <div className={styles.row}>
              <Button variant="outline" size="sm" onClick={() => setRunId((v) => v + 1)}>
                Sweep now
              </Button>
              <span className={styles.themeHint}>One lap every 18s; ~3s to cross.</span>
            </div>
            <p className={styles.sweepNote}>
              The light rides the whole outline on a motion path, so it holds one speed the whole
              way round instead of tearing along the long edges the way a rotating gradient would.
              Drops onto <code>.systemNav</code> unchanged — <code>--sweep-radius</code> defaults to
              0, which is the real bar&rsquo;s square corner.
            </p>
          </Spec>
        </SpecGrid>
      </Group>

      <Group title="Button · hover" hint="--primary-hover-* · --primary-hover-lift">
        <SpecGrid columns={2}>
          <Spec label="Primary" source="composed · globals.css">
            <div className={styles.row}>
              <Button>Save changes</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
            </div>
            <p className={styles.sweepNote}>
              Hover picks up a vertical gradient with a lit top edge and an outer glow. The gradient
              starts at <code>--primary</code> itself, so it can never drift from the resting state
              it grows out of. Geometry is untouched — only the surface changes.
            </p>
          </Spec>

          <Spec label="Secondary" source="composed · globals.css">
            <div className={styles.row}>
              <Button variant="secondary">Save changes</Button>
              <Button variant="secondary" size="sm">
                Small
              </Button>
              <Button variant="secondary" size="lg">
                Large
              </Button>
            </div>
            <p className={styles.sweepNote}>
              A solid tint rather than a gradient, so the two never compete. Both skies are one set
              of tokens; only the values swap.
            </p>
          </Spec>
        </SpecGrid>
      </Group>

      <Group title="Toast · tilted sweep" hint="--sweep-toast-tilt -30deg">
        <SpecGrid columns={1}>
          {/* No <Toaster /> here — the one in section 05 is position: fixed, so it
              is viewport-anchored and serves triggers from anywhere on the page.
              A second instance would render every toast twice. */}
          <Spec label="Toast / Notification" source="composed · sonner + ambient-sweep">
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
            <p className={styles.sweepNote}>
              A toast lives about four seconds, so the nav&rsquo;s 18s cycle would never be seen on
              one: the light runs once, just after it settles. Status toasts sweep in their own
              colour — a green toast lit with brand blue would read as two unrelated systems.
            </p>
          </Spec>
        </SpecGrid>
      </Group>

      <Group title="State surfaces" hint="lottie · vector, no raster assets">
        <SpecGrid columns={2}>
          {/* The pair the animated icons were made for. Shown whole rather than
              as icons on their own, because the thing worth documenting is how
              the animation sits inside the surface — the same composition, once
              before the answer is known and once after it comes back empty. */}
          <Spec label="Loading state" source="composed · empty + lottie + skeleton" tall>
            <Empty className={styles.emptyFrame}>
              <EmptyHeader>
                {/* Rendered larger than the empty icon on purpose. The loading
                    document inks only 75%x54% of its own 128x128 canvas against
                    the empty one's 92%x64%, so at a matching 72px its artwork
                    came out 39px tall against 46px — visibly smaller inside the
                    same frame. 86px cancels that and lands them level. */}
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

          <Spec label="Empty state" source="composed · empty + lottie" tall>
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
        </SpecGrid>
      </Group>
    </>
  );
}
