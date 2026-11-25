import { Activity } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TaskFormState } from "@/app/tasks/form-state";
import { DeleteTaskButton } from "./delete-task-button";
import { TaskForm, type TaskFormAction } from "./task-form";

describe("TaskForm", () => {
  it("submits the fields to the action", async () => {
    const action = vi.fn<TaskFormAction>(async () => ({ error: null }));
    render(<TaskForm action={action} submitLabel="Create task" cancelHref="/" />);

    await userEvent.type(screen.getByLabelText(/Title/), "New one");
    await userEvent.type(screen.getByLabelText(/Description/), "Some details");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    const data = action.mock.calls[0][1];
    expect(data.get("title")).toBe("New one");
    expect(data.get("description")).toBe("Some details");
  });

  it("shows the error the action returns and a pending label meanwhile", async () => {
    let finish: (state: TaskFormState) => void = () => undefined;
    const action = vi.fn(() => new Promise<TaskFormState>((resolve) => (finish = resolve)));
    render(<TaskForm action={action} submitLabel="Save" cancelHref="/" defaultValues={{ title: "T" }} />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled();

    finish({ error: "Nope" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Nope");
  });

  it("prefills default values and links cancel", () => {
    const action = vi.fn();
    render(
      <TaskForm action={action} submitLabel="Save" cancelHref="/tasks/1" defaultValues={{ title: "T", description: "D" }} />
    );
    expect(screen.getByLabelText(/Title/)).toHaveValue("T");
    expect(screen.getByLabelText(/Description/)).toHaveValue("D");
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/tasks/1");
  });

  it("marks the title as required", () => {
    render(<TaskForm action={vi.fn()} submitLabel="Save" cancelHref="/" />);
    expect(screen.getByLabelText(/Title/)).toBeRequired();
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });

  it("blocks a blank title on the client and highlights the field", async () => {
    const action = vi.fn<TaskFormAction>();
    render(<TaskForm action={action} submitLabel="Save" cancelHref="/" />);
    const title = screen.getByLabelText(/Title/);

    await userEvent.type(title, "   ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(action).not.toHaveBeenCalled();
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveClass("border-red-600");
    expect(title).toHaveAccessibleDescription("Title is required.");
  });

  it("clears the highlight once the user types", async () => {
    render(<TaskForm action={vi.fn<TaskFormAction>()} submitLabel="Save" cancelHref="/" />);
    const title = screen.getByLabelText(/Title/);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(title).toHaveAttribute("aria-invalid", "true");

    await userEvent.type(title, "A");
    expect(title).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Title is required.")).not.toBeInTheDocument();
  });

  it("discards edits and errors when its page is hidden (navigating away)", async () => {
    const form = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <TaskForm action={vi.fn<TaskFormAction>()} submitLabel="Save" cancelHref="/" defaultValues={{ title: "Original" }} />
      </Activity>
    );
    const { rerender } = render(form("visible"));
    const title = () => screen.getByLabelText(/Title/, { selector: "input" });

    await userEvent.clear(title());
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(title()).toHaveAttribute("aria-invalid", "true");

    act(() => rerender(form("hidden")));
    act(() => rerender(form("visible")));

    expect(title()).toHaveValue("Original");
    expect(title()).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Title is required.")).not.toBeInTheDocument();
  });

  it("shows field errors and keeps values returned by the server", async () => {
    const action = vi.fn<TaskFormAction>(async () => ({
      error: null,
      fieldErrors: { title: "Title is required." },
      values: { title: "", description: "kept" },
    }));
    render(<TaskForm action={action} submitLabel="Save" cancelHref="/" defaultValues={{ title: "T" }} />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Title is required.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Description/)).toHaveValue("kept");
  });
});

describe("DeleteTaskButton", () => {
  it("asks for confirmation before deleting", async () => {
    const action = vi.fn(async () => undefined);
    render(<DeleteTaskButton action={action} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(action).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(action).toHaveBeenCalledOnce());
  });

  it("can cancel the confirmation", async () => {
    const action = vi.fn(async () => undefined);
    render(<DeleteTaskButton action={action} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("shows a pending state while deleting", async () => {
    const action = vi.fn(() => new Promise<void>(() => undefined));
    render(<DeleteTaskButton action={action} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(await screen.findByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
