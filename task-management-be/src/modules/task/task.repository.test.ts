import { describe, expect, it } from "vitest";
import { createTaskRepository } from "./task.repository";
import type { Task } from "./task.schema";

const makeTask = (id: string, title = id): Task => ({ id, title, creationDate: "2026-01-01T00:00:00.000Z" });

const repoWith = (...ids: string[]) => {
  const repo = createTaskRepository();
  ids.forEach((id) => repo.save(makeTask(id)));
  return repo;
};

const ids = (tasks: Task[]) => tasks.map((t) => t.id);

describe("taskRepository", () => {
  it("saves and finds tasks", () => {
    const repo = createTaskRepository();
    const task = makeTask("1");
    expect(repo.save(task)).toBe(task);
    expect(repo.findById("1")).toBe(task);
  });

  it("returns undefined for unknown ids", () => {
    expect(createTaskRepository().findById("missing")).toBeUndefined();
  });

  it("removes tasks and reports whether one existed", () => {
    const repo = repoWith("1");
    expect(repo.remove("1")).toBe(true);
    expect(repo.remove("1")).toBe(false);
    expect(repo.findPage({ limit: 10 }).items).toEqual([]);
  });
});

describe("taskRepository.findPage", () => {
  it("returns newest first with a cursor while more remain", () => {
    const page = repoWith("a", "b", "c", "d", "e").findPage({ limit: 2 });
    expect(ids(page.items)).toEqual(["e", "d"]);
    expect(page.nextCursor).toBe("4");
  });

  it("walks every page without gaps or duplicates", () => {
    const repo = repoWith("a", "b", "c", "d", "e");
    const p1 = repo.findPage({ limit: 2 });
    const p2 = repo.findPage({ limit: 2, cursor: p1.nextCursor! });
    const p3 = repo.findPage({ limit: 2, cursor: p2.nextCursor! });
    expect([...ids(p1.items), ...ids(p2.items), ...ids(p3.items)]).toEqual(["e", "d", "c", "b", "a"]);
    expect(p3.nextCursor).toBeNull();
  });

  it("has no cursor when everything fits exactly", () => {
    expect(repoWith("a", "b").findPage({ limit: 2 }).nextCursor).toBeNull();
  });

  it("keeps a task's position when it is updated", () => {
    const repo = repoWith("a", "b", "c");
    repo.save(makeTask("a", "renamed"));
    expect(ids(repo.findPage({ limit: 10 }).items)).toEqual(["c", "b", "a"]);
    expect(repo.findById("a")?.title).toBe("renamed");
  });

  it("keeps a cursor valid when the task it points at is deleted", () => {
    const repo = repoWith("a", "b", "c", "d");
    const p1 = repo.findPage({ limit: 2 }); // d, c — cursor at c
    repo.remove("c");
    expect(ids(repo.findPage({ limit: 2, cursor: p1.nextCursor! }).items)).toEqual(["b", "a"]);
  });

  it("returns an empty page past the end", () => {
    expect(repoWith("a").findPage({ limit: 5, cursor: "1" })).toEqual({ items: [], nextCursor: null });
  });
});
