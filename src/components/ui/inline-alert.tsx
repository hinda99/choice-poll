import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export interface InlineAlertProps {
  variant?: "danger" | "warning" | "success" | "info";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  variant = "danger",
  title,
  children,
  className = "",
}) => {
  const configs = {
    danger: {
      icon: AlertCircle,
      containerClass:
        "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]/30",
    },
    warning: {
      icon: AlertTriangle,
      containerClass:
        "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/30",
    },
    success: {
      icon: CheckCircle2,
      containerClass:
        "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]/30",
    },
    info: {
      icon: Info,
      containerClass:
        "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]/30",
    },
  };

  const { icon: Icon, containerClass } = configs[variant];

  return (
    <div
      role="alert"
      className={`p-3.5 sm:p-4 rounded-[var(--radius-control)] border text-xs sm:text-sm flex items-start gap-3 transition-colors ${containerClass} ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="space-y-0.5 flex-1 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
