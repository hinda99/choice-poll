"use client";

import React from "react";
import { Check, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";

export interface PollOptionCardProps {
  id: string;
  name?: string;
  text: string;
  isSelected: boolean;
  isMultipleChoice: boolean;
  isEliminationMode: boolean;
  votes: number;
  maxClaims?: number;
  isEliminated: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const PollOptionCard: React.FC<PollOptionCardProps> = ({
  id,
  name = "choice-option",
  text,
  isSelected,
  isMultipleChoice,
  isEliminationMode,
  votes,
  maxClaims = 1,
  isEliminated,
  onToggle,
  disabled = false,
}) => {
  const { t } = useLanguage();
  const spotsRemaining = Math.max(0, maxClaims - votes);
  const isFull = isEliminated || (isEliminationMode && spotsRemaining === 0);
  const isNearLimit = isEliminationMode && spotsRemaining === 1 && !isFull;
  const isInteractive = !disabled && !isFull;
  const hasBadge = isFull || isEliminationMode;

  return (
    <label
      htmlFor={`option-${id}`}
      className={`relative flex items-start gap-3 sm:gap-3.5 p-3.5 sm:p-4 rounded-[var(--radius-card)] transition-all select-none border ${
        !isInteractive
          ? "bg-[var(--surface-muted)]/60 border-[var(--border)] opacity-60 cursor-not-allowed"
          : isSelected
          ? "bg-[var(--primary-soft)] border-2 border-[var(--primary)] shadow-xs cursor-pointer"
          : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--text-subtle)] hover:bg-[var(--surface-muted)]/40 cursor-pointer"
      } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--primary)] has-[:focus-visible]:ring-offset-2`}
    >
      {/* Real native accessible input */}
      <input
        id={`option-${id}`}
        type={isMultipleChoice ? "checkbox" : "radio"}
        name={name}
        value={id}
        checked={isSelected}
        disabled={!isInteractive}
        onChange={() => {
          if (isInteractive) {
            onToggle();
          }
        }}
        className="sr-only"
        aria-label={`${text}${isFull ? ` (${t.pollOption.full})` : ""}`}
      />

      {/* Custom indicator styled to match tokens */}
      <div
        className={`w-5 h-5 mt-0.5 flex items-center justify-center shrink-0 transition-colors border ${
          isMultipleChoice ? "rounded-[6px]" : "rounded-full"
        } ${
          isFull
            ? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-subtle)]"
            : isSelected
            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
            : "border-[var(--border)] bg-[var(--surface)]"
        }`}
        aria-hidden="true"
      >
        {isFull ? (
          <Lock className="w-3 h-3 text-[var(--text-subtle)]" />
        ) : isSelected ? (
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        ) : null}
      </div>

      {/* Content area: Choice text + Badge */}
      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3">
        <span
          className={`text-sm sm:text-base font-semibold block leading-snug break-words ${
            isFull
              ? "text-[var(--text-muted)] line-through"
              : isSelected
              ? "text-[var(--primary)] dark:text-[var(--text)]"
              : "text-[var(--text)]"
          }`}
        >
          {text}
        </span>

        {/* Spot countdown and capacity state */}
        {hasBadge && (
          <div className="shrink-0 self-start sm:self-center">
            {isFull ? (
              <Badge variant="neutral" className="gap-1 font-semibold text-[11px] sm:text-xs">
                <Lock className="w-3 h-3" />
                <span>{t.pollOption.full}</span>
              </Badge>
            ) : isEliminationMode ? (
              isNearLimit ? (
                <Badge variant="warning" className="font-semibold text-[11px] sm:text-xs">
                  <span>{t.pollOption.oneSpotRemaining}</span>
                </Badge>
              ) : (
                <Badge variant="capacity" className="font-semibold text-[11px] sm:text-xs">
                  <span>{t.pollOption.spotsRemaining(spotsRemaining, maxClaims)}</span>
                </Badge>
              )
            ) : null}
          </div>
        )}
      </div>
    </label>
  );
};
