import { connection } from "next/server";
import { trpc, trpcErrorCode, type RouterOutputs } from "./trpc";

export type Task = RouterOutputs["task"]["getTaskById"];
export type TaskPage = RouterOutputs["task"]["listTasks"];

/* Server-side reads. connection() keeps them out of prerendering: they run per request. */

/** The first page of the list, newest first. Later pages load through loadMoreTasksAction. */
export async function getFirstTaskPage(): Promise<TaskPage> {
  await connection();
  return trpc.task.listTasks.query();
}

/** Returns null when the task does not exist. */
export async function getTask(id: string): Promise<Task | null> {
  await connection();
  try {
    return await trpc.task.getTaskById.query({ id });
  } catch (error) {
    // An id that is not a UUID can never exist either.
    const code = trpcErrorCode(error);
    if (code === "NOT_FOUND" || code === "BAD_REQUEST") return null;
    throw error;
  }
}
