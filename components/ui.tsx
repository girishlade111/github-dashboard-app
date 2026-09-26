import type { ButtonHTMLAttributes, ReactNode } from "react";

/* ---------- Button ---------- */
type ButtonVariant = "primary" | "secondary" | "on-dark";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-active disabled:bg-hairline disabled:text-muted-soft",
  secondary:
    "bg-canvas text-ink border border-hairline hover:border-muted-soft",
  "on-dark": "bg-surface-dark-elevated text-on-dark hover:bg-surface-dark-soft",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = "primary", children, className = "", ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium leading-none transition-colors disabled:cursor-not-allowed ${buttonStyles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------- Pill ---------- */
interface PillProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
}

export function Pill({ children, active = false, className = "" }: PillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${
        active ? "bg-surface-strong text-ink" : "bg-surface-card text-ink"
      } ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------- SectionTitle ---------- */
export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`font-display text-4xl font-normal tracking-[-0.02em] text-ink ${className}`}>
      {children}
    </h2>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-card ${className}`} aria-hidden="true" />;
}

/* ---------- EmptyState ---------- */
export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-12 text-center text-sm text-muted">{children}</p>;
}

/* ---------- Banner ---------- */
type BannerTone = "amber" | "error" | "success";

const bannerStyles: Record<BannerTone, string> = {
  amber: "border-warning/40 bg-surface-soft text-body",
  error: "border-error/40 bg-surface-soft text-body",
  success: "border-success/40 bg-surface-soft text-body",
};

export function Banner({ tone = "amber", children }: { tone?: BannerTone; children: ReactNode }) {
  return (
    <div className={`rounded-lg border px-5 py-4 text-sm ${bannerStyles[tone]}`} role="alert">
      {children}
    </div>
  );
}
