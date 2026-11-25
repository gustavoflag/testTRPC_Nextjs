import type { Task } from "@/lib/tasks";
import { TaskListItem } from "./task-list-item";

type TaskListViewProps = { tasks: Task[]; deleteAction: (id: string) => Promise<void> };

export function TaskListView({ tasks, deleteAction }: TaskListViewProps) {
  if (tasks.length === 0) {
    return <p className="text-zinc-500">No tasks yet. Create one to get started.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {tasks.map((task) => (
        <TaskListItem key={task.id} task={task} deleteAction={deleteAction.bind(null, task.id)} />
      ))}
    </ul>
  );
}
