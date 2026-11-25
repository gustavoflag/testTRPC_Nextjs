import { getFirstTaskPage } from "@/lib/tasks";
import { deleteTaskAction, loadMoreTasksAction } from "@/app/tasks/actions";
import { InfiniteTaskList } from "./infinite-task-list";

/** Renders the first page on the server; later pages load in the browser as the user scrolls. Render inside <Suspense>. */
export async function TaskList() {
  const page = await getFirstTaskPage();
  return <InfiniteTaskList initialPage={page} loadMoreAction={loadMoreTasksAction} deleteAction={deleteTaskAction} />;
}
