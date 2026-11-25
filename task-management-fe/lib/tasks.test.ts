import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeTask, trpcError } from "@/test/fixtures";

const { listTasks, getTaskById } = vi.hoisted(() => ({ listTasks: vi.fn(), getTaskById: vi.fn() }));

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./trpc", async (importActual) => ({
  ...(await importActual<typeof import("./trpc")>()),
  trpc: { task: { listTasks: { query: listTasks }, getTaskById: { query: getTaskById } } },
}));

import { getFirstTaskPage, getTask } from "./tasks";

describe("tasks data layer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getFirstTaskPage returns the first page", async () => {
    const page = { items: [makeTask()], nextCursor: "20" };
    listTasks.mockResolvedValue(page);
    await expect(getFirstTaskPage()).resolves.toEqual(page);
    expect(listTasks).toHaveBeenCalledWith();
  });

  it("getTask returns the task", async () => {
    getTaskById.mockResolvedValue(makeTask());
    await expect(getTask("id")).resolves.toEqual(makeTask());
    expect(getTaskById).toHaveBeenCalledWith({ id: "id" });
  });

  it.each(["NOT_FOUND", "BAD_REQUEST"])("getTask returns null on %s", async (code) => {
    getTaskById.mockRejectedValue(trpcError(code));
    await expect(getTask("id")).resolves.toBeNull();
  });

  it("getTask rethrows other errors", async () => {
    const error = new Error("network down");
    getTaskById.mockRejectedValue(error);
    await expect(getTask("id")).rejects.toBe(error);
  });
});
