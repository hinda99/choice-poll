import React from "react";
import { AlertCircle } from "lucide-react";

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
  showCounter?: boolean;
  maxLength?: number;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      id,
      label,
      description,
      error,
      showCounter = false,
      maxLength,
      value,
      className = "",
      disabled = false,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const errorId = `${inputId}-error`;
    const descId = `${inputId}-desc`;

    const valLength = typeof value === "string" ? value.length : 0;

    return (
      <div className="space-y-1.5 w-full">
        {/* Label row */}
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-[var(--text)] block"
          >
            {label}
          </label>
        </div>

        {/* Input field */}
        <input
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={
            error ? errorId : description ? descId : undefined
          }
          className={`w-full h-11 px-3.5 rounded-[var(--radius-control)] border bg-[var(--surface)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? "border-[var(--danger)] ring-1 ring-[var(--danger)]"
              : "border-[var(--border)]"
          } ${className}`}
          {...props}
        />

        {/* Bottom row: Description, error, and counter */}
        <div className="flex items-start justify-between gap-2 text-xs min-h-[1.25rem]">
          <div className="flex-1">
            {error ? (
              <p
                id={errorId}
                role="alert"
                className="text-[var(--danger)] font-medium flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            ) : description ? (
              <p id={descId} className="text-[var(--text-muted)] leading-relaxed">
                {description}
              </p>
            ) : null}
          </div>

          {showCounter && maxLength && (
            <span
              className={`font-mono tabular-nums text-right shrink-0 select-none ${
                valLength >= maxLength * 0.9
                  ? "text-[var(--danger)] font-bold"
                  : "text-[var(--text-subtle)]"
              }`}
            >
              {valLength} / {maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

TextInput.displayName = "TextInput";
