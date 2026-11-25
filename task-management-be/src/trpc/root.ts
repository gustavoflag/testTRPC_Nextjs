import { router } from "./init";
import { taskRouter } from "../modules/task/task.router";

export const appRouter = router({
  task: taskRouter,
});

// Clients import this type only — keep this file free of server bootstrap code.
export type AppRouter = typeof appRouter;
