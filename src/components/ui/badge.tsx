import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "neutral"
    | "success"
    | "warning"
    | "danger"
    | "capacity"
    | "owner";
}

export const Badge: React.FC<BadgeProps> = ({
  className = "",
  variant = "neutral",
  children,
  ...props
}) => {
  const variantStyles = {
    neutral:
      "bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]",
    success:
      "bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20",
    warning:
      "bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--warning)]/20",
    danger:
      "bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/20",
    capacity:
      "bg-[var(--capacity-soft)] text-[var(--capacity)] border border-[var(--capacity)]/25",
    owner:
      "bg-[var(--warning-soft)] text-[var(--owner)] border border-[var(--owner)]/30 font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--radius-badge)] text-xs font-medium transition-colors select-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
