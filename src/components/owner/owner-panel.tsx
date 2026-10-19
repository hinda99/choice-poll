"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Poll } from "@/lib/types";
import { ResponseTable } from "./response-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  ShieldCheck,
  ListOrdered,
  Share2,
  Download,
  FileSpreadsheet,
  Copy,
  Check,
  Eye,
  EyeOff,
  Vote,
  ExternalLink,
  BarChart2,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export interface OwnerPanelProps {
  poll: Poll;
  adminKey: string;
}

export const OwnerPanel: React.FC<OwnerPanelProps> = ({ poll, adminKey }) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "responses" | "share">(
    "overview"
  );
  const [copiedVoter, setCopiedVoter] = useState(false);
  const [copiedOwner, setCopiedOwner] = useState(false);
  const [showSecretOwnerLink, setShowSecretOwnerLink] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const voterUrl = `${origin}/poll/${poll.id}`;
  const ownerUrl = `${origin}/poll/${poll.id}/owner?adminKey=${adminKey}`;

  const handleCopyVoter = async () => {
    await navigator.clipboard.writeText(voterUrl);
    setCopiedVoter(true);
    showToast(t.owner.toastVoterCopied);
    setTimeout(() => setCopiedVoter(false), 2000);
  };

  const handleCopyOwner = async () => {
    await navigator.clipboard.writeText(ownerUrl);
    setCopiedOwner(true);
    showToast(t.owner.toastOwnerCopied, "warning");
    setTimeout(() => setCopiedOwner(false), 2000);
  };

  const responseCount = poll.voteRecords ? poll.voteRecords.length : 0;

  return (
    <Card className="mt-8 border border-[var(--owner)]/30 bg-[var(--surface)]">
      {/* Header with Owner badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <Badge variant="owner" className="py-1 px-2.5 gap-1.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-[var(--owner)]" />
            <span>{t.owner.ownerControls}</span>
          </Badge>
          <span className="text-xs text-[var(--text-muted)]">
            {t.owner.privateManagementNotice}
          </span>
        </div>

        {/* 3 Tabs */}
        <div
          role="tablist"
          className="inline-flex items-center p-1 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {t.owner.tabOverview}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "responses"}
            onClick={() => setActiveTab("responses")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "responses"
                ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>{t.owner.tabResponses(responseCount)}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "share"}
            onClick={() => setActiveTab("share")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "share"
                ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t.owner.tabShare}</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="pt-5">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)]">
                <span className="text-xs text-[var(--text-muted)] block">
                  {t.owner.totalVotersRecorded}
                </span>
                <span className="text-xl font-bold font-mono tabular-nums text-[var(--text)] block mt-1">
                  {responseCount}
                </span>
              </div>
              <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)]">
                <span className="text-xs text-[var(--text-muted)] block">
                  {t.owner.pollMode}
                </span>
                <span className="text-sm font-semibold text-[var(--text)] block mt-1">
                  {poll.isEliminationMode
                    ? t.owner.modeElimination(poll.maxPerOption || 1)
                    : poll.isMultipleChoice
                    ? t.owner.modeMultiple
                    : t.owner.modeSingle}
                </span>
              </div>
              <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)]">
                <span className="text-xs text-[var(--text-muted)] block">
                  {t.owner.totalVoteLimit}
                </span>
                <span className="text-sm font-semibold text-[var(--text)] block mt-1">
                  {poll.maxTotalVotes ? t.owner.voteLimitCount(poll.maxTotalVotes) : t.owner.noLimit}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <Link
                href={`/poll/${poll.id}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text)] transition-colors"
              >
                <Vote className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>{t.owner.openVoterView}</span>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
              </Link>

              <Link
                href={`/poll/${poll.id}/results`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text)] transition-colors"
              >
                <BarChart2 className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>{t.owner.viewVoterResults}</span>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
              </Link>

              <a
                href={`/api/polls/${poll.id}/export?format=xlsx&adminKey=${adminKey}`}
                download={`poll-${poll.id}-results.xlsx`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-control)] border border-[var(--success)]/40 bg-[var(--success-soft)] hover:bg-[var(--success)]/20 text-xs font-semibold text-[var(--success-text,#166534)] dark:text-[var(--success)] transition-colors"
                title={t.owner.exportResponsesExcelDesc}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--success)]" />
                <span>{t.common.downloadExcel}</span>
              </a>

              <a
                href={`/api/polls/${poll.id}/export?adminKey=${adminKey}`}
                download={`poll-${poll.id}-results.csv`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>{t.common.downloadCsv}</span>
              </a>
              <span className="text-xs text-[var(--text-muted)] hidden md:inline">
                {t.owner.exportResponsesExcelDesc}
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: RESPONSES */}
        {activeTab === "responses" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
              <span>{t.owner.namesAndChoicesSubmitted}</span>
              <div className="flex items-center gap-3">
                <a
                  href={`/api/polls/${poll.id}/export?format=xlsx&adminKey=${adminKey}`}
                  download={`poll-${poll.id}-results.xlsx`}
                  className="text-[var(--success)] hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{t.common.downloadExcel}</span>
                </a>
                <span className="text-[var(--border)]">|</span>
                <a
                  href={`/api/polls/${poll.id}/export?adminKey=${adminKey}`}
                  download={`poll-${poll.id}-results.csv`}
                  className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.common.downloadCsv}</span>
                </a>
              </div>
            </div>
            <ResponseTable
              records={poll.voteRecords || []}
              options={poll.options}
            />
          </div>
        )}

        {/* TAB 3: SHARE & EXPORT */}
        {activeTab === "share" && (
          <div className="space-y-5">
            {/* Clean Voter Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                {t.owner.cleanVoterLink}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={voterUrl}
                  className="flex-1 min-w-0 h-10 px-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text)] text-xs font-mono select-all focus:outline-none"
                />
                <Button size="sm" variant="secondary" onClick={handleCopyVoter} className="shrink-0">
                  {copiedVoter ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                      <span>{t.common.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.common.copy}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Public Results Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                {t.owner.publicResultsLink}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${origin}/poll/${poll.id}/results`}
                  className="flex-1 min-w-0 h-10 px-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text)] text-xs font-mono select-all focus:outline-none"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${origin}/poll/${poll.id}/results`);
                    showToast(t.owner.toastPublicCopied);
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.common.copy}</span>
                </Button>
              </div>
            </div>

            {/* Secret Owner Link */}
            <div className="p-4 rounded-[var(--radius-control)] border border-[var(--owner)]/30 bg-[var(--warning-soft)]/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--owner)] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.owner.secretOwnerLinkTitle}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowSecretOwnerLink(!showSecretOwnerLink)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] inline-flex items-center gap-1 cursor-pointer focus-ring"
                >
                  {showSecretOwnerLink ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>{t.shareDialog.conceal}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t.shareDialog.reveal}</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {t.owner.secretOwnerLinkDesc}
              </p>

              <div className="flex items-center gap-2">
                <input
                  type={showSecretOwnerLink ? "text" : "password"}
                  readOnly
                  value={ownerUrl}
                  className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs font-mono select-all focus:outline-none"
                />
                <Button size="sm" variant="secondary" onClick={handleCopyOwner} className="shrink-0">
                  {copiedOwner ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                      <span>{t.common.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.common.copy}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Excel & CSV Export */}
            <div className="pt-2 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-[var(--text)] block">
                  {t.owner.exportResponsesExcel}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {t.owner.exportResponsesExcelDesc}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={`/api/polls/${poll.id}/export?format=xlsx&adminKey=${adminKey}`}
                  download={`poll-${poll.id}-results.xlsx`}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-control)] bg-[var(--success)] hover:bg-[var(--success)]/90 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                  <span>{t.common.downloadExcel}</span>
                </a>
                <a
                  href={`/api/polls/${poll.id}/export?adminKey=${adminKey}`}
                  download={`poll-${poll.id}-results.csv`}
                  className="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.common.downloadCsv}</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
