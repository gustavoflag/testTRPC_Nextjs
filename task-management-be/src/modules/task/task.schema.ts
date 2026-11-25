import { z } from "zod";

export const taskSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1),
  description: z.string().optional(),
  /** ISO 8601 timestamp, set by the server on creation. */
  creationDate: z.iso.datetime(),
});

export const createTaskInput = taskSchema.pick({ title: true, description: true });

export const updateTaskInput = z.object({
  id: taskSchema.shape.id,
  title: taskSchema.shape.title.optional(),
  description: taskSchema.shape.description,
});

export const taskIdInput = taskSchema.pick({ id: true });

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Cursor pagination, newest first. Pass the previous page's `nextCursor` to get the next one. */
export const listTasksInput = z
  .object({
    limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
    /** Opaque to clients: the position after which the next page starts. */
    cursor: z.string().regex(/^\d+$/, "Invalid cursor").optional(),
  })
  .optional();

export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInput>;
export type UpdateTaskInput = z.infer<typeof updateTaskInput>;
export type TaskIdInput = z.infer<typeof taskIdInput>;
export type ListTasksInput = z.infer<typeof listTasksInput>;

export type TaskPage = {
  items: Task[];
  /** Cursor for the next page, or null when this is the last one. */
  nextCursor: string | null;
};
