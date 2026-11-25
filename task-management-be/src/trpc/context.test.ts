import { describe, expect, it } from "vitest";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { createContext } from "./context";

describe("createContext", () => {
  it("returns an empty context", () => {
    const opts = {} as CreateExpressContextOptions;
    expect(createContext(opts)).toEqual({});
  });
});
