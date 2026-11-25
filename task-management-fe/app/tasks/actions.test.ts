import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavigationSignal, makeTask, trpcError } from "@/test/fixtures";
import { initialTaskFormState } from "./form-state";

const m = vi.hoisted(() => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  listTasks: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("@/lib/trpc", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/trpc")>()),
  trpc: {
    task: {
      createTask: { mutate: m.createTask },
      updateTask: { mutate: m.updateTask },
      deleteTask: { mutate: m.deleteTask },
      listTasks: { query: m.listTasks },
    },
  },
}));

import { createTaskAction, deleteTaskAction, loadMoreTasksAction, updateTaskAction } from "./actions";

const form = (title: string, description = "") => {
  const data = new FormData();
  data.set("title", title);
  data.set("description", description);
  return data;
};

const ID = makeTask().id;

describe("task server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.redirect.mockImplementation(() => {
      throw new NavigationSignal();
    });
  });

  it("createTaskAction creates and redirects to the list with a toast", async () => {
    m.createTask.mockResolvedValue(makeTask());
    await expect(createTaskAction(initialTaskFormState, form("A"))).rejects.toBeInstanceOf(NavigationSignal);
    expect(m.createTask).toHaveBeenCalledWith({ title: "A", description: undefined });
    expect(m.revalidatePath).toHaveBeenCalledWith("/");
    expect(m.redirect).toHaveBeenCalledWith("/?toast=created");
  });

  it("createTaskAction sends a non-empty description", async () => {
    m.createTask.mockResolvedValue(makeTask());
    await createTaskAction(initialTaskFormState, form("A", "details")).catch(() => undefined);
    expect(m.createTask).toHaveBeenCalledWith({ title: "A", description: "details" });
  });

  it("createTaskAction rejects a blank title without calling the API", async () => {
    const state = await createTaskAction(initialTaskFormState, form("   ", "kept"));
    expect(state).toEqual({
      error: null,
      fieldErrors: { title: "Title is required." },
      values: { title: "", description: "kept" },
    });
    expect(m.createTask).not.toHaveBeenCalled();
    expect(m.redirect).not.toHaveBeenCalled();
  });

  it("createTaskAction returns a form error when the server rejects the values", async () => {
    m.createTask.mockRejectedValue(trpcError("BAD_REQUEST"));
    const state = await createTaskAction(initialTaskFormState, form("A"));
    expect(state.error).toMatch(/check the fields/);
    expect(state.values).toEqual({ title: "A", description: "" });
  });

  it("updateTaskAction updates, revalidates and redirects to the list with a toast", async () => {
    m.updateTask.mockResolvedValue(makeTask());
    await expect(updateTaskAction(ID, initialTaskFormState, form("B"))).rejects.toBeInstanceOf(NavigationSignal);
    expect(m.updateTask).toHaveBeenCalledWith({ id: ID, title: "B", description: "" });
    expect(m.revalidatePath).toHaveBeenCalledWith(`/tasks/${ID}`);
    expect(m.redirect).toHaveBeenCalledWith("/?toast=updated");
  });

  it("updateTaskAction rejects a blank title without calling the API", async () => {
    const state = await updateTaskAction(ID, initialTaskFormState, form(""));
    expect(state.fieldErrors).toEqual({ title: "Title is required." });
    expect(m.updateTask).not.toHaveBeenCalled();
  });

  it("updateTaskAction returns a form error when the task is gone", async () => {
    m.updateTask.mockRejectedValue(trpcError("NOT_FOUND"));
    const state = await updateTaskAction(ID, initialTaskFormState, form("B"));
    expect(state.error).toMatch(/no longer exists/);
  });

  it("deleteTaskAction deletes and redirects home", async () => {
    m.deleteTask.mockResolvedValue(makeTask());
    await expect(deleteTaskAction(ID)).rejects.toBeInstanceOf(NavigationSignal);
    expect(m.deleteTask).toHaveBeenCalledWith({ id: ID });
    expect(m.redirect).toHaveBeenCalledWith("/?toast=deleted");
  });

  it("deleteTaskAction treats an already-deleted task as success", async () => {
    m.deleteTask.mockRejectedValue(trpcError("NOT_FOUND"));
    await expect(deleteTaskAction(ID)).rejects.toBeInstanceOf(NavigationSignal);
    expect(m.redirect).toHaveBeenCalledWith("/?toast=deleted");
  });

  it("deleteTaskAction rethrows other errors", async () => {
    const error = new Error("down");
    m.deleteTask.mockRejectedValue(error);
    await expect(deleteTaskAction(ID)).rejects.toBe(error);
    expect(m.redirect).not.toHaveBeenCalled();
  });

  it("loadMoreTasksAction fetches the page after the cursor", async () => {
    const page = { items: [makeTask()], nextCursor: null };
    m.listTasks.mockResolvedValue(page);
    await expect(loadMoreTasksAction("20")).resolves.toEqual(page);
    expect(m.listTasks).toHaveBeenCalledWith({ cursor: "20" });
  });
});
