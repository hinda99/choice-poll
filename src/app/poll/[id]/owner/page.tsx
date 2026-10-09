"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  BarChart2,
  Vote,
  ExternalLink,
} from "lucide-react";
import { Poll } from "@/lib/types";
import { OwnerPanel } from "@/components/owner/owner-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/language-context";

function PollOwnerContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const [adminKey, setAdminKey] = useState<string>("");
  const [inputKey, setInputKey] = useState<string>("");
  const [poll, setPoll] = useState<Poll | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const verifyAndFetch = async (keyToTest: string) => {
    if (!keyToTest) {
      setLoading(false);
      return;
    }
    setVerifying(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/polls/${id}?adminKey=${encodeURIComponent(keyToTest)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.owner.invalidKey);
      }
      if (data.isOwner) {
        setPoll(data.poll);
        setIsOwner(true);
        setAdminKey(keyToTest);
        if (typeof window !== "undefined") {
          localStorage.setItem(`poll_admin_${id}`, keyToTest);
        }
      } else {
        throw new Error(t.owner.invalidKey);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.owner.invalidKey;
      setErrorMsg(msg);
      setIsOwner(false);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const keyFromUrl = urlParams?.get("adminKey") || urlParams?.get("key");
    const keyFromStorage = typeof window !== "undefined" ? localStorage.getItem(`poll_admin_${id}`) : null;
    const initialKey = keyFromUrl || keyFromStorage || "";

    if (!initialKey) {
      Promise.resolve().then(() => {
        if (isMounted) setLoading(false);
      });
      return;
    }

    fetch(`/api/polls/${id}?adminKey=${encodeURIComponent(initialKey)}`)
      .then((res) => {
        if (!res.ok) throw new Error(t.owner.invalidKey);
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.isOwner) {
          setPoll(data.poll);
          setIsOwner(true);
          setAdminKey(initialKey);
          localStorage.setItem(`poll_admin_${id}`, initialKey);
        } else {
          setErrorMsg(t.owner.invalidKey);
          setIsOwner(false);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : t.owner.invalidKey;
        setErrorMsg(msg);
        setIsOwner(false);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, t.owner.invalidKey]);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    verifyAndFetch(inputKey.trim());
  };

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto space-y-6 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-2/3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Unauthorized State: Admin Key Required
  if (!isOwner || !poll) {
    return (
      <div className="max-w-[480px] mx-auto py-12 px-4 space-y-6">
        <Card className="p-6 sm:p-8 space-y-6 bg-[var(--surface)] text-center border border-[var(--border)]">
          <div className="w-12 h-12 rounded-full bg-[var(--owner)]/10 text-[var(--owner)] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
              {t.owner.title}
            </h1>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {t.owner.restrictedDesc}
            </p>
          </div>

          {errorMsg && (
            <InlineAlert variant="danger">
              {errorMsg}
            </InlineAlert>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4 text-left">
            <TextInput
              id="admin-key"
              label={t.owner.adminKeyLabel}
              type="password"
              required
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder={t.owner.adminKeyPlaceholder}
              autoComplete="off"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={verifying}
              disabled={!inputKey.trim() || verifying}
              className="w-full font-semibold text-sm"
            >
              <KeyRound className="w-4 h-4 mr-1.5" />
              <span>{t.owner.accessDashboardBtn}</span>
            </Button>
          </form>

          <div className="pt-4 border-t border-[var(--border)] flex flex-col gap-2 text-xs text-[var(--text-muted)]">
            <Link
              href={`/poll/${id}/results`}
              className="hover:text-[var(--primary)] transition-colors inline-flex items-center justify-center gap-1 font-medium"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{t.owner.viewPublicResultsInstead}</span>
            </Link>
            <Link
              href={`/poll/${id}`}
              className="hover:text-[var(--primary)] transition-colors inline-flex items-center justify-center gap-1 font-medium"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>{t.owner.goToVotingPage}</span>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Authorized Owner State
  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--owner)]/10 text-[var(--owner)] text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{t.owner.ownerHeaderBadge}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
              {t.owner.ownerSubtitle}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] leading-snug break-words">
            {poll.question}
          </h1>
        </div>

        {/* Quick Navigation to Voter Views */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href={`/poll/${id}/results`}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text)] transition-colors shadow-xs"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>{t.owner.viewPublicResults}</span>
            <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
          </Link>

          <Link
            href={`/poll/${id}`}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text)] transition-colors shadow-xs"
          >
            <Vote className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>{t.owner.openVotingPage}</span>
            <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
          </Link>
        </div>
      </div>

      {/* Main Owner Panel with Overview, Responses Table, and CSV Export */}
      <OwnerPanel poll={poll} adminKey={adminKey} />
    </div>
  );
}

export default function PollOwnerPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1000px] mx-auto py-16 text-center">
          <div className="w-8 h-8 border-3 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-muted)]">Loading owner dashboard...</p>
        </div>
      }
    >
      <PollOwnerContent params={props.params} />
    </Suspense>
  );
}
