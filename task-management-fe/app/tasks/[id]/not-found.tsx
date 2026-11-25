import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function TaskNotFound() {
  return (
    <>
      <PageHeader title="Task not found" />
      <p className="text-zinc-600 dark:text-zinc-400">It may have been deleted.</p>
      <ButtonLink href="/" variant="secondary" className="self-start">
        Back to tasks
      </ButtonLink>
    </>
  );
}
