"use client";

import React from "react";
import { Crown, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface VoteResultsBarProps {
  text: string;
  votes: number;
  totalVotes: number;
  isLeading: boolean;
  isEliminationMode: boolean;
  maxClaims?: number;
  isEliminated?: boolean;
  isMultipleChoice?: boolean;
}

export const VoteResultsBar: React.FC<VoteResultsBarProps> = ({
  text,
  votes,
  totalVotes,
  isLeading,
  isEliminationMode,
  maxClaims = 1,
  isEliminated = false,
  isMultipleChoice = false,
}) => {
  const numPercentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
  const percentage = numPercentage.toFixed(1);
  const isFull = isEliminated || (isEliminationMode && votes >= maxClaims);

  const denominator = isMultipleChoice ? "of voters" : "of votes";

  return (
    <div className="space-y-2 p-3.5 sm:p-4 rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border)] transition-colors shadow-xs">
      {/* Row Header */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`font-semibold truncate block ${
              isFull ? "text-[var(--text-muted)] line-through" : "text-[var(--text)]"
            }`}
          >
            {text}
          </span>

          {/* Leader crown badge */}
          {isLeading && votes > 0 && (
            <Badge
              variant="neutral"
              className="gap-1 text-[var(--primary)] font-semibold shrink-0"
            >
              <Crown className="w-3 h-3 text-[var(--primary)]" />
              <span>Leader</span>
            </Badge>
          )}

          {/* Distinct capacity claim badge (never combined with vote share) */}
          {isEliminationMode && (
            <div className="shrink-0">
              {isFull ? (
                <Badge variant="neutral" className="gap-1 font-semibold">
                  <Lock className="w-3 h-3" />
                  <span>Full ({votes}/{maxClaims})</span>
                </Badge>
              ) : (
                <Badge variant="capacity" className="font-semibold">
                  <span>{votes}/{maxClaims} claimed</span>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Numeric metric with explicit denominator */}
        <div className="flex items-baseline gap-2 shrink-0 text-right">
          <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
            {votes} {votes === 1 ? "vote" : "votes"}
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[var(--text)] min-w-[4rem]">
            {percentage}%{" "}
            <span className="text-[11px] font-normal text-[var(--text-muted)]">
              {denominator}
            </span>
          </span>
        </div>
      </div>

      {/* Horizontal Bar with 200-300ms easing and reduced motion support */}
      <div className="h-3 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden relative">
        <div
          role="progressbar"
          aria-valuenow={numPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${text}: ${votes} votes, ${percentage}% ${denominator}`}
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${
            isLeading && votes > 0
              ? "bg-[var(--primary)]"
              : votes > 0
              ? "bg-[var(--primary)]/60 dark:bg-[var(--primary)]/50"
              : "bg-transparent"
          }`}
          style={{ width: `${numPercentage}%` }}
        />
      </div>
    </div>
  );
};
