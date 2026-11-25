import { Suspense } from "react";
import { EditTask } from "@/components/tasks/edit-task";
import { TaskSkeleton } from "@/components/tasks/skeletons";

export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <Suspense fallback={<TaskSkeleton />}>
      <EditTask params={params} />
    </Suspense>
  );
}
