"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Share2,
  Clock,
  Layers,
  Users,
  BarChart2,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Poll } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TextInput } from "@/components/ui/text-input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { PollOptionCard } from "@/components/poll/poll-option-card";
import { LiveConnectionStatus, ConnectionState } from "@/components/ui/live-connection-status";

function PollVoteContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { showToast } = useToast();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [voterName, setVoterName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [votedRecord, setVotedRecord] = useState<{
    voterName: string;
    optionIds: string[];
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [conflictMsg, setConflictMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connected");

  const [adminKey, setAdminKey] = useState<string>("");
  const [isOwner, setIsOwner] = useState<boolean>(false);

  // Check localStorage and URL query for owner adminKey
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const keyFromUrl = urlParams.get("adminKey");
      const keyFromStorage = localStorage.getItem(`poll_admin_${id}`);
      const effectiveKey = keyFromUrl || keyFromStorage || "";
      if (effectiveKey) {
        setTimeout(() => setAdminKey(effectiveKey), 0);
        if (keyFromUrl && !keyFromStorage) {
          localStorage.setItem(`poll_admin_${id}`, keyFromUrl);
        }
      }

      // Check if user has already voted
      const savedVote = localStorage.getItem(`voted_${id}`);
      if (savedVote) {
        try {
          const parsed = JSON.parse(savedVote);
          setTimeout(() => setVotedRecord(parsed), 0);
        } catch {
          setTimeout(() => setVotedRecord({ voterName: "You", optionIds: [] }), 0);
        }
      }
    }
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (!poll?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(poll.expiresAt!).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Voting closed");
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
  }, [poll?.expiresAt]);

  // Data fetching + SSE sync
  useEffect(() => {
    let isMounted = true;
    const effectiveKey =
      adminKey ||
      (typeof window !== "undefined"
        ? localStorage.getItem(`poll_admin_${id}`) || ""
        : "");

    const fetchUrl = effectiveKey
      ? `/api/polls/${id}?adminKey=${effectiveKey}`
      : `/api/polls/${id}`;
    const streamUrl = effectiveKey
      ? `/api/polls/${id}/stream?adminKey=${effectiveKey}`
      : `/api/polls/${id}/stream`;

    // Initial fetch
    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Poll not found.");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setPoll(data.poll);
          if (data.isOwner) setIsOwner(true);
          setLoading(false);
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

    // Real-time EventSource (SSE)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(streamUrl);
      eventSource.onopen = () => {
        if (isMounted) setConnectionState("connected");
      };
      eventSource.onmessage = (event) => {
        if (event.data && isMounted) {
          try {
            const updated = JSON.parse(event.data);
            setPoll(updated);
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
      // SSE not available
    }

    // Periodic sync
    const interval = setInterval(async () => {
      try {
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setPoll(data.poll);
            if (data.isOwner) setIsOwner(true);
            setConnectionState("connected");
          }
        }
      } catch {
        if (isMounted) setConnectionState("reconnecting");
      }
    }, 4000);

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [id, adminKey]);

  const handleToggleOption = (optionId: string) => {
    if (!poll) return;

    if (poll.isMultipleChoice) {
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
    setConflictMsg("");
    setErrorMsg("");

    const cleanName = voterName.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg("Please enter your name or nickname (at least 2 characters).");
      return;
    }

    if (selectedOptionIds.length === 0) {
      setErrorMsg("Please select at least one choice.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/polls/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionIds: selectedOptionIds,
          voterName: cleanName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error && data.error.includes("full")) {
          setConflictMsg(data.error);
          if (poll) {
            const stillOpen = selectedOptionIds.filter(
              (optId) => !data.error.includes(optId)
            );
            setSelectedOptionIds(stillOpen);
          }
        } else {
          throw new Error(data.error || "Failed to record vote.");
        }
        setSubmitting(false);
        return;
      }

      const record = {
        voterName: cleanName,
        optionIds: selectedOptionIds,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(`voted_${id}`, JSON.stringify(record));
      }
      setVotedRecord(record);
      showToast("Your vote was recorded!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Vote failed.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (typeof window !== "undefined") {
      const voterUrl = `${window.location.origin}/poll/${id}`;
      await navigator.clipboard.writeText(voterUrl);
      setCopiedLink(true);
      showToast("Voter link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Loading skeleton matching final question and cards
  if (loading) {
    return (
      <div className="max-w-[660px] mx-auto space-y-5 py-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-10 w-4/5" />
        <Card className="space-y-4 p-6 bg-[var(--surface)]">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      </div>
    );
  }

  // Poll not found empty state
  if (!poll) {
    return (
      <EmptyState
        title="Poll not found"
        description="This poll may have expired or the link is incorrect."
        action={
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-5 rounded-[var(--radius-control)] bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            Create a new poll
          </Link>
        }
        className="max-w-[660px] mx-auto py-16"
      />
    );
  }

  const isMaxVotesReached = Boolean(
    poll.maxTotalVotes && poll.totalVotes >= poll.maxTotalVotes
  );
  const isLocked = isExpired || isMaxVotesReached;

  return (
    <div className="max-w-[660px] mx-auto space-y-6">
      {/* Discreet Owner Banner if authorized */}
      {isOwner && (
        <div className="p-3.5 rounded-[var(--radius-control)] border border-[var(--owner)]/30 bg-[var(--warning-soft)]/50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--owner)]" />
            <span className="font-semibold text-[var(--owner)]">
              Owner preview
            </span>
            <span className="text-[var(--text-muted)] hidden sm:inline">
              — You have creator privileges
            </span>
          </div>
          <Link
            href={`/poll/${id}/results${adminKey ? `?adminKey=${adminKey}` : ""}`}
            className="font-bold text-[var(--owner)] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Owner results</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Status Bar Row beneath or above question */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Connection status */}
          <LiveConnectionStatus status={connectionState} />

          {/* Status badge */}
          {isLocked ? (
            <Badge variant="warning" className="gap-1">
              <Lock className="w-3 h-3" />
              <span>{isExpired ? "Voting closed" : "Vote cap reached"}</span>
            </Badge>
          ) : (
            <Badge variant="success">
              <span>Voting open</span>
            </Badge>
          )}

          {/* Mode */}
          <Badge variant="neutral" className="gap-1">
            <Layers className="w-3 h-3" />
            <span>{poll.isMultipleChoice ? "Multiple choice" : "Single choice"}</span>
          </Badge>

          {/* Quota */}
          {poll.maxTotalVotes && (
            <Badge variant="neutral" className="gap-1 font-mono">
              <Users className="w-3 h-3" />
              <span className="tabular-nums">
                {poll.totalVotes}/{poll.maxTotalVotes} submissions
              </span>
            </Badge>
          )}

          {/* Time Limit */}
          {poll.expiresAt && (
            <Badge
              variant={isExpired ? "danger" : "neutral"}
              className="gap-1 font-mono"
            >
              <Clock className="w-3 h-3" />
              <span className="tabular-nums">{timeLeft}</span>
            </Badge>
          )}
        </div>

        {/* Share voter link button */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-badge)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer focus-ring"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-[var(--success)]" />
              <span className="text-[var(--success)]">Link copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </>
          )}
        </button>
      </div>

      {/* Main Question Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] leading-snug">
          {poll.question}
        </h1>
      </div>

      {/* Closed Banners */}
      {isExpired && !votedRecord && (
        <InlineAlert variant="warning" title="Voting has closed">
          The time limit for this poll has expired. You can view the final results below.
        </InlineAlert>
      )}

      {isMaxVotesReached && !isExpired && !votedRecord && (
        <InlineAlert
          variant="warning"
          title={`Vote quota reached (${poll.totalVotes}/${poll.maxTotalVotes})`}
        >
          This poll reached its maximum vote capacity. New votes cannot be accepted.
        </InlineAlert>
      )}

      {/* Dedicated Confirmation Panel if user has already voted */}
      {votedRecord ? (
        <Card className="p-6 sm:p-8 space-y-6 text-center border-2 border-[var(--success)]/20 bg-[var(--surface)]">
          <div className="w-14 h-14 rounded-full bg-[var(--success-soft)] text-[var(--success)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
              Your vote was recorded
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
              Thank you, <strong className="text-[var(--text)]">{votedRecord.voterName}</strong>. Your response has been securely saved.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/poll/${id}/results${adminKey ? `?adminKey=${adminKey}` : ""}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[var(--radius-control)] bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors shadow-xs"
            >
              <BarChart2 className="w-4 h-4" />
              <span>View live results</span>
            </Link>

            <Button
              variant="secondary"
              size="lg"
              onClick={handleCopyLink}
              className="w-full sm:w-auto"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-[var(--success)]" />
                  <span>Voter link copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share poll</span>
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        /* Voting Form */
        <Card className="p-6 sm:p-8 space-y-6 bg-[var(--surface)]">
          <form onSubmit={handleVoteSubmit} className="space-y-6">
            {/* Name input with Privacy Disclosure using TextInput */}
            <TextInput
              id="voter-name"
              label="Your name or nickname"
              description="Your name is visible to this poll’s creator, not to other voters."
              required
              disabled={isLocked || submitting}
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              placeholder="Enter your name"
              maxLength={80}
            />

            {/* Answer Options */}
            <div className="space-y-3 pt-2 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text)]">
                  {poll.isMultipleChoice
                    ? "Choose one or more options"
                    : "Select one option"}
                </span>
                {poll.isEliminationMode && (
                  <span className="text-xs text-[var(--capacity)] font-medium">
                    Limited spots per choice
                  </span>
                )}
              </div>

              <div
                role={poll.isMultipleChoice ? "group" : "radiogroup"}
                aria-label={poll.question}
                className="space-y-2.5"
              >
                {poll.options.map((option) => (
                  <PollOptionCard
                    key={option.id}
                    id={option.id}
                    name={`poll-option-${id}`}
                    text={option.text}
                    isSelected={selectedOptionIds.includes(option.id)}
                    isMultipleChoice={poll.isMultipleChoice}
                    isEliminationMode={poll.isEliminationMode}
                    votes={option.votes}
                    maxClaims={option.maxClaims || poll.maxPerOption || 1}
                    isEliminated={option.isEliminated}
                    disabled={isLocked || submitting}
                    onToggle={() => handleToggleOption(option.id)}
                  />
                ))}
              </div>
            </div>

            {/* Conflict message */}
            {conflictMsg && (
              <InlineAlert variant="warning">
                {conflictMsg}
              </InlineAlert>
            )}

            {/* Error message */}
            {errorMsg && (
              <InlineAlert variant="danger">
                {errorMsg}
              </InlineAlert>
            )}

            {/* Primary Action Button */}
            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={submitting}
                disabled={
                  isLocked ||
                  submitting ||
                  selectedOptionIds.length === 0 ||
                  !voterName.trim()
                }
                className="w-full text-base font-semibold shadow-xs"
              >
                {isLocked ? (
                  <span>Voting closed</span>
                ) : (
                  <span>Submit vote</span>
                )}
              </Button>

              {/* Low-emphasis link beneath button */}
              <div className="text-center">
                <Link
                  href={`/poll/${id}/results${adminKey ? `?adminKey=${adminKey}` : ""}`}
                  className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors inline-flex items-center gap-1.5 focus-ring rounded-sm py-1"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>View live results</span>
                </Link>
              </div>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

export default function PollVotePage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-[660px] mx-auto py-16 text-center">
          <div className="w-8 h-8 border-3 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-muted)]">Loading poll...</p>
        </div>
      }
    >
      <PollVoteContent params={props.params} />
    </Suspense>
  );
}
