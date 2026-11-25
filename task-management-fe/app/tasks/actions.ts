"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { trpc, trpcErrorCode } from "@/lib/trpc";
import type { TaskPage } from "@/lib/tasks";
import { withToast } from "@/lib/toast";
import { toTaskFormError } from "./form-errors";
import { hasFieldErrors, readTaskForm, validateTaskForm, type TaskFormState } from "./form-state";

export async function createTaskAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const values = readTaskForm(formData);
  const fieldErrors = validateTaskForm(values);
  if (hasFieldErrors(fieldErrors)) return { error: null, fieldErrors, values };

  try {
    await trpc.task.createTask.mutate({ title: values.title, description: values.description || undefined });
  } catch (error) {
    return toTaskFormError(error, values);
  }
  revalidatePath("/");
  redirect(withToast("/", "created"));
}

export async function updateTaskAction(
  id: string,
  _prev: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  // An empty description is sent as "" so it clears the stored one.
  const values = readTaskForm(formData);
  const fieldErrors = validateTaskForm(values);
  if (hasFieldErrors(fieldErrors)) return { error: null, fieldErrors, values };

  try {
    await trpc.task.updateTask.mutate({ id, ...values });
  } catch (error) {
    return toTaskFormError(error, values);
  }
  revalidatePath("/");
  revalidatePath(`/tasks/${id}`);
  redirect(withToast("/", "updated"));
}

export async function deleteTaskAction(id: string): Promise<void> {
  try {
    await trpc.task.deleteTask.mutate({ id });
  } catch (error) {
    // Already gone is the outcome the user wanted.
    if (trpcErrorCode(error) !== "NOT_FOUND") throw error;
  }
  revalidatePath("/");
  redirect(withToast("/", "deleted"));
}

/** Next page of the task list for infinite scroll. Called from the browser; runs on the server. */
export async function loadMoreTasksAction(cursor: string): Promise<TaskPage> {
  return trpc.task.listTasks.query({ cursor });
}
