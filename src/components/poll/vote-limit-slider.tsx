"use client";

import React from "react";
import { Users } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export const VOTE_LIMIT_STEPS = [10, 25, 50, 100, 150, 200] as const;

export interface VoteLimitSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const VoteLimitSlider: React.FC<VoteLimitSliderProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useLanguage();

  const currentIndex = Math.max(
    0,
    VOTE_LIMIT_STEPS.indexOf(value as (typeof VOTE_LIMIT_STEPS)[number])
  );
  const percentage = (currentIndex / (VOTE_LIMIT_STEPS.length - 1)) * 100;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Home") {
      e.preventDefault();
      onChange(VOTE_LIMIT_STEPS[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(VOTE_LIMIT_STEPS[VOTE_LIMIT_STEPS.length - 1]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      if (currentIndex > 0) {
        onChange(VOTE_LIMIT_STEPS[currentIndex - 1]);
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      if (currentIndex < VOTE_LIMIT_STEPS.length - 1) {
        onChange(VOTE_LIMIT_STEPS[currentIndex + 1]);
      }
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)]">
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--text)]">
        <span className="flex items-center gap-1.5 text-[var(--primary)] font-bold">
          <Users className="w-4 h-4" />
          <span>{t.create.closesAfter}</span>
        </span>
        <span className="font-mono tabular-nums text-sm font-bold text-[var(--primary)]">
          {t.create.submissionsCount(value)}
        </span>
      </div>

      {/* Slider input track */}
      <div className="relative py-1">
        <input
          type="range"
          min={0}
          max={VOTE_LIMIT_STEPS.length - 1}
          step={1}
          value={currentIndex}
          disabled={disabled}
          onChange={(e) => {
            const nextIdx = Number(e.target.value);
            if (VOTE_LIMIT_STEPS[nextIdx]) {
              onChange(VOTE_LIMIT_STEPS[nextIdx]);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-label={t.create.closesAfter}
          aria-valuemin={VOTE_LIMIT_STEPS[0]}
          aria-valuemax={VOTE_LIMIT_STEPS[VOTE_LIMIT_STEPS.length - 1]}
          aria-valuenow={value}
          aria-valuetext={t.create.submissionsCount(value)}
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
        {VOTE_LIMIT_STEPS.map((step) => {
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
              <span className="tabular-nums">{step}</span>
            </button>
          );
        })}
      </div>

      {/* Meaning text */}
      <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1 border-t border-[var(--border)]">
        {t.create.closesAfterNotice(value)}
      </p>
    </div>
  );
};
