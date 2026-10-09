"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Vote,
  Share2,
  Check,
  Crown,
  Plus,
  Lock,
  ArrowUpDown,
  ListOrdered,
  ShieldCheck,
} from "lucide-react";
import { Poll } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { VoteResultsBar } from "@/components/poll/vote-results-bar";
import { LiveConnectionStatus, ConnectionState } from "@/components/ui/live-connection-status";
import { useLanguage } from "@/lib/language-context";

function PollResultsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connected");

  // Optional sort toggle per Section 9 (Default: original choice order)
  const [sortByVotes, setSortByVotes] = useState(false);

  useEffect(() => {
    if (!poll?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(poll.expiresAt!).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(t.vote.votingClosed);
      } else {
        setIsExpired(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const pad = (n: number) => String(n).padStart(2, "0");
        setTimeLeft(
          hours > 0
            ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s`
            : `${pad(minutes)}m ${pad(seconds)}s`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [poll?.expiresAt, t.vote.votingClosed]);

  useEffect(() => {
    let isMounted = true;
    const fetchUrl = `/api/polls/${id}`;
    const streamUrl = `/api/polls/${id}/stream`;

    // 1. Initial fetch
    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(t.vote.pollNotFoundTitle);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setPoll(data.poll);
          setLoading(false);
          setLastUpdated(new Date());
          setConnectionState("connected");
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(err.message);
          setLoading(false);
          setConnectionState("disconnected");
        }
      });

    // 2. Real-time updates via EventSource (SSE)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(streamUrl);
      eventSource.onopen = () => {
        if (isMounted) setConnectionState("connected");
      };
      eventSource.onmessage = (event) => {
        if (event.data && isMounted) {
          try {
            const updatedPoll = JSON.parse(event.data);
            setPoll(updatedPoll);
            setLastUpdated(new Date());
            setConnectionState("connected");
          } catch {
            // keepalive
          }
        }
      };
      eventSource.onerror = () => {
        if (isMounted) setConnectionState("reconnecting");
      };
    } catch {
      // SSE unsupported
    }

    // 3. Fallback sync
    const interval = setInterval(async () => {
      try {
        const res = await fetch(fetchUrl);
        if (res.ok && isMounted) {
          const data = await res.json();
          setPoll(data.poll);
          setLastUpdated(new Date());
          setConnectionState("connected");
        }
      } catch {
        if (isMounted) setConnectionState("reconnecting");
      }
    }, 3500);

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [id, t.vote.pollNotFoundTitle]);

  const handleCopyLink = async () => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/poll/${id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      showToast(t.results.toastCopied);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto space-y-6 py-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-10 w-2/3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!poll) {
    return (
      <EmptyState
        title={t.vote.pollNotFoundTitle}
        description={errorMsg || t.results.unableToRetrieve}
        action={
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-5 rounded-[var(--radius-control)] bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            {t.vote.createPollBtn}
          </Link>
        }
        className="max-w-[660px] mx-auto py-16"
      />
    );
  }

  // Calculations: Differentiate total voters and total selections cast
  const totalVoters = poll.totalVotes;
  const totalSelections = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

  const highestVoteCount = Math.max(...poll.options.map((o) => o.votes), 0);
  const leadingOptions =
    highestVoteCount > 0
      ? poll.options.filter((o) => o.votes === highestVoteCount)
      : [];

  const isLeadingTie = leadingOptions.length > 1;
  const leadingChoiceText =
    highestVoteCount === 0
      ? "—"
      : isLeadingTie
      ? t.results.tie
      : leadingOptions[0]?.text || "—";

  const isMaxVotesReached = Boolean(
    poll.maxTotalVotes && poll.totalVotes >= poll.maxTotalVotes
  );
  const pollStatusLabel = isExpired
    ? t.vote.votingClosed
    : isMaxVotesReached
    ? t.vote.voteCapReached
    : t.results.open;

  // Sorting options: default original choice order, optional sort by votes
  const displayedOptions = [...poll.options];
  if (sortByVotes) {
    displayedOptions.sort((a, b) => b.votes - a.votes);
  }

  const calculationBase = totalVoters;

  return (
    <div className="max-w-[1000px] mx-auto space-y-8">
      {/* 1. Poll question + Top controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <LiveConnectionStatus status={connectionState} />
            <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
              {t.results.syncedAt(
                lastUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              )}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] leading-snug break-words">
            {poll.question}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href={`/poll/${id}`}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text)] transition-colors shadow-xs"
          >
            <Vote className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>{t.results.goToVoting}</span>
          </Link>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text)] transition-colors shadow-xs cursor-pointer focus-ring"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                <span className="text-[var(--success)]">{t.results.linkCopied}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>{t.results.shareVoterLink}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Three KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Total votes / Total voters */}
        <Card className="p-5 space-y-1 bg-[var(--surface)]">
          <span className="text-xs font-medium text-[var(--text-muted)] block">
            {poll.isMultipleChoice ? t.results.totalVoters : t.results.totalVotesCast}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-[var(--text)]">
              {totalVoters}
            </span>
            {poll.maxTotalVotes && (
              <span className="text-xs text-[var(--text-subtle)] font-mono tabular-nums">
                {t.results.submissionsMax(poll.maxTotalVotes)}
              </span>
            )}
          </div>
          {poll.isMultipleChoice && (
            <p className="text-[11px] text-[var(--text-subtle)] font-mono tabular-nums pt-0.5">
              {t.results.individualSelections(totalSelections)}
            </p>
          )}
        </Card>

        {/* KPI 2: Leading choice */}
        <Card className="p-5 space-y-1 bg-[var(--surface)]">
          <span className="text-xs font-medium text-[var(--text-muted)] block">
            {t.results.leadingChoice}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            {highestVoteCount > 0 && !isLeadingTie && (
              <Crown className="w-4 h-4 text-[var(--primary)] shrink-0" />
            )}
            <span className="text-xl sm:text-2xl font-bold text-[var(--text)] truncate">
              {leadingChoiceText}
            </span>
          </div>
          {isLeadingTie && highestVoteCount > 0 && (
            <p className="text-[11px] text-[var(--text-subtle)]">
              {t.results.tiedChoicesNotice(leadingOptions.length, highestVoteCount)}
            </p>
          )}
        </Card>

        {/* KPI 3: Poll status */}
        <Card className="p-5 space-y-1 bg-[var(--surface)]">
          <span className="text-xs font-medium text-[var(--text-muted)] block">
            {t.results.pollStatus}
          </span>
          <div className="flex items-center gap-2">
            {isExpired || isMaxVotesReached ? (
              <Badge variant="warning" className="text-xs font-bold py-1">
                <Lock className="w-3 h-3" />
                <span>{pollStatusLabel}</span>
              </Badge>
            ) : (
              <Badge variant="success" className="text-xs font-bold py-1">
                <span>{pollStatusLabel}</span>
              </Badge>
            )}
            {poll.expiresAt && !isExpired && (
              <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                {timeLeft}
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* 3. Vote distribution (Horizontal bars) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-[var(--text)] tracking-tight">
              {t.results.voteDistribution}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {poll.isMultipleChoice
                ? t.results.distributionMultiDesc
                : t.results.distributionSingleDesc}
            </p>
          </div>

          {/* Optional sort control */}
          <button
            type="button"
            onClick={() => setSortByVotes(!sortByVotes)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-badge)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer focus-ring"
          >
            {sortByVotes ? (
              <>
                <ListOrdered className="w-3.5 h-3.5" />
                <span>{t.results.sortVotes}</span>
              </>
            ) : (
              <>
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{t.results.sortOriginal}</span>
              </>
            )}
          </button>
        </div>

        {/* Empty state notice if zero votes */}
        {totalVoters === 0 && (
          <div className="p-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/60 border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <span>{t.results.noVotesYet}</span>
            <Link
              href={`/poll/${id}`}
              className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] hover:underline shrink-0"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>{t.results.castFirstVote}</span>
            </Link>
          </div>
        )}

        {/* Horizontal Bars */}
        <div className="space-y-2.5">
          {displayedOptions.map((option) => {
            const isLeading =
              highestVoteCount > 0 &&
              option.votes === highestVoteCount &&
              !isLeadingTie;

            return (
              <VoteResultsBar
                key={option.id}
                text={option.text}
                votes={option.votes}
                totalVotes={calculationBase}
                isLeading={isLeading}
                isEliminationMode={poll.isEliminationMode}
                maxClaims={option.maxClaims || poll.maxPerOption || 1}
                isEliminated={option.isEliminated}
                isMultipleChoice={poll.isMultipleChoice}
              />
            );
          })}
        </div>
      </div>

      {/* 4. Voter Privacy Disclosure */}
      <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-muted)]/50 border border-[var(--border)] text-center text-xs text-[var(--text-muted)] space-y-1">
        <p className="font-semibold text-[var(--text)]">
          {t.results.privateResultsTitle}
        </p>
        <p>
          {t.results.privateResultsDesc}
        </p>
      </div>

      {/* 5. Footer navigation */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
        <Link
          href={`/poll/${id}`}
          className="hover:text-[var(--primary)] transition-colors inline-flex items-center gap-1 font-medium"
        >
          <Vote className="w-3.5 h-3.5" />
          <span>{t.results.backToPoll}</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href={`/poll/${id}/owner`}
            className="hover:text-[var(--owner)] transition-colors inline-flex items-center gap-1 font-medium text-[var(--text-subtle)]"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t.results.ownerDashboardLink}</span>
          </Link>

          <Link
            href="/"
            className="hover:text-[var(--primary)] transition-colors inline-flex items-center gap-1 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.results.createNewPoll}</span>
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
        <div className="max-w-[1000px] mx-auto py-16 text-center">
          <div className="w-8 h-8 border-3 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-muted)]">Loading live results...</p>
        </div>
      }
    >
      <PollResultsContent params={props.params} />
    </Suspense>
  );
}
