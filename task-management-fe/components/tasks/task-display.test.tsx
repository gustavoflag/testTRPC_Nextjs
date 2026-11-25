import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTask } from "@/test/fixtures";
import { TaskListItem } from "./task-list-item";
import { TaskListView } from "./task-list-view";
import { TaskListSkeleton, TaskSkeleton } from "./skeletons";

const noop = async () => undefined;

describe("TaskListItem", () => {
  it("links to the task and shows its details", () => {
    const task = makeTask();
    render(<TaskListItem task={task} deleteAction={noop} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `/tasks/${task.id}`);
    expect(screen.getByText(task.title)).toBeInTheDocument();
    expect(screen.getByText(task.description!)).toBeInTheDocument();
  });

  it("omits an empty description", () => {
    render(<TaskListItem task={makeTask({ description: undefined })} deleteAction={noop} />);
    expect(screen.queryByText("Cover every component")).not.toBeInTheDocument();
  });

  it("has a delete button outside the link", () => {
    render(<TaskListItem task={makeTask()} deleteAction={noop} />);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(screen.getByRole("link")).not.toContainElement(button);
  });
});

describe("TaskListView", () => {
  it("shows an empty state", () => {
    render(<TaskListView tasks={[]} deleteAction={vi.fn()} />);
    expect(screen.getByText(/No tasks yet/)).toBeInTheDocument();
  });

  it("lists every task", () => {
    render(
      <TaskListView tasks={[makeTask({ id: "a", title: "A" }), makeTask({ id: "b", title: "B" })]} deleteAction={vi.fn()} />
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("deletes the task whose button was confirmed", async () => {
    const deleteAction = vi.fn<(id: string) => Promise<void>>(async () => undefined);
    render(
      <TaskListView tasks={[makeTask({ id: "a", title: "A" }), makeTask({ id: "b", title: "B" })]} deleteAction={deleteAction} />
    );
    const second = within(screen.getAllByRole("listitem")[1]);

    await userEvent.click(second.getByRole("button", { name: "Delete" }));
    await userEvent.click(second.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(deleteAction).toHaveBeenCalledWith("b"));
    expect(deleteAction).toHaveBeenCalledOnce();
  });
});

describe("skeletons", () => {
  it("mark themselves as loading", () => {
    render(
      <>
        <TaskListSkeleton />
        <TaskSkeleton />
      </>
    );
    expect(screen.getByLabelText("Loading tasks")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Loading task")).toHaveAttribute("aria-busy", "true");
  });
});
