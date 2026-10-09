"use client";

import React from "react";
import { Sliders } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export interface CapacitySliderProps {
  value: number; // 1 to 10
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const CapacitySlider: React.FC<CapacitySliderProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useLanguage();
  const percentage = ((value - 1) / 9) * 100;

  const helperText =
    value === 1
      ? t.capacitySlider.singleVoter
      : t.capacitySlider.multiVoters(value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Home") {
      e.preventDefault();
      onChange(1);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(10);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)]">
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--text)]">
        <span className="flex items-center gap-1.5 text-[var(--capacity)] font-bold">
          <Sliders className="w-4 h-4" />
          <span>{t.capacitySlider.title}</span>
        </span>
        <span className="font-mono tabular-nums text-sm font-bold text-[var(--capacity)]">
          {value}{" "}
          <span className="text-[var(--text-subtle)] font-normal text-xs">/ 10</span>
        </span>
      </div>

      {/* Slider input track */}
      <div className="relative py-1">
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          onKeyDown={handleKeyDown}
          aria-label={t.capacitySlider.ariaLabel}
          aria-valuemin={1}
          aria-valuemax={10}
          aria-valuenow={value}
          aria-valuetext={helperText}
          className="choice-capacity-slider"
          style={{
            background: `linear-gradient(to right, var(--capacity) 0%, var(--capacity) ${percentage}%, var(--border) ${percentage}%, var(--border) 100%)`,
          }}
        />
      </div>

      {/* Discrete Step marks 1 through 10 */}
      <div
        className="flex items-center justify-between px-0.5 select-none"
        aria-hidden="true"
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => {
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
                  ? "text-[var(--capacity)] font-bold"
                  : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
              }`}
            >
              <span
                className={`w-1 h-1 rounded-full transition-transform ${
                  isSelected ? "bg-[var(--capacity)] scale-150" : "bg-[var(--border)]"
                }`}
              />
              <span className="tabular-nums">{step}</span>
            </button>
          );
        })}
      </div>

      {/* Meaning text */}
      <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1 border-t border-[var(--border)]">
        {helperText} {t.capacitySlider.disclaimer}
      </p>
    </div>
  );
};
