import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavigationSignal, makeTask } from "@/test/fixtures";

const m = vi.hoisted(() => ({
  getFirstTaskPage: vi.fn(),
  getTask: vi.fn(),
  notFound: vi.fn(),
  deleteTaskAction: vi.fn(),
  updateTaskAction: vi.fn(),
  loadMoreTasksAction: vi.fn(),
}));

vi.mock("@/lib/tasks", () => ({ getFirstTaskPage: m.getFirstTaskPage, getTask: m.getTask }));
vi.mock("next/navigation", () => ({ notFound: m.notFound }));
vi.mock("@/app/tasks/actions", () => ({
  deleteTaskAction: m.deleteTaskAction,
  updateTaskAction: m.updateTaskAction,
  loadMoreTasksAction: m.loadMoreTasksAction,
}));

import { EditTask } from "./edit-task";
import { TaskList } from "./task-list";

const task = makeTask();
const params = Promise.resolve({ id: task.id });

/* Async server components: await the element, then render it. */
describe("data-fetching task components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.notFound.mockImplementation(() => {
      throw new NavigationSignal();
    });
  });

  it("TaskList loads more pages through the server action", async () => {
    m.getFirstTaskPage.mockResolvedValue({ items: [task], nextCursor: "20" });
    m.loadMoreTasksAction.mockResolvedValue({ items: [makeTask({ id: "next", title: "Next" })], nextCursor: null });
    render(await TaskList());

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Next")).toBeInTheDocument();
    expect(m.loadMoreTasksAction).toHaveBeenCalledWith("20");
  });

  it("TaskList renders the fetched tasks with delete wired to each id", async () => {
    m.getFirstTaskPage.mockResolvedValue({ items: [task], nextCursor: null });
    m.deleteTaskAction.mockResolvedValue(undefined);
    render(await TaskList());
    expect(screen.getByText(task.title)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(m.deleteTaskAction).toHaveBeenCalledWith(task.id));
  });

  it("EditTask prefills the form, shows the date and links back to the list", async () => {
    m.getTask.mockResolvedValue(task);
    render(await EditTask({ params }));

    expect(m.getTask).toHaveBeenCalledWith(task.id);
    expect(screen.getByLabelText(/Title/)).toHaveValue(task.title);
    expect(screen.getByText(/Nov 25, 2026/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/");
  });

  it("EditTask binds the update to the task id", async () => {
    m.getTask.mockResolvedValue(task);
    m.updateTaskAction.mockResolvedValue({ error: null });
    render(await EditTask({ params }));

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(m.updateTaskAction).toHaveBeenCalledWith(task.id, { error: null }, expect.any(FormData)));
  });

  it("EditTask binds the delete to the task id", async () => {
    m.getTask.mockResolvedValue(task);
    m.deleteTaskAction.mockResolvedValue(undefined);
    render(await EditTask({ params }));

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(m.deleteTaskAction).toHaveBeenCalledWith(task.id));
  });

  it("EditTask calls notFound for a missing task", async () => {
    m.getTask.mockResolvedValue(null);
    await expect(EditTask({ params })).rejects.toBeInstanceOf(NavigationSignal);
    expect(m.notFound).toHaveBeenCalled();
  });
});
