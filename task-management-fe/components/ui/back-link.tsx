import { ButtonLink } from "./button";

type BackLinkProps = { href: string; label?: string };

/** Navigates to a fixed parent page, so it works even when the page was opened directly. */
export function BackLink({ href, label = "Back" }: BackLinkProps) {
  return (
    <ButtonLink href={href} variant="secondary" className="self-start">
      <span aria-hidden="true">←</span>
      <span className="ml-1.5">{label}</span>
    </ButtonLink>
  );
}
