import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TaskList } from "@/components/tasks/task-list";
import { TaskListSkeleton } from "@/components/tasks/skeletons";

export default function Home() {
  return (
    <>
      <PageHeader title="Tasks" actions={<ButtonLink href="/tasks/new">New task</ButtonLink>} />
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskList />
      </Suspense>
    </>
  );
}
