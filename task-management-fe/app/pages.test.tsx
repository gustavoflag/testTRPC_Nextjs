import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Async data components are covered in components/tasks; stub them so pages render synchronously.
vi.mock("@/components/tasks/task-list", () => ({ TaskList: () => <p>task list</p> }));
vi.mock("@/components/tasks/edit-task", () => ({
  EditTask: ({ params }: { params: Promise<{ id: string }> }) => <p>edit task {String(params instanceof Promise)}</p>,
}));
vi.mock("@/app/tasks/actions", () => ({ createTaskAction: vi.fn() }));
vi.mock("@/components/ui/toaster", () => ({ Toaster: () => <p>toaster</p> }));
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-sans" }),
  Geist_Mono: () => ({ variable: "font-mono" }),
}));

import Home from "./page";
import NewTaskPage from "./tasks/new/page";
import TaskPage from "./tasks/[id]/page";
import TaskNotFound from "./tasks/[id]/not-found";
import ErrorPage from "./error";
import RootLayout, { metadata } from "./layout";

const params = Promise.resolve({ id: "1" });

describe("pages", () => {
  it("Home lists tasks and links to the create page", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New task" })).toHaveAttribute("href", "/tasks/new");
    expect(screen.getByText("task list")).toBeInTheDocument();
  });

  it("NewTaskPage renders the create form", () => {
    render(<NewTaskPage />);
    expect(screen.getByRole("heading", { name: "New task" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create task" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
  });

  it("TaskPage renders the edit form for the task", () => {
    render(<TaskPage params={params} searchParams={Promise.resolve({})} />);
    expect(screen.getByText("edit task true")).toBeInTheDocument();
  });

  it("TaskNotFound links back home", () => {
    render(<TaskNotFound />);
    expect(screen.getByRole("link", { name: "Back to tasks" })).toHaveAttribute("href", "/");
  });

  it("ErrorPage offers a retry", async () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("x")} reset={reset} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});

describe("RootLayout", () => {
  it("wraps pages with the nav", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined); // <html> inside a test container
    render(
      <RootLayout params={Promise.resolve({})}>
        <p>child</p>
      </RootLayout>
    );
    expect(screen.getByRole("link", { name: "Task Management" })).toHaveAttribute("href", "/");
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.getByText("toaster")).toBeInTheDocument();
    expect(metadata.title).toBe("Task Management");
    consoleError.mockRestore();
  });
});
