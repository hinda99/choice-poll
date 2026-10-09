"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Share2,
  Check,
  Flame,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Poll } from "@/lib/types";

function PollVoteContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [voterName, setVoterName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Check localStorage for duplicate voting
  useEffect(() => {
    if (typeof window !== "undefined") {
      const alreadyVoted = localStorage.getItem(`voted_${id}`);
      if (alreadyVoted) {
        setHasVoted(true);
      }
    }
  }, [id]);

  // Real-time countdown timer if expiresAt is set
  useEffect(() => {
    if (!poll?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(poll.expiresAt!).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Voting Closed");
      } else {
        setIsExpired(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(
          `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [poll?.expiresAt]);

  // Initial fetch + real-time updates (via SSE & fallback polling)
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch initial poll
    fetch(`/api/polls/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Poll not found.");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setPoll(data.poll);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(err.message);
          setLoading(false);
        }
      });

    // 2. Real-time updates via EventSource (SSE)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/polls/${id}/stream`);
      eventSource.onmessage = (event) => {
        if (event.data && isMounted) {
          try {
            const updatedPoll = JSON.parse(event.data);
            setPoll(updatedPoll);
          } catch {
            // ignore non-json keepalive comments
          }
        }
      };
      eventSource.onerror = () => {
        // Fallback polling if SSE is not available
      };
    } catch {
      // SSE not supported
    }

    // 3. Fallback polling every 3 seconds to guarantee real-time updates
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/polls/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setPoll(data.poll);
          }
        }
      } catch {
        // ignore network hiccups
      }
    }, 3000);

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [id]);

  const handleToggleOption = (optionId: string, isEliminated: boolean) => {
    if (isEliminated) return;

    if (poll?.isMultipleChoice) {
      if (selectedOptionIds.includes(optionId)) {
        setSelectedOptionIds(selectedOptionIds.filter((item) => item !== optionId));
      } else {
        setSelectedOptionIds([...selectedOptionIds, optionId]);
      }
    } else {
      setSelectedOptionIds([optionId]);
    }
  };

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterName.trim()) {
      setErrorMsg("Please enter your full name before submitting your vote.");
      return;
    }

    if (selectedOptionIds.length === 0) {
      setErrorMsg("Please select at least one choice.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/polls/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionIds: selectedOptionIds,
          voterName: voterName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record vote.");
      }

      // Record in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `voted_${id}`,
          JSON.stringify({
            options: selectedOptionIds,
            voterName: voterName.trim(),
          })
        );
      }

      // Route directly to live results page
      router.push(`/poll/${id}/results`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Vote failed.";
      setErrorMsg(msg);
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading poll...</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Poll Not Found
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
          This poll may have been deleted or the link is incorrect.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition"
        >
          Create a New Poll
        </Link>
      </div>
    );
  }

  // Count available options in elimination mode
  const availableOptionsCount = poll.options.filter((o) => !o.isEliminated).length;
  const isMaxVotesReached = Boolean(
    poll.maxTotalVotes && poll.totalVotes >= poll.maxTotalVotes
  );
  const isLocked = isExpired || isMaxVotesReached;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top Banner / Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {poll.isEliminationMode && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              Single-Claim / Elimination
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Layers className="w-3.5 h-3.5" />
            {poll.isMultipleChoice ? "Multiple Choice" : "Single Choice"}
          </span>

          {poll.maxTotalVotes && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Users className="w-3.5 h-3.5" />
              <span>{poll.totalVotes}/{poll.maxTotalVotes} votes</span>
            </span>
          )}

          {poll.expiresAt && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                isExpired
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                  : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isExpired ? "Poll Expired" : `Closes in ${timeLeft}`}</span>
            </span>
          )}
        </div>

        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition hover:border-indigo-300 shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600">Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Poll</span>
            </>
          )}
        </button>
      </div>

      {/* Expired Poll Banner */}
      {isExpired && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950 dark:text-amber-200">
                This poll has closed
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-400">
                The voting time limit has passed. No new votes can be submitted.
              </p>
            </div>
          </div>
          <Link
            href={`/poll/${id}/results`}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs whitespace-nowrap transition shadow-sm"
          >
            View Results
          </Link>
        </div>
      )}

      {/* Max Votes Reached Banner */}
      {isMaxVotesReached && !isExpired && (
        <div className="mb-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                Vote Cap Reached ({poll.totalVotes}/{poll.maxTotalVotes})
              </p>
              <p className="text-xs text-indigo-700 dark:text-indigo-400">
                This poll reached its maximum total votes quota. Voting is locked.
              </p>
            </div>
          </div>
          <Link
            href={`/poll/${id}/results`}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs whitespace-nowrap transition shadow-sm"
          >
            View Live Results
          </Link>
        </div>
      )}

      {/* Already Voted Notice */}
      {hasVoted && !isLocked && (
        <div className="mb-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                You already voted in this poll
              </p>
              <p className="text-xs text-indigo-700 dark:text-indigo-400">
                Your vote was recorded from this browser.
              </p>
            </div>
          </div>
          <Link
            href={`/poll/${id}/results`}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs whitespace-nowrap transition shadow-sm"
          >
            View Live Results
          </Link>
        </div>
      )}

      {/* Main Poll Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
          {poll.question}
        </h1>

        {poll.isEliminationMode && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              Choices are eliminated when reaching max limit ({poll.maxPerOption || 5} per choice).
            </span>
            <span className="font-bold shrink-0 ml-2">
              {availableOptionsCount} of {poll.options.length} open
            </span>
          </div>
        )}

        <form onSubmit={handleVoteSubmit} className="mt-6 space-y-4">
          {/* Required Full Name Input */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <label
              htmlFor="voterName"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Your Full Name <span className="text-rose-500">*</span>
              </span>
            </label>
            <input
              id="voterName"
              type="text"
              required
              disabled={isExpired}
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              placeholder="Enter your full name (e.g. John Doe)"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50"
              maxLength={80}
            />
          </div>

          <div
            role={poll.isMultipleChoice ? "group" : "radiogroup"}
            aria-label={poll.question}
            className="space-y-3"
          >
          {poll.options.map((option) => {
            const limit = option.maxClaims || poll.maxPerOption || 1;
            const spotsRemaining = Math.max(0, limit - option.votes);
            const isFull = Boolean(option.isEliminated || spotsRemaining === 0);
            const isSelected = selectedOptionIds.includes(option.id);

            return (
              <div
                key={option.id}
                role={poll.isMultipleChoice ? "checkbox" : "radio"}
                aria-checked={isSelected}
                aria-disabled={isFull}
                tabIndex={isFull ? -1 : 0}
                onClick={() => handleToggleOption(option.id, isFull)}
                onKeyDown={(e) => {
                  if ((e.key === " " || e.key === "Enter") && !isFull) {
                    e.preventDefault();
                    handleToggleOption(option.id, isFull);
                  }
                }}
                className={`relative flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  isFull
                    ? "bg-slate-100/80 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800/80 opacity-60 cursor-not-allowed"
                    : isSelected
                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-500 shadow-md shadow-indigo-500/10"
                    : "bg-slate-50/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                  {/* Radio / Checkbox Indicator */}
                  <div
                    className={`w-5 h-5 rounded-${
                      poll.isMultipleChoice ? "md" : "full"
                    } border flex items-center justify-center shrink-0 transition ${
                      isFull
                        ? "border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800"
                        : isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    }`}
                  >
                    {isSelected && !isFull && (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </div>

                  <div>
                    <span
                      className={`text-sm sm:text-base font-semibold truncate block ${
                        isFull
                          ? "line-through text-slate-400 dark:text-slate-500"
                          : isSelected
                          ? "text-indigo-950 dark:text-indigo-100"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {option.text}
                    </span>
                    {poll.isEliminationMode && option.claimedBy && option.claimedBy.length > 0 && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-normal">
                        Claimed by: {option.claimedBy.join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badges */}
                {isFull ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                    Full ({option.votes}/{limit})
                  </span>
                ) : (
                  poll.isEliminationMode && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 shrink-0">
                      {spotsRemaining} {spotsRemaining === 1 ? "spot" : "spots"} left ({option.votes}/{limit})
                    </span>
                  )
                )}
              </div>
            );
          })}
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
              {errorMsg}
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href={`/poll/${id}/results`}
              className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 inline-flex items-center gap-1.5 transition"
            >
              <BarChart3 className="w-4 h-4" />
              <span>View Live Results without voting</span>
            </Link>

            <button
              type="submit"
              disabled={submitting || selectedOptionIds.length === 0 || isLocked || !voterName.trim()}
              className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Recording vote...</span>
                </>
              ) : isExpired ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Voting Ended (Time Expired)</span>
                </>
              ) : isMaxVotesReached ? (
                <>
                  <Users className="w-4 h-4" />
                  <span>Vote Quota Reached ({poll.maxTotalVotes} votes)</span>
                </>
              ) : (
                <>
                  <span>Submit Vote</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PollVotePage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto py-16 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading poll...</p>
        </div>
      }
    >
      <PollVoteContent params={props.params} />
    </Suspense>
  );
}
