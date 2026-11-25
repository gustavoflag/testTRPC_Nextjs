import { describe, expect, it } from "vitest";
import { trpcErrorCode, trpc } from "./trpc";
import { trpcError } from "@/test/fixtures";

describe("trpcErrorCode", () => {
  it("reads the code from a tRPC client error", () => {
    expect(trpcErrorCode(trpcError("NOT_FOUND"))).toBe("NOT_FOUND");
  });

  it("returns undefined for other errors", () => {
    expect(trpcErrorCode(new Error("boom"))).toBeUndefined();
  });
});

describe("trpc client", () => {
  it("exposes the task procedures", () => {
    expect(typeof trpc.task.listTasks.query).toBe("function");
  });
});
