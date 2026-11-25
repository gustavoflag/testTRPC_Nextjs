"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type DeleteTaskButtonProps = { action: () => Promise<void> };

/** Two-step delete: the first click asks for confirmation, the second runs the action. */
export function DeleteTaskButton({ action }: DeleteTaskButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }

  return (
    <>
      <Button variant="danger" disabled={pending} onClick={() => startTransition(action)}>
        {pending ? "Deleting…" : "Confirm delete"}
      </Button>
      <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </>
  );
}
