"use client";

import { useActionState, useLayoutEffect, useState, type SubmitEvent } from "react";
import {
  hasFieldErrors,
  initialTaskFormState,
  readTaskForm,
  validateTaskForm,
  type TaskFieldErrors,
  type TaskFormState,
} from "@/app/tasks/form-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { FormField, controlProps } from "@/components/ui/form-field";

export type TaskFormAction = (prev: TaskFormState, formData: FormData) => Promise<TaskFormState>;

type TaskFormProps = {
  action: TaskFormAction;
  submitLabel: string;
  cancelHref: string;
  defaultValues?: { title: string; description?: string };
};

/**
 * With Cache Components, Next.js hides pages you navigate away from (React <Activity>) instead of unmounting them,
 * so a half-edited form would reappear on return. Remounting the form whenever it is hidden discards typed values,
 * validation errors and the last action result, so leaving the page always cancels the edit.
 */
export function TaskForm(props: TaskFormProps) {
  const [instance, setInstance] = useState(0);
  useLayoutEffect(() => () => setInstance((n) => n + 1), []);
  return <TaskFormBody key={instance} {...props} />;
}

function TaskFormBody({ action, submitLabel, cancelHref, defaultValues }: TaskFormProps) {
  const [state, formAction, pending] = useActionState(action, initialTaskFormState);
  // Client-side check on submit, for instant feedback. The server action validates again.
  const [clientErrors, setClientErrors] = useState<TaskFieldErrors | null>(null);
  const errors = clientErrors ?? state.fieldErrors ?? {};
  const values = state.values ?? defaultValues;

  const validateOnSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    const found = validateTaskForm(readTaskForm(new FormData(event.currentTarget)));
    if (hasFieldErrors(found)) event.preventDefault();
    setClientErrors(hasFieldErrors(found) ? found : null);
  };

  return (
    <form action={formAction} onSubmit={validateOnSubmit} noValidate className="flex flex-col gap-5">
      <FormField id="title" label="Title" required error={errors.title}>
        <input
          {...controlProps("title", errors.title)}
          required
          defaultValue={values?.title}
          onChange={() => errors.title && setClientErrors({})}
        />
      </FormField>
      <FormField id="description" label="Description" hint="(optional)">
        <textarea {...controlProps("description")} rows={4} defaultValue={values?.description} />
      </FormField>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <ButtonLink href={cancelHref} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
