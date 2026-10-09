import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  success: "bg-success-bg text-success-fg border-success/20",
  warning: "bg-warning-bg text-warning-fg border-warning/20",
  destructive: "bg-destructive-bg text-destructive-fg border-destructive/20",
  info: "bg-info-bg text-info-fg border-info/20",
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary-soft text-primary-strong border-primary/20",
} as const;

export type BadgeTone = keyof typeof TONES;

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function membershipTone(status: string): BadgeTone {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "EXPIRED":
      return "warning";
    case "CANCELLED":
      return "neutral";
    default:
      return "neutral";
  }
}

export function paymentTone(status: string): BadgeTone {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "PENDING":
      return "warning";
    case "FAILED":
      return "destructive";
    case "REFUNDED":
      return "info";
    default:
      return "neutral";
  }
}

export function sessionTone(status: string): BadgeTone {
  switch (status) {
    case "SCHEDULED":
      return "primary";
    case "COMPLETED":
      return "neutral";
    case "CANCELLED":
      return "destructive";
    default:
      return "neutral";
  }
}

export function attendanceTone(status: string): BadgeTone {
  switch (status) {
    case "PRESENT":
      return "success";
    case "LATE":
      return "warning";
    case "ABSENT":
      return "destructive";
    default:
      return "neutral";
  }
}

export function accountTone(status: string): BadgeTone {
  return status === "ACTIVE" ? "success" : "neutral";
}
