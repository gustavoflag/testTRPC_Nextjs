import Link from "next/link";
import type { Task } from "@/lib/tasks";
import { FormattedDate } from "@/components/ui/formatted-date";
import { DeleteTaskButton } from "./delete-task-button";

type TaskListItemProps = { task: Task; deleteAction: () => Promise<void> };

export function TaskListItem({ task, deleteAction }: TaskListItemProps) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-black/10 pr-3 transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">
      <Link href={`/tasks/${task.id}`} className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3">
        <span className="font-medium">{task.title}</span>
        {task.description && <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">{task.description}</span>}
        <span className="text-xs text-zinc-500">
          Created <FormattedDate iso={task.creationDate} />
        </span>
      </Link>
      <div className="flex shrink-0 gap-2">
        <DeleteTaskButton action={deleteAction} />
      </div>
    </li>
  );
}
