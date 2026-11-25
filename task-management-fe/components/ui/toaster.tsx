"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { TOAST_PARAM, toastMessage } from "@/lib/toast";
import { Toast } from "./toast";

type ActiveToast = { id: number; message: string };

/** Shows the toast named in `?toast=`, then strips the param so a refresh doesn't repeat it. Render inside <Suspense>. */
export function Toaster() {
  const pathname = usePathname();
  // The query string (not the params object) is stable across renders for the same URL.
  const search = useSearchParams().toString();
  const message = toastMessage(new URLSearchParams(search).get(TOAST_PARAM));

  const [toast, setToast] = useState<ActiveToast | null>(null);
  const [shownFor, setShownFor] = useState<string | null>(null);
  const dismiss = useCallback(() => setToast(null), []);

  // Adjust state while rendering when the URL changes (React's alternative to setState in an effect).
  if (message && search !== shownFor) {
    setShownFor(search);
    setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message }));
  } else if (!message && shownFor !== null) {
    setShownFor(null); // param stripped: the same toast may be shown again next time
  }

  useEffect(() => {
    if (!message) return;
    const rest = new URLSearchParams(search);
    rest.delete(TOAST_PARAM);
    const query = rest.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [message, pathname, search]);

  return toast ? <Toast key={toast.id} message={toast.message} onDismiss={dismiss} /> : null;
}
