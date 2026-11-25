import { describe, expect, it } from "vitest";
import { hasFieldErrors, readTaskForm, validateTaskForm } from "./form-state";
import { toTaskFormError } from "./form-errors";
import { trpcError } from "@/test/fixtures";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([k, v]) => data.set(k, v));
  return data;
};

describe("readTaskForm", () => {
  it("trims the fields", () => {
    expect(readTaskForm(form({ title: "  A ", description: " b " }))).toEqual({ title: "A", description: "b" });
  });

  it("defaults missing fields to empty strings", () => {
    expect(readTaskForm(new FormData())).toEqual({ title: "", description: "" });
  });
});

describe("validateTaskForm", () => {
  it("requires a title", () => {
    expect(validateTaskForm({ title: "", description: "x" })).toEqual({ title: "Title is required." });
  });

  it("accepts a title without description", () => {
    expect(validateTaskForm({ title: "A", description: "" })).toEqual({});
  });
});

describe("hasFieldErrors", () => {
  it("is true only when some field has an error", () => {
    expect(hasFieldErrors({})).toBe(false);
    expect(hasFieldErrors({ title: "x" })).toBe(true);
  });
});

describe("toTaskFormError", () => {
  const values = { title: "A", description: "" };

  it("explains server validation errors and keeps the values", () => {
    expect(toTaskFormError(trpcError("BAD_REQUEST"), values)).toEqual({
      error: expect.stringMatching(/check the fields/),
      values,
    });
  });

  it("explains missing tasks", () => {
    expect(toTaskFormError(trpcError("NOT_FOUND"), values).error).toMatch(/no longer exists/);
  });

  it("rethrows anything else", () => {
    const error = new Error("down");
    expect(() => toTaskFormError(error, values)).toThrow(error);
  });
});
