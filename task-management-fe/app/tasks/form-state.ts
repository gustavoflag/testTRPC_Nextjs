/* Pure form helpers shared by the client form and the server actions. Keep this file free of server-only imports. */

export type TaskFormFields = { title: string; description: string };

export type TaskFieldErrors = Partial<Record<keyof TaskFormFields, string>>;

export type TaskFormState = {
  /** Form-level message (e.g. the task was deleted meanwhile). */
  error: string | null;
  /** Per-field messages, shown under the field with a red border. */
  fieldErrors?: TaskFieldErrors;
  /** Submitted values, so a failed submit doesn't wipe what the user typed. */
  values?: TaskFormFields;
};

export const initialTaskFormState: TaskFormState = { error: null };

export const readTaskForm = (formData: FormData): TaskFormFields => ({
  title: String(formData.get("title") ?? "").trim(),
  description: String(formData.get("description") ?? "").trim(),
});

/** Returns an error per invalid field; empty when the form is valid. */
export const validateTaskForm = (fields: TaskFormFields): TaskFieldErrors =>
  fields.title ? {} : { title: "Title is required." };

export const hasFieldErrors = (errors: TaskFieldErrors): boolean => Object.keys(errors).length > 0;
