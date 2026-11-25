import type { CreateTaskInput, Task } from "./task.schema";
import type { TaskService } from "./task.service";

const SEED_COUNT = 50;

const areas = ["Backend", "Frontend", "Design", "Docs", "QA", "DevOps"] as const;
const verbs = ["Review", "Refactor", "Document", "Test", "Plan", "Fix"] as const;

/** Generated filler so the list is long enough to scroll through several pages. */
const sampleTasks = (count: number): CreateTaskInput[] =>
  Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const area = areas[i % areas.length];
    return {
      title: `${verbs[i % verbs.length]} ${area.toLowerCase()} item #${n}`,
      // Every third task has no description, to show both cases in the UI.
      description: n % 3 === 0 ? undefined : `${area} sample task ${n} of the demo seed.`,
    };
  });

const milestoneTasks: CreateTaskInput[] = [
  { title: "Set up the project", description: "Create the tRPC backend and the Next.js frontend." },
  { title: "Design the task schema", description: "id, title, description and creationDate." },
  { title: "Build the task pages", description: "List, create and edit, wired to tRPC." },
  { title: "Add a real database" },
  { title: "Add authentication", description: "Protect procedures with a protectedProcedure." },
];

/** 50 tasks. The list is newest first, so the milestone tasks (created last) appear at the top. */
export const seedTaskInputs: CreateTaskInput[] = [
  ...sampleTasks(SEED_COUNT - milestoneTasks.length),
  ...milestoneTasks,
];

/** Creates the demo tasks through the service, so ids and dates are generated as usual. */
export const seedTasks = (service: TaskService, inputs: CreateTaskInput[] = seedTaskInputs): Task[] =>
  inputs.map((input) => service.createTask(input));
