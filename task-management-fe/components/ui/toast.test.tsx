import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({ search: "", pathname: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { Toast } from "./toast";
import { Toaster } from "./toaster";

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("announces the message and dismisses itself", () => {
    const onDismiss = vi.fn();
    render(<Toast message="Saved" onDismiss={onDismiss} duration={1000} />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");

    act(() => vi.advanceTimersByTime(999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("can be dismissed by hand", () => {
    const onDismiss = vi.fn();
    render(<Toast message="Saved" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe("Toaster", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window.history, "replaceState").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows the toast from the URL, then strips the param", () => {
    nav.search = "toast=created";
    render(<Toaster />);
    expect(screen.getByRole("status")).toHaveTextContent("Task Created");
    expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "/");

    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the same toast again after the param was stripped", () => {
    nav.search = "toast=created";
    const { rerender } = render(<Toaster />);
    act(() => vi.advanceTimersByTime(3000));

    nav.search = "";
    rerender(<Toaster />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    nav.search = "toast=created";
    rerender(<Toaster />);
    expect(screen.getByRole("status")).toHaveTextContent("Task Created");
  });

  it("replaces the current toast when a new one arrives", () => {
    nav.search = "toast=created";
    const { rerender } = render(<Toaster />);
    nav.search = "toast=deleted";
    rerender(<Toaster />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Task Deleted");
  });

  it("keeps other query params", () => {
    nav.search = "page=2&toast=deleted";
    render(<Toaster />);
    expect(screen.getByRole("status")).toHaveTextContent("Task Deleted");
    expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "/?page=2");
  });

  it.each(["", "toast=bogus"])("renders nothing for %j", (search) => {
    nav.search = search;
    render(<Toaster />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});
