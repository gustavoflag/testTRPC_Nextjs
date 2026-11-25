import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes info to stdout as JSON", () => {
    const out = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    logger.info("hi", { a: 1 });
    const parsed = JSON.parse(String(out.mock.calls[0][0]));
    expect(parsed).toMatchObject({ level: "info", message: "hi", a: 1 });
  });

  it.each(["warn", "error"] as const)("writes %s to stderr", (level) => {
    const err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    logger[level]("oops");
    expect(JSON.parse(String(err.mock.calls[0][0]))).toMatchObject({ level, message: "oops" });
  });
});
