import { describe, expect, it } from "vitest";
import { createTaskRepository } from "./task.repository";
import { createTaskService } from "./task.service";
import { seedTaskInputs, seedTasks } from "./task.seed";
import { createTaskInput } from "./task.schema";

describe("seedTasks", () => {
  it("creates every seed task in order", () => {
    const service = createTaskService(createTaskRepository());
    const created = seedTasks(service);

    expect(created).toHaveLength(50);
    expect(created.map((t) => t.title)).toEqual(seedTaskInputs.map((t) => t.title));
    expect(service.listTasks({ limit: 100 }).items).toEqual([...created].reverse());
  });

  it("accepts custom inputs", () => {
    const service = createTaskService(createTaskRepository());
    expect(seedTasks(service, [{ title: "Only one" }])).toHaveLength(1);
  });

  it("puts the milestone tasks at the top of the list", () => {
    const service = createTaskService(createTaskRepository());
    seedTasks(service);
    expect(service.listTasks({ limit: 1 }).items[0].title).toBe("Add authentication");
  });

  it("mixes tasks with and without a description", () => {
    expect(seedTaskInputs.some((t) => t.description === undefined)).toBe(true);
    expect(seedTaskInputs.some((t) => t.description)).toBe(true);
  });

  it("ships seed data that passes input validation", () => {
    seedTaskInputs.forEach((input) => expect(createTaskInput.safeParse(input).success).toBe(true));
  });
});
