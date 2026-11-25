import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { FakeIntersectionObserver } from "@/test/intersection-observer";
import { InfiniteScrollTrigger } from "./infinite-scroll-trigger";

describe("InfiniteScrollTrigger", () => {
  it("calls onVisible when it scrolls into view", () => {
    const onVisible = vi.fn();
    render(<InfiniteScrollTrigger onVisible={onVisible} />);
    const observer = FakeIntersectionObserver.active()!;

    act(() => observer.trigger(false));
    expect(onVisible).not.toHaveBeenCalled();

    act(() => observer.trigger(true));
    expect(onVisible).toHaveBeenCalledOnce();
  });

  it("observes with a lead margin, configurable", () => {
    render(<InfiniteScrollTrigger onVisible={vi.fn()} rootMargin="50px" />);
    expect(FakeIntersectionObserver.active()!.rootMargin).toBe("50px");
  });

  it("defaults the lead margin to 200px", () => {
    render(<InfiniteScrollTrigger onVisible={vi.fn()} />);
    expect(FakeIntersectionObserver.active()!.rootMargin).toBe("200px");
  });

  it("uses the latest onVisible without re-observing", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<InfiniteScrollTrigger onVisible={first} />);
    rerender(<InfiniteScrollTrigger onVisible={second} />);

    expect(FakeIntersectionObserver.instances.filter((o) => !o.disconnected)).toHaveLength(1);
    act(() => FakeIntersectionObserver.active()!.trigger());
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });

  it("disconnects on unmount", () => {
    const { unmount } = render(<InfiniteScrollTrigger onVisible={vi.fn()} />);
    const observer = FakeIntersectionObserver.active()!;
    unmount();
    expect(observer.disconnected).toBe(true);
  });
});
