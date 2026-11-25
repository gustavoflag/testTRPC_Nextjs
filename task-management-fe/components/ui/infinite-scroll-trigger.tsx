"use client";

import { useEffect, useEffectEvent, useRef } from "react";

type InfiniteScrollTriggerProps = {
  onVisible: () => void;
  /** Start loading this far before the trigger scrolls into view. */
  rootMargin?: string;
};

/**
 * Invisible marker placed after a list: calls `onVisible` when it scrolls into view.
 * Give it a `key` that changes after each load (e.g. the item count). Re-observing then fires again if the
 * marker is still visible, which happens when a page doesn't fill the screen.
 */
export function InfiniteScrollTrigger({ onVisible, rootMargin = "200px" }: InfiniteScrollTriggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const handleVisible = useEffectEvent(onVisible);

  useEffect(() => {
    const element = ref.current!; // always set: the div below is rendered unconditionally
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) handleVisible();
      },
      { rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return <div ref={ref} aria-hidden="true" data-infinite-scroll-trigger="" className="h-px" />;
}
