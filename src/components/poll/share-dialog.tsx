"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, ShieldAlert, Eye, EyeOff, BarChart2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/language-context";

export interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pollId: string;
  creatorKey?: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  pollId,
  creatorKey,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [copiedVoter, setCopiedVoter] = useState(false);
  const [copiedOwner, setCopiedOwner] = useState(false);
  const [showOwnerSecret, setShowOwnerSecret] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const voterUrl = `${origin}/poll/${pollId}`;
  const ownerUrl = creatorKey
    ? `${origin}/poll/${pollId}/owner?adminKey=${creatorKey}`
    : "";

  const handleCopyVoter = async () => {
    if (!voterUrl) return;
    await navigator.clipboard.writeText(voterUrl);
    setCopiedVoter(true);
    showToast(t.shareDialog.toastVoterCopied);
    setTimeout(() => setCopiedVoter(false), 2000);
  };

  const handleCopyOwner = async () => {
    if (!ownerUrl) return;
    await navigator.clipboard.writeText(ownerUrl);
    setCopiedOwner(true);
    showToast(t.shareDialog.toastOwnerCopied, "warning");
    setTimeout(() => setCopiedOwner(false), 2000);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t.shareDialog.title}
      description={t.shareDialog.description}
    >
      <div className="space-y-6">
        {/* Public Voter Link Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {t.shareDialog.shareWithVoters}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={voterUrl}
              className="flex-1 h-11 px-3.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text)] text-sm font-mono focus:outline-none select-all"
            />
            <Button
              variant="primary"
              onClick={handleCopyVoter}
              className="shrink-0"
            >
              {copiedVoter ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>{t.shareDialog.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{t.shareDialog.copyLink}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2">
          <Link
            href={`/poll/${pollId}`}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text)] text-sm font-semibold transition-colors"
          >
            <span>{t.shareDialog.openVotingPage}</span>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </Link>
          <Link
            href={`/poll/${pollId}/results`}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text)] text-sm font-semibold transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>{t.shareDialog.viewResults}</span>
          </Link>
        </div>

        {/* Private Owner Link Section */}
        {creatorKey && (
          <div className="p-4 rounded-[var(--radius-control)] border border-[var(--warning)]/30 bg-[var(--warning-soft)]/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--warning)]">
                <ShieldAlert className="w-4 h-4" />
                <span>{t.shareDialog.ownerLinkTitle}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowOwnerSecret(!showOwnerSecret)}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1 cursor-pointer focus-ring"
              >
                {showOwnerSecret ? (
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
              {t.shareDialog.ownerLinkDesc}
            </p>

            <div className="flex items-center gap-2">
              <input
                type={showOwnerSecret ? "text" : "password"}
                readOnly
                value={ownerUrl}
                className="flex-1 h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs font-mono select-all focus:outline-none"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopyOwner}
                className="shrink-0"
              >
                {copiedOwner ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                    <span>{t.shareDialog.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t.shareDialog.copyOwnerLink}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
