import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "selected";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    const variantStyles = {
      default:
        "bg-[var(--surface)] border border-[var(--border)] shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:shadow-none",
      subtle:
        "bg-[var(--surface-muted)] border border-[var(--border)]",
      selected:
        "bg-[var(--primary-soft)] border-2 border-[var(--primary)] shadow-[0_2px_8px_rgba(79,70,229,0.08)]",
    };

    return (
      <div
        ref={ref}
        className={`rounded-[var(--radius-card)] p-4 sm:p-6 transition-colors ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
