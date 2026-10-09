import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  ...props
}) => {
  return (
    <div
      aria-hidden="true"
      className={`bg-[var(--surface-muted)] rounded-[var(--radius-control)] animate-pulse ${className}`}
      {...props}
    />
  );
};
