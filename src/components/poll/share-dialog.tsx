"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, ShieldAlert, Eye, EyeOff, BarChart2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

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
  const { showToast } = useToast();
  const [copiedVoter, setCopiedVoter] = useState(false);
  const [copiedOwner, setCopiedOwner] = useState(false);
  const [showOwnerSecret, setShowOwnerSecret] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const voterUrl = `${origin}/poll/${pollId}`;
  const ownerUrl = creatorKey
    ? `${origin}/poll/${pollId}/results?adminKey=${creatorKey}`
    : "";

  const handleCopyVoter = async () => {
    if (!voterUrl) return;
    await navigator.clipboard.writeText(voterUrl);
    setCopiedVoter(true);
    showToast("Voter link copied to clipboard");
    setTimeout(() => setCopiedVoter(false), 2000);
  };

  const handleCopyOwner = async () => {
    if (!ownerUrl) return;
    await navigator.clipboard.writeText(ownerUrl);
    setCopiedOwner(true);
    showToast("Secret owner link copied to clipboard", "warning");
    setTimeout(() => setCopiedOwner(false), 2000);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Poll created successfully"
      description="Your poll is ready for voting. Share the voter link with participants."
    >
      <div className="space-y-6">
        {/* Public Voter Link Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Share with voters (Public)
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
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy link</span>
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
            <span>Open voting page</span>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </Link>
          <Link
            href={`/poll/${pollId}/results`}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text)] text-sm font-semibold transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>View results</span>
          </Link>
        </div>

        {/* Private Owner Link Section */}
        {creatorKey && (
          <div className="p-4 rounded-[var(--radius-control)] border border-[var(--warning)]/30 bg-[var(--warning-soft)]/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--warning)]">
                <ShieldAlert className="w-4 h-4" />
                <span>Owner link · Keep private</span>
              </span>
              <button
                type="button"
                onClick={() => setShowOwnerSecret(!showOwnerSecret)}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1 cursor-pointer focus-ring"
              >
                {showOwnerSecret ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Conceal</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Anyone with this owner link may access administrative controls, voter names, and CSV export. Bookmark or save this link.
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
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy owner link</span>
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
