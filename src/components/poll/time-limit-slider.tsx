"use client";

import React from "react";
import { Clock } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export const TIME_LIMIT_STEPS = [1, 2, 4, 8, 12, 24] as const;

export interface TimeLimitSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const TimeLimitSlider: React.FC<TimeLimitSliderProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useLanguage();

  const currentIndex = Math.max(
    0,
    TIME_LIMIT_STEPS.indexOf(value as (typeof TIME_LIMIT_STEPS)[number])
  );
  const percentage = (currentIndex / (TIME_LIMIT_STEPS.length - 1)) * 100;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Home") {
      e.preventDefault();
      onChange(TIME_LIMIT_STEPS[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(TIME_LIMIT_STEPS[TIME_LIMIT_STEPS.length - 1]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      if (currentIndex > 0) {
        onChange(TIME_LIMIT_STEPS[currentIndex - 1]);
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      if (currentIndex < TIME_LIMIT_STEPS.length - 1) {
        onChange(TIME_LIMIT_STEPS[currentIndex + 1]);
      }
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)]">
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--text)]">
        <span className="flex items-center gap-1.5 text-[var(--primary)] font-bold">
          <Clock className="w-4 h-4" />
          <span>{t.create.votingDuration}</span>
        </span>
        <span className="font-mono tabular-nums text-sm font-bold text-[var(--primary)]">
          {value}h
        </span>
      </div>

      {/* Slider input track */}
      <div className="relative py-1">
        <input
          type="range"
          min={0}
          max={TIME_LIMIT_STEPS.length - 1}
          step={1}
          value={currentIndex}
          disabled={disabled}
          onChange={(e) => {
            const nextIdx = Number(e.target.value);
            if (TIME_LIMIT_STEPS[nextIdx]) {
              onChange(TIME_LIMIT_STEPS[nextIdx]);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-label={t.create.votingDuration}
          aria-valuemin={TIME_LIMIT_STEPS[0]}
          aria-valuemax={TIME_LIMIT_STEPS[TIME_LIMIT_STEPS.length - 1]}
          aria-valuenow={value}
          aria-valuetext={`${value} hours`}
          className="choice-primary-slider"
          style={{
            background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, var(--border) ${percentage}%, var(--border) 100%)`,
          }}
        />
      </div>

      {/* Discrete Step marks */}
      <div
        className="flex items-center justify-between px-0.5 select-none"
        aria-hidden="true"
      >
        {TIME_LIMIT_STEPS.map((step) => {
          const isSelected = value === step;
          return (
            <button
              key={step}
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => onChange(step)}
              className={`flex flex-col items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors py-0.5 px-1 rounded-sm ${
                isSelected
                  ? "text-[var(--primary)] font-bold"
                  : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
              }`}
            >
              <span
                className={`w-1 h-1 rounded-full transition-transform ${
                  isSelected ? "bg-[var(--primary)] scale-150" : "bg-[var(--border)]"
                }`}
              />
              <span className="tabular-nums">{step}h</span>
            </button>
          );
        })}
      </div>

      {/* Meaning text */}
      <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1 border-t border-[var(--border)]">
        {t.create.closesAfterHoursNotice(value)}
      </p>
    </div>
  );
};
