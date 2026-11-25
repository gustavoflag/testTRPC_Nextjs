import Link from "next/link";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";

const base =
  "inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-background hover:bg-zinc-700 dark:hover:bg-zinc-300",
  secondary:
    "border border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export const buttonClasses = (variant: ButtonVariant = "primary"): string => `${base} ${variants[variant]}`;

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

export function Button({ variant, className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`${buttonClasses(variant)} ${className}`.trim()} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant };

export function ButtonLink({ variant, className = "", ...props }: ButtonLinkProps) {
  return <Link className={`${buttonClasses(variant)} ${className}`.trim()} {...props} />;
}
