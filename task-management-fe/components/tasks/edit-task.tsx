import { notFound } from "next/navigation";
import { getTask } from "@/lib/tasks";
import { deleteTaskAction, updateTaskAction } from "@/app/tasks/actions";
import { BackLink } from "@/components/ui/back-link";
import { FormattedDate } from "@/components/ui/formatted-date";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteTaskButton } from "./delete-task-button";
import { TaskForm } from "./task-form";

/** Fetches one task and shows its edit form, with delete. Render inside <Suspense>. */
export async function EditTask({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) notFound();

  return (
    <>
      <BackLink href="/" />
      <PageHeader title="Edit task" actions={<DeleteTaskButton action={deleteTaskAction.bind(null, task.id)} />} />
      <p className="-mt-3 text-sm text-zinc-500">
        Created <FormattedDate iso={task.creationDate} />
      </p>
      <TaskForm
        action={updateTaskAction.bind(null, task.id)}
        submitLabel="Save changes"
        cancelHref="/"
        defaultValues={task}
      />
    </>
  );
}
