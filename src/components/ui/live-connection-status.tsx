import React from "react";

export type ConnectionState = "connected" | "reconnecting" | "disconnected";

export interface LiveConnectionStatusProps {
  status: ConnectionState;
}

export const LiveConnectionStatus: React.FC<LiveConnectionStatusProps> = ({
  status,
}) => {
  const configs = {
    connected: {
      text: "Live",
      dotClass: "bg-[var(--success)]",
      containerClass:
        "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]/20",
    },
    reconnecting: {
      text: "Reconnecting…",
      dotClass: "bg-[var(--warning)] animate-pulse",
      containerClass:
        "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/20",
    },
    disconnected: {
      text: "Updates paused",
      dotClass: "bg-[var(--danger)]",
      containerClass:
        "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]/20",
    },
  };

  const config = configs[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-badge)] text-xs font-medium border select-none transition-colors ${config.containerClass}`}
      role="status"
      aria-live="polite"
    >
      <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
      <span>{config.text}</span>
    </span>
  );
};
