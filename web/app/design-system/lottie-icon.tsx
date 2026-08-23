"use client";

import * as React from "react";
import lottie from "lottie-web/build/player/lottie_light";

/** Just the fields this component needs; the rest of the document is passed through. */
export type LottieData = { w: number; h: number; [key: string]: unknown };

/**
 * Plays a Lottie document at icon scale.
 *
 * The `lottie_light` build rather than the full one: it drops the expressions
 * evaluator, which is a third of the payload, and neither of the vendored
 * animations uses an expression — every `x` in them is keyframe easing, which
 * is a number, not the string an expression would be.
 *
 * The box is sized from the animation's own aspect ratio rather than forced
 * square, so a 904×668 document is not letterboxed into an icon slot. The
 * renderer's SVG then gets inline sizing, which also settles a collision with
 * Empty's `[&_svg:not([class*='size-'])]:size-6` rule — that would otherwise
 * clamp the animation back to a square and squash it.
 */
export function LottieIcon({
  data,
  size = 24,
  loop = true,
  className,
}: {
  data: LottieData;
  /** Rendered height in px; width follows the animation's aspect ratio. */
  size?: number;
  loop?: boolean;
  className?: string;
}) {
  const host = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = host.current;
    if (!container) return;

    // Decoration, so reduced motion gets the first frame and no playback.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const animation = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop,
      autoplay: !still,
      animationData: data,
    });
    if (still) animation.goToAndStop(0, true);

    const svg = container.querySelector("svg");
    if (svg) {
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
    }

    return () => animation.destroy();
  }, [data, loop]);

  return (
    <div
      ref={host}
      aria-hidden
      className={className}
      style={{ width: Math.round((data.w / data.h) * size), height: size }}
    />
  );
}
