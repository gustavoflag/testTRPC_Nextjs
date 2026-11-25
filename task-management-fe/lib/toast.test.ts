import { describe, expect, it } from "vitest";
import { toastMessage, withToast } from "./toast";

describe("toast helpers", () => {
  it("withToast appends the toast param", () => {
    expect(withToast("/", "created")).toBe("/?toast=created");
  });

  it.each([
    ["created", "Task Created"],
    ["updated", "Task Updated"],
    ["deleted", "Task Deleted"],
  ])("maps %s to its message", (kind, message) => {
    expect(toastMessage(kind)).toBe(message);
  });

  it.each([null, "unknown", "toString"])("ignores %s", (kind) => {
    expect(toastMessage(kind)).toBeNull();
  });
});
