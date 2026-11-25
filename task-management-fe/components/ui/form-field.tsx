import type { ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
};

export function FormField({ id, label, hint, required, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-red-600">
            *
          </span>
        )}
        {hint && <span className="ml-1 font-normal text-zinc-500">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={errorId(id)} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const errorId = (id: string) => `${id}-error`;

const baseInput =
  "w-full rounded-lg border bg-white px-3 py-2 text-base outline-none dark:bg-zinc-900";
const validInput = "border-black/15 focus:border-foreground dark:border-white/20";
const invalidInput = "border-red-600 ring-1 ring-red-600 focus:border-red-600";

export const inputClasses = (invalid = false): string => `${baseInput} ${invalid ? invalidInput : validInput}`;

/** Wires an input to its FormField: id/name, red border and accessible error state. */
export const controlProps = (id: string, error?: string) => ({
  id,
  name: id,
  className: inputClasses(Boolean(error)),
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? errorId(id) : undefined,
});
