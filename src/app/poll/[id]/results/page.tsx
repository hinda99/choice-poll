"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Share2,
  Check,
  Flame,
  Award,
  Vote,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Users,
  FileSpreadsheet,
  Clock,
  Download,
  UserCheck,
} from "lucide-react";
import { Poll } from "@/lib/types";

function PollResultsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasVoted(Boolean(localStorage.getItem(`voted_${id}`)));
    }
  }, [id]);

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

  useEffect(() => {
    let isMounted = true;

    // 1. Initial fetch
    fetch(`/api/polls/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Poll not found.");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setPoll(data.poll);
          setLoading(false);
          setLastUpdated(new Date());
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
            setLastUpdated(new Date());
          } catch {
            // keepalive
          }
        }
      };
    } catch {
      // SSE not supported
    }

    // 3. Periodic fallback poll every 2.5s for seamless sync
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/polls/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setPoll(data.poll);
            setLastUpdated(new Date());
          }
        }
      } catch {
        // ignore
      }
    }, 2500);

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [id]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/poll/${id}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading live results...</p>
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
          {errorMsg || "Unable to retrieve poll details."}
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

  // Calculate percentages and leading option
  const totalVotesCast = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  const highestVoteCount = Math.max(...poll.options.map((o) => o.votes), 0);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Results
          </span>

          {poll.isEliminationMode && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              Claim Mode
            </span>
          )}

          {poll.maxTotalVotes && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                totalVotesCast >= poll.maxTotalVotes
                  ? "bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                  : "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                {totalVotesCast >= poll.maxTotalVotes
                  ? `Quota Full (${totalVotesCast}/${poll.maxTotalVotes})`
                  : `${totalVotesCast}/${poll.maxTotalVotes} votes`}
              </span>
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
              <span>{isExpired ? "Poll Ended" : `Closes in ${timeLeft}`}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export to Sheets Button */}
          <a
            href={`/api/polls/${id}/export`}
            download={`poll-${id}-results.csv`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm shadow-emerald-600/20"
            title="Download CSV for Google Sheets / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export to Sheets</span>
          </a>

          {!hasVoted && !isExpired && (
            <Link
              href={`/poll/${id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold text-xs border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Cast Your Vote</span>
            </Link>
          )}

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Results Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
          {poll.question}
        </h1>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {totalVotesCast} {totalVotesCast === 1 ? "vote" : "votes"} cast
            </span>
          </div>
          <span className="text-[11px]">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        </div>

        {/* Results Bars */}
        <div className="mt-6 space-y-4">
          {poll.options.map((option) => {
            const percentage =
              totalVotesCast > 0
                ? Math.round((option.votes / totalVotesCast) * 100)
                : 0;

            const isLeading =
              highestVoteCount > 0 && option.votes === highestVoteCount;

            const limit = option.maxClaims || poll.maxPerOption || 1;
            const isFull = Boolean(option.isEliminated || option.votes >= limit);

            return (
              <div
                key={option.id}
                className="relative overflow-hidden p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
              >
                {/* Background Progress Fill Bar */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
                    isFull
                      ? "bg-slate-300/40 dark:bg-slate-700/40"
                      : isLeading
                      ? "bg-indigo-500/15 dark:bg-indigo-500/25"
                      : "bg-slate-200/50 dark:bg-slate-700/30"
                  }`}
                  style={{ width: `${percentage}%` }}
                />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`font-semibold text-sm sm:text-base truncate ${
                        isFull
                          ? "line-through text-slate-400 dark:text-slate-500"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {option.text}
                    </span>

                    {isLeading && !isFull && totalVotesCast > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0">
                        <Award className="w-3 h-3" /> Leading
                      </span>
                    )}

                    {isFull && poll.isEliminationMode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300/50 dark:border-amber-800 shrink-0">
                        <Flame className="w-2.5 h-2.5 text-amber-600" /> Full ({option.votes}/{limit})
                      </span>
                    ) : (
                      poll.isEliminationMode && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                          {limit - option.votes} open ({option.votes}/{limit})
                        </span>
                      )
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 shrink-0">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {option.votes} {option.votes === 1 ? "vote" : "votes"}
                    </span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white min-w-[3rem] text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Voter Responses (Names & Choices) */}
        {poll.voteRecords && poll.voteRecords.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span>Voter Responses ({poll.voteRecords.length})</span>
              </h2>
              <a
                href={`/api/polls/${id}/export`}
                download={`poll-${id}-results.csv`}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV for Sheets</span>
              </a>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Voter Responses and Choices Log</caption>
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th scope="col" className="py-2.5 px-3 w-8">#</th>
                    <th scope="col" className="py-2.5 px-3">Voter Name</th>
                    <th scope="col" className="py-2.5 px-3">Selected Choice(s)</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {poll.voteRecords.map((rec, i) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-medium">
                        {i + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {rec.voterName}
                      </td>
                      <td className="py-2.5 px-3">
                        {rec.optionIds
                          .map(
                            (optId) =>
                              poll.options.find((o) => o.id === optId)?.text ||
                              optId
                          )
                          .join(", ")}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 whitespace-nowrap">
                        {new Date(rec.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href={`/poll/${id}`}
            className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5"
          >
            <Vote className="w-4 h-4" />
            <span>Go to Voting Screen</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-bold hover:bg-slate-800 dark:hover:bg-white transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Another Poll</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PollResultsPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto py-16 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading live results...</p>
        </div>
      }
    >
      <PollResultsContent params={props.params} />
    </Suspense>
  );
}
