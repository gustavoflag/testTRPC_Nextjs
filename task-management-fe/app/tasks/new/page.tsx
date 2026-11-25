import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { TaskForm } from "@/components/tasks/task-form";
import { createTaskAction } from "../actions";

export default function NewTaskPage() {
  return (
    <>
      <BackLink href="/" />
      <PageHeader title="New task" />
      <TaskForm action={createTaskAction} submitLabel="Create task" cancelHref="/" />
    </>
  );
}
