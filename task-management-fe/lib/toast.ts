/* Flash toasts travel in the redirect URL (?toast=<kind>). Only known kinds render, so the URL can't inject text. */

export const TOAST_PARAM = "toast";

export const toastMessages = {
  created: "Task Created",
  updated: "Task Updated",
  deleted: "Task Deleted",
} as const;

export type ToastKind = keyof typeof toastMessages;

export const withToast = (path: string, kind: ToastKind): string => `${path}?${TOAST_PARAM}=${kind}`;

export const toastMessage = (kind: string | null): string | null =>
  kind !== null && Object.hasOwn(toastMessages, kind) ? toastMessages[kind as ToastKind] : null;
