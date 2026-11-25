import { randomUUID } from "node:crypto";
import { NotFoundError } from "../../lib/errors";
import { createTaskRepository, type TaskRepository } from "./task.repository";
import {
  DEFAULT_PAGE_SIZE,
  type CreateTaskInput,
  type ListTasksInput,
  type Task,
  type TaskIdInput,
  type TaskPage,
  type UpdateTaskInput,
} from "./task.schema";

export const createTaskService = (repository: TaskRepository) => {
  const getTaskById = ({ id }: TaskIdInput): Task => {
    const task = repository.findById(id);
    if (!task) throw new NotFoundError("Task", id);
    return task;
  };

  return {
    createTask(input: CreateTaskInput): Task {
      return repository.save({
        id: randomUUID(),
        title: input.title,
        description: input.description,
        creationDate: new Date().toISOString(),
      });
    },

    listTasks(input?: ListTasksInput): TaskPage {
      return repository.findPage({ limit: input?.limit ?? DEFAULT_PAGE_SIZE, cursor: input?.cursor });
    },

    getTaskById,

    updateTask({ id, ...changes }: UpdateTaskInput): Task {
      const current = getTaskById({ id });
      return repository.save({
        ...current,
        title: changes.title ?? current.title,
        description: changes.description ?? current.description,
      });
    },

    deleteTask({ id }: TaskIdInput): Task {
      const task = getTaskById({ id });
      repository.remove(id);
      return task;
    },
  };
};

export type TaskService = ReturnType<typeof createTaskService>;

export const taskService = createTaskService(createTaskRepository());
