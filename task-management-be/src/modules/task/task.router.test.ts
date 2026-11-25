import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "../../trpc/init";
import { appRouter } from "../../trpc/root";

const caller = createCallerFactory(appRouter)({});
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

const expectCode = async (promise: Promise<unknown>, code: TRPCError["code"]) => {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).code).toBe(code);
};

describe("task router", () => {
  it("runs the full CRUD flow", async () => {
    const created = await caller.task.createTask({ title: "Ship it" });
    expect(created).toMatchObject({ title: "Ship it" });
    expect(Number.isNaN(Date.parse(created.creationDate))).toBe(false);

    await expect(caller.task.getTaskById({ id: created.id })).resolves.toEqual(created);
    expect((await caller.task.listTasks()).items).toContainEqual(created);

    const updated = await caller.task.updateTask({ id: created.id, description: "today" });
    expect(updated).toEqual({ ...created, description: "today" });

    await expect(caller.task.deleteTask({ id: created.id })).resolves.toEqual(updated);
    expect((await caller.task.listTasks()).items).not.toContainEqual(updated);
  });

  it("maps missing tasks to NOT_FOUND", async () => {
    await expectCode(caller.task.getTaskById({ id: MISSING_ID }), "NOT_FOUND");
    await expectCode(caller.task.updateTask({ id: MISSING_ID, title: "X" }), "NOT_FOUND");
    await expectCode(caller.task.deleteTask({ id: MISSING_ID }), "NOT_FOUND");
  });

  it("pages through listTasks with limit and cursor", async () => {
    await caller.task.createTask({ title: "Paging 1" });
    await caller.task.createTask({ title: "Paging 2" });
    const first = await caller.task.listTasks({ limit: 1 });
    expect(first.items.map((t) => t.title)).toEqual(["Paging 2"]);

    const second = await caller.task.listTasks({ limit: 1, cursor: first.nextCursor! });
    expect(second.items.map((t) => t.title)).toEqual(["Paging 1"]);
  });

  it("rejects invalid paging input with BAD_REQUEST", async () => {
    await expectCode(caller.task.listTasks({ limit: 0 }), "BAD_REQUEST");
    await expectCode(caller.task.listTasks({ limit: 101 }), "BAD_REQUEST");
    await expectCode(caller.task.listTasks({ cursor: "abc" }), "BAD_REQUEST");
  });

  it("rejects invalid input with BAD_REQUEST", async () => {
    await expectCode(caller.task.createTask({ title: "   " }), "BAD_REQUEST");
    await expectCode(caller.task.getTaskById({ id: "not-a-uuid" }), "BAD_REQUEST");
  });
});
