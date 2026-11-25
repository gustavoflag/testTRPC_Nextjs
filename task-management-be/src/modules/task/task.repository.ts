import type { Task, TaskPage } from "./task.schema";

export type TaskPageQuery = { limit: number; cursor?: string };

export type TaskRepository = {
  save(task: Task): Task;
  /** Newest first. The cursor is the position of the previous page's last task. */
  findPage(query: TaskPageQuery): TaskPage;
  findById(id: string): Task | undefined;
  remove(id: string): boolean;
};

type StoredTask = { task: Task; seq: number };

/*
 * In-memory store. Replace with a DB-backed implementation of TaskRepository when one exists.
 * Each task gets an increasing sequence number on first save (like an auto-increment id). It orders the
 * list and serves as the cursor, so deleting a task never invalidates a cursor someone is paging with.
 */
export const createTaskRepository = (): TaskRepository => {
  const tasks = new Map<string, StoredTask>();
  let nextSeq = 1;

  return {
    save(task) {
      const seq = tasks.get(task.id)?.seq ?? nextSeq++;
      tasks.set(task.id, { task, seq });
      return task;
    },
    findPage({ limit, cursor }) {
      const before = cursor === undefined ? Infinity : Number(cursor);
      const candidates = [...tasks.values()].filter((t) => t.seq < before).sort((a, b) => b.seq - a.seq);
      const page = candidates.slice(0, limit);
      const hasMore = candidates.length > limit;
      return {
        items: page.map((t) => t.task),
        nextCursor: hasMore ? String(page[page.length - 1].seq) : null,
      };
    },
    findById(id) {
      return tasks.get(id)?.task;
    },
    remove(id) {
      return tasks.delete(id);
    },
  };
};
