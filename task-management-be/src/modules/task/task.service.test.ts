import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../lib/errors";
import { createTaskRepository } from "./task.repository";
import { createTaskService, type TaskService } from "./task.service";
import { DEFAULT_PAGE_SIZE } from "./task.schema";

const NOW = new Date("2026-11-25T12:00:00.000Z");
const UUID = /^[0-9a-f-]{36}$/;

describe("taskService", () => {
  let service: TaskService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    service = createTaskService(createTaskRepository());
  });

  afterEach(() => vi.useRealTimers());

  it("createTask generates id and creationDate", () => {
    const task = service.createTask({ title: "Write tests", description: "all of them" });
    expect(task).toEqual({
      id: expect.stringMatching(UUID),
      title: "Write tests",
      description: "all of them",
      creationDate: NOW.toISOString(),
    });
  });

  it("createTask gives each task a unique id", () => {
    const a = service.createTask({ title: "A" });
    const b = service.createTask({ title: "B" });
    expect(a.id).not.toBe(b.id);
  });

  it("listTasks returns a page, newest first", () => {
    const a = service.createTask({ title: "A" });
    const b = service.createTask({ title: "B" });
    expect(service.listTasks()).toEqual({ items: [b, a], nextCursor: null });
  });

  it("listTasks defaults to DEFAULT_PAGE_SIZE and follows the cursor", () => {
    Array.from({ length: DEFAULT_PAGE_SIZE + 5 }, (_, i) => service.createTask({ title: `T${i}` }));
    const first = service.listTasks();
    expect(first.items).toHaveLength(DEFAULT_PAGE_SIZE);

    const second = service.listTasks({ cursor: first.nextCursor! });
    expect(second.items).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
  });

  it("listTasks honours a custom limit", () => {
    service.createTask({ title: "A" });
    service.createTask({ title: "B" });
    expect(service.listTasks({ limit: 1 }).items).toHaveLength(1);
  });

  it("getTaskById returns the task", () => {
    const task = service.createTask({ title: "A" });
    expect(service.getTaskById({ id: task.id })).toEqual(task);
  });

  it("getTaskById throws NotFoundError for unknown ids", () => {
    expect(() => service.getTaskById({ id: "missing" })).toThrow(NotFoundError);
  });

  it("updateTask changes only the given fields", () => {
    const task = service.createTask({ title: "A", description: "old" });
    expect(service.updateTask({ id: task.id, title: "B" })).toEqual({ ...task, title: "B" });
    expect(service.updateTask({ id: task.id, description: "new" })).toEqual({ ...task, title: "B", description: "new" });
    expect(service.getTaskById({ id: task.id }).description).toBe("new");
  });

  it("updateTask clears the description when given an empty string", () => {
    // The edit form relies on this: it sends "" when the user empties the description.
    const task = service.createTask({ title: "A", description: "old" });
    expect(service.updateTask({ id: task.id, description: "" }).description).toBe("");
    expect(service.getTaskById({ id: task.id }).description).toBe("");
  });

  it("updateTask keeps the description when it is omitted", () => {
    const task = service.createTask({ title: "A", description: "keep" });
    expect(service.updateTask({ id: task.id, title: "B" }).description).toBe("keep");
  });

  it("updateTask throws NotFoundError for unknown ids", () => {
    expect(() => service.updateTask({ id: "missing", title: "X" })).toThrow(NotFoundError);
  });

  it("deleteTask removes and returns the task", () => {
    const task = service.createTask({ title: "A" });
    expect(service.deleteTask({ id: task.id })).toEqual(task);
    expect(service.listTasks().items).toEqual([]);
  });

  it("deleteTask throws NotFoundError for unknown ids", () => {
    expect(() => service.deleteTask({ id: "missing" })).toThrow(NotFoundError);
  });
});
