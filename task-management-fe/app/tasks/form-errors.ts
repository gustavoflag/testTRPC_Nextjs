import { trpcErrorCode } from "@/lib/trpc";
import type { TaskFormFields, TaskFormState } from "./form-state";

/** Turns a failed tRPC mutation into form state. Unknown errors are rethrown to the error boundary. Server-only. */
export const toTaskFormError = (error: unknown, values: TaskFormFields): TaskFormState => {
  switch (trpcErrorCode(error)) {
    case "BAD_REQUEST":
      return { error: "The server rejected these values. Please check the fields.", values };
    case "NOT_FOUND":
      return { error: "This task no longer exists.", values };
    default:
      throw error;
  }
};
