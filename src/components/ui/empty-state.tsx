import React from "react";
import { Card } from "./card";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <Card
      className={`text-center py-12 px-4 sm:px-6 space-y-3 bg-[var(--surface)] ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-2">
          {icon}
        </div>
      )}
      <h3 className="text-base sm:text-lg font-bold text-[var(--text)] tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </Card>
  );
};
