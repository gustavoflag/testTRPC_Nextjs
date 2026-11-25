"use client";

import { useRef, useState } from "react";
import type { Task, TaskPage } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { InfiniteScrollTrigger } from "@/components/ui/infinite-scroll-trigger";
import { TaskListView } from "./task-list-view";

type InfiniteTaskListProps = {
  /** First page, rendered on the server. */
  initialPage: TaskPage;
  loadMoreAction: (cursor: string) => Promise<TaskPage>;
  deleteAction: (id: string) => Promise<void>;
};

/**
 * Task list that appends pages as the user scrolls.
 * A new `initialPage` from the server (after a create, update or delete) restarts the list from page 1, so
 * previously appended pages never show stale data. Remounting also drops any in-flight load.
 */
export function InfiniteTaskList(props: InfiniteTaskListProps) {
  const [current, setCurrent] = useState({ page: props.initialPage, instance: 0 });
  if (props.initialPage !== current.page) {
    setCurrent({ page: props.initialPage, instance: current.instance + 1 });
  }
  return <InfiniteTaskListBody key={current.instance} {...props} />;
}

type LoadStatus = "idle" | "loading" | "error";

function InfiniteTaskListBody({ initialPage, loadMoreAction, deleteAction }: InfiniteTaskListProps) {
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const inFlight = useRef(false); // guards against the trigger and the button firing together

  const loadMore = async () => {
    if (!nextCursor || inFlight.current) return;
    inFlight.current = true;
    setStatus("loading");
    try {
      const page = await loadMoreAction(nextCursor);
      setItems((prev) => appendNew(prev, page.items));
      setNextCursor(page.nextCursor);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <>
      <TaskListView tasks={items} deleteAction={deleteAction} />
      <ListFooter
        status={status}
        hasMore={nextCursor !== null}
        isEmpty={items.length === 0}
        itemCount={items.length}
        onLoadMore={loadMore}
      />
    </>
  );
}

const appendNew = (existing: Task[], incoming: Task[]): Task[] => {
  const seen = new Set(existing.map((t) => t.id));
  return [...existing, ...incoming.filter((t) => !seen.has(t.id))];
};

type ListFooterProps = {
  status: LoadStatus;
  hasMore: boolean;
  isEmpty: boolean;
  itemCount: number;
  onLoadMore: () => void;
};

function ListFooter({ status, hasMore, isEmpty, itemCount, onLoadMore }: ListFooterProps) {
  if (status === "error") {
    return (
      <div role="alert" className="flex items-center justify-center gap-3 text-sm text-red-600">
        Couldn&apos;t load more tasks.
        <Button variant="secondary" onClick={onLoadMore}>
          Retry
        </Button>
      </div>
    );
  }
  if (hasMore) {
    return (
      <div className="flex flex-col items-center">
        {status === "idle" && <InfiniteScrollTrigger key={itemCount} onVisible={onLoadMore} />}
        {/* Keyboard and screen-reader fallback for scrolling. */}
        <Button variant="secondary" onClick={onLoadMore} disabled={status === "loading"}>
          {status === "loading" ? "Loading…" : "Load more"}
        </Button>
      </div>
    );
  }
  return isEmpty ? null : <p className="text-center text-sm text-zinc-500">You&apos;ve reached the end of the list.</p>;
}
