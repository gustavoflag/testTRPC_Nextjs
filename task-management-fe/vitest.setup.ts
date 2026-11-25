import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { FakeIntersectionObserver } from "./test/intersection-observer";

vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

afterEach(() => {
  cleanup();
  FakeIntersectionObserver.instances = [];
});
