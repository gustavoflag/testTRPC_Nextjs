import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TaskPage } from "@/lib/tasks";
import { makeTask } from "@/test/fixtures";
import { FakeIntersectionObserver } from "@/test/intersection-observer";
import { InfiniteTaskList } from "./infinite-task-list";

const task = (n: number) => makeTask({ id: `id-${n}`, title: `Task ${n}` });
const page = (from: number, to: number, nextCursor: string | null): TaskPage => ({
  items: Array.from({ length: to - from + 1 }, (_, i) => task(from + i)),
  nextCursor,
});

type LoadMore = (cursor: string) => Promise<TaskPage>;
const titles = () => screen.getAllByRole("listitem").map((li) => li.querySelector("a span")?.textContent);
const scrollToBottom = () => act(() => FakeIntersectionObserver.active()!.trigger());

const renderList = (initialPage: TaskPage, loadMoreAction: LoadMore = vi.fn<LoadMore>()) =>
  render(<InfiniteTaskList initialPage={initialPage} loadMoreAction={loadMoreAction} deleteAction={vi.fn()} />);

describe("InfiniteTaskList", () => {
  it("renders the server-rendered first page", () => {
    renderList(page(1, 2, "c1"));
    expect(titles()).toEqual(["Task 1", "Task 2"]);
    expect(screen.getByRole("button", { name: "Load more" })).toBeEnabled();
  });

  it("appends the next page when the bottom scrolls into view", async () => {
    const loadMore = vi.fn<LoadMore>().mockResolvedValue(page(3, 4, null));
    renderList(page(1, 2, "c1"), loadMore);

    scrollToBottom();

    await waitFor(() => expect(titles()).toEqual(["Task 1", "Task 2", "Task 3", "Task 4"]));
    expect(loadMore).toHaveBeenCalledWith("c1");
    expect(screen.getByText(/reached the end/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("follows cursors across several pages", async () => {
    const loadMore = vi
      .fn<LoadMore>()
      .mockResolvedValueOnce(page(2, 2, "c2"))
      .mockResolvedValueOnce(page(3, 3, null));
    renderList(page(1, 1, "c1"), loadMore);

    scrollToBottom();
    await waitFor(() => expect(titles()).toHaveLength(2));
    scrollToBottom(); // a fresh trigger observes after each load
    await waitFor(() => expect(titles()).toHaveLength(3));

    expect(loadMore.mock.calls).toEqual([["c1"], ["c2"]]);
  });

  it("loads with the button too, showing progress and ignoring repeat triggers", async () => {
    let resolve: (p: TaskPage) => void = () => undefined;
    const loadMore = vi.fn<LoadMore>(() => new Promise((r) => (resolve = r)));
    renderList(page(1, 1, "c1"), loadMore);

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
    expect(FakeIntersectionObserver.active()).toBeUndefined(); // trigger removed while loading

    await act(async () => resolve(page(2, 2, null)));
    expect(loadMore).toHaveBeenCalledOnce();
    expect(titles()).toEqual(["Task 1", "Task 2"]);
  });

  it("ignores a second trigger while a load is in flight", async () => {
    let resolve: (p: TaskPage) => void = () => undefined;
    const loadMore = vi.fn<LoadMore>(() => new Promise((r) => (resolve = r)));
    renderList(page(1, 1, "c1"), loadMore);
    const observer = FakeIntersectionObserver.active()!;

    act(() => {
      observer.trigger();
      observer.trigger();
    });

    expect(loadMore).toHaveBeenCalledOnce();
    await act(async () => resolve(page(2, 2, null)));
  });

  it("skips tasks it already shows", async () => {
    const loadMore = vi.fn<LoadMore>().mockResolvedValue(page(2, 3, null));
    renderList(page(1, 2, "c1"), loadMore);

    scrollToBottom();

    await waitFor(() => expect(titles()).toEqual(["Task 1", "Task 2", "Task 3"]));
  });

  it("shows an error with retry when a page fails to load", async () => {
    const loadMore = vi.fn<LoadMore>().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(page(2, 2, null));
    renderList(page(1, 1, "c1"), loadMore);

    scrollToBottom();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load more tasks.");
    expect(FakeIntersectionObserver.active()).toBeUndefined(); // no automatic retry loop

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(titles()).toEqual(["Task 1", "Task 2"]));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("restarts from the new first page when the server sends one", async () => {
    const loadMore = vi.fn<LoadMore>().mockResolvedValue(page(3, 4, "c3"));
    const props = { loadMoreAction: loadMore, deleteAction: vi.fn() };
    const { rerender } = render(<InfiniteTaskList initialPage={page(1, 2, "c1")} {...props} />);

    scrollToBottom();
    await waitFor(() => expect(titles()).toHaveLength(4));

    rerender(<InfiniteTaskList initialPage={page(10, 11, "c10")} {...props} />);
    expect(titles()).toEqual(["Task 10", "Task 11"]);
  });

  it("keeps appended pages when re-rendered with the same first page", async () => {
    const first = page(1, 1, "c1");
    const loadMore = vi.fn<LoadMore>().mockResolvedValue(page(2, 2, null));
    const props = { loadMoreAction: loadMore, deleteAction: vi.fn() };
    const { rerender } = render(<InfiniteTaskList initialPage={first} {...props} />);

    scrollToBottom();
    await waitFor(() => expect(titles()).toHaveLength(2));

    rerender(<InfiniteTaskList initialPage={first} {...props} />);
    expect(titles()).toHaveLength(2);
  });

  it("shows only the empty state when there are no tasks", () => {
    renderList({ items: [], nextCursor: null });
    expect(screen.getByText(/No tasks yet/)).toBeInTheDocument();
    expect(screen.queryByText(/reached the end/)).not.toBeInTheDocument();
  });

  it("wires delete to each task id", async () => {
    const deleteAction = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined);
    render(<InfiniteTaskList initialPage={page(1, 1, null)} loadMoreAction={vi.fn()} deleteAction={deleteAction} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(deleteAction).toHaveBeenCalledWith("id-1"));
  });
});
