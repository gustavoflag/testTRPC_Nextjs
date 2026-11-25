"use client";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

type ErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function ErrorPage({ reset }: ErrorProps) {
  return (
    <>
      <PageHeader title="Something went wrong" />
      <p className="text-zinc-600 dark:text-zinc-400">
        The task service could not be reached. Check that task-management-be is running, then try again.
      </p>
      <Button onClick={reset} className="self-start">
        Try again
      </Button>
    </>
  );
}
