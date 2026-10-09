import React, { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  description?: string;
  error?: string;
  showCounter?: boolean;
  maxLength?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id,
      label,
      description,
      error,
      showCounter = false,
      maxLength,
      value,
      onChange,
      rows = 2,
      className = "",
      disabled = false,
      ...props
    },
    ref
  ) => {
    const inputId = id || `textarea-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const errorId = `${inputId}-error`;
    const descId = `${inputId}-desc`;

    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const combinedRef = (node: HTMLTextAreaElement) => {
      internalRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    };

    // Autosize within reasonable limits (min 60px, max 160px)
    useEffect(() => {
      const textarea = internalRef.current;
      if (!textarea) return;
      textarea.style.height = "auto";
      const nextHeight = Math.min(Math.max(textarea.scrollHeight, 68), 160);
      textarea.style.height = `${nextHeight}px`;
    }, [value]);

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

        {/* Textarea field */}
        <textarea
          ref={combinedRef}
          id={inputId}
          value={value}
          maxLength={maxLength}
          rows={rows}
          disabled={disabled}
          onChange={onChange}
          aria-invalid={!!error}
          aria-describedby={
            error ? errorId : description ? descId : undefined
          }
          className={`w-full p-3.5 rounded-[var(--radius-control)] border bg-[var(--surface)] text-[var(--text)] text-base placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? "border-[var(--danger)] ring-1 ring-[var(--danger)]"
              : "border-[var(--border)]"
          } ${className}`}
          {...props}
        />

        {/* Bottom row: Description, error, and counter (below/right per Section 6.3) */}
        <div className="flex items-start justify-between gap-3 text-xs min-h-[1.25rem]">
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

Textarea.displayName = "Textarea";
