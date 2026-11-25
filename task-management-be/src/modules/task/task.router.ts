import { publicProcedure, router } from "../../trpc/init";
import { createTaskInput, listTasksInput, taskIdInput, updateTaskInput } from "./task.schema";
import { taskService } from "./task.service";

export const taskRouter = router({
  createTask: publicProcedure.input(createTaskInput).mutation(({ input }) => taskService.createTask(input)),
  listTasks: publicProcedure.input(listTasksInput).query(({ input }) => taskService.listTasks(input)),
  getTaskById: publicProcedure.input(taskIdInput).query(({ input }) => taskService.getTaskById(input)),
  updateTask: publicProcedure.input(updateTaskInput).mutation(({ input }) => taskService.updateTask(input)),
  deleteTask: publicProcedure.input(taskIdInput).mutation(({ input }) => taskService.deleteTask(input)),
});
