"use client";

import React, { useState, useRef } from "react";
import { Plus, Trash2, ArrowRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { InlineAlert } from "@/components/ui/inline-alert";
import { PageHeading } from "@/components/ui/page-heading";
import { CapacitySlider } from "@/components/poll/capacity-slider";
import { ShareDialog } from "@/components/poll/share-dialog";

export default function CreatePollPage() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [isEliminationMode, setIsEliminationMode] = useState(false);
  const [maxPerOption, setMaxPerOption] = useState<number>(3);
  const [hasMaxVotes, setHasMaxVotes] = useState(false);
  const [maxTotalVotes, setMaxTotalVotes] = useState<number>(50);
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeLimitHours, setTimeLimitHours] = useState<number>(24);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    question?: string;
    options?: string;
  }>({});

  const [createdPollId, setCreatedPollId] = useState<string | null>(null);
  const [createdAdminKey, setCreatedAdminKey] = useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const choiceInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleAddOption = () => {
    if (options.length < 25) {
      setOptions([...options, ""]);
      setTimeout(() => {
        const nextIndex = options.length;
        choiceInputRefs.current[nextIndex]?.focus();
      }, 50);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, idx) => idx !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
    if (fieldErrors.options) {
      setFieldErrors((prev) => ({ ...prev, options: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const errors: { question?: string; options?: string } = {};

    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      errors.question = "Please enter a question for your poll.";
    } else if (cleanQuestion.length > 300) {
      errors.question = "Question cannot exceed 300 characters.";
    }

    const cleanOptions = options
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);

    if (cleanOptions.length < 2) {
      errors.options = "Please provide at least 2 non-empty choices.";
    } else if (cleanOptions.length > 25) {
      errors.options = "You can add at most 25 choices.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.question) {
        questionInputRef.current?.focus();
      } else if (errors.options) {
        choiceInputRefs.current[0]?.focus();
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          options: cleanOptions,
          isMultipleChoice,
          isEliminationMode,
          maxPerOption: isEliminationMode ? maxPerOption : undefined,
          maxTotalVotes: hasMaxVotes ? maxTotalVotes : undefined,
          timeLimitHours: hasTimeLimit ? timeLimitHours : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create poll.");
      }

      // Store creator flag and admin key in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(`created_${data.poll.id}`, "true");
        if (data.creatorKey) {
          localStorage.setItem(`poll_admin_${data.poll.id}`, data.creatorKey);
        }
      }

      setCreatedPollId(data.poll.id);
      setCreatedAdminKey(data.creatorKey || null);
      setIsShareDialogOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMinChoices = options.length <= 2;
  const isMaxChoices = options.length >= 25;

  return (
    <div className="space-y-8">
      {/* Page Heading per Section 6.1 & 7 */}
      <PageHeading
        title="Create a poll"
        subtitle="Ask a question, set the rules, and share instantly."
      />

      <form onSubmit={handleSubmit} noValidate>
        {/* Desktop 2-column layout (720-760px main, 300-340px rules) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] gap-8 items-start">
          {/* LEFT COLUMN: Question & Choices (Dominant area) */}
          <div className="space-y-6">
            <Card className="space-y-6 bg-[var(--surface)]">
              {/* Question Field using reusable Textarea */}
              <Textarea
                ref={questionInputRef}
                label="Your question"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  if (fieldErrors.question) {
                    setFieldErrors((prev) => ({ ...prev, question: undefined }));
                  }
                }}
                maxLength={300}
                showCounter={true}
                placeholder="What should we decide?"
                error={fieldErrors.question}
              />

              {/* Choices Field */}
              <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[var(--text)]">
                    Answer choices
                  </label>
                  <span className="text-xs text-[var(--text-subtle)] font-mono tabular-nums">
                    {options.length} / 25 choices
                  </span>
                </div>

                <div className="space-y-2.5">
                  {options.map((option, idx) => {
                    const formattedIndex = String(idx + 1).padStart(2, "0");
                    return (
                      <div key={idx} className="flex items-center gap-2.5 group">
                        {/* Numbered index 01, 02... */}
                        <span className="w-7 text-center font-mono text-xs font-bold text-[var(--text-subtle)] select-none shrink-0">
                          {formattedIndex}
                        </span>

                        {/* Input */}
                        <input
                          ref={(el) => {
                            choiceInputRefs.current[idx] = el;
                          }}
                          type="text"
                          value={option}
                          maxLength={150}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Choice ${idx + 1}`}
                          aria-label={`Choice ${idx + 1}`}
                          className="flex-1 h-11 px-3.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-colors"
                        />

                        {/* Remove button with boundary disabled state & accessible label */}
                        <button
                          type="button"
                          disabled={isMinChoices}
                          onClick={() => handleRemoveOption(idx)}
                          aria-label={
                            isMinChoices
                              ? "At least 2 choices required"
                              : `Remove choice ${idx + 1}`
                          }
                          title={
                            isMinChoices
                              ? "At least 2 choices required"
                              : `Remove choice ${idx + 1}`
                          }
                          className={`p-2.5 rounded-lg transition-colors focus-ring ${
                            isMinChoices
                              ? "text-[var(--text-subtle)]/40 cursor-not-allowed"
                              : "text-[var(--text-subtle)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] cursor-pointer"
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Validation error for choices */}
                {fieldErrors.options && (
                  <InlineAlert variant="danger">
                    {fieldErrors.options}
                  </InlineAlert>
                )}

                {/* Clear boundary feedback for minimum choices */}
                {isMinChoices && (
                  <p className="text-[11px] text-[var(--text-subtle)]">
                    Polls require a minimum of 2 choices.
                  </p>
                )}

                {/* Add choice button / Maximum boundary feedback */}
                {!isMaxChoices ? (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="w-full mt-2 h-11 rounded-[var(--radius-control)] border border-dashed border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]/50 text-[var(--text-muted)] hover:text-[var(--primary)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-ring"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add choice</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)] text-center text-xs text-[var(--text-muted)] font-medium">
                    Maximum limit of 25 choices reached.
                  </div>
                )}
              </div>
            </Card>

            {/* Error message from API */}
            {errorMessage && (
              <InlineAlert variant="danger">
                {errorMessage}
              </InlineAlert>
            )}

            {/* Dominant Primary Action CTA */}
            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full sm:w-auto px-8 font-semibold text-base shadow-xs"
              >
                <span>Create poll & share</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* RIGHT COLUMN: Poll Rules (Narrower column) */}
          <div className="space-y-4">
            <Card className="space-y-4 bg-[var(--surface)]">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                <Layers className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-sm font-bold text-[var(--text)] tracking-tight">
                  Poll rules
                </h2>
              </div>

              {/* Rule 1: Allow multiple selections */}
              <Switch
                checked={isMultipleChoice}
                onChange={setIsMultipleChoice}
                label="Allow multiple selections"
                description="Voters can select more than one answer option."
              />

              {/* Rule 2: Limit votes per choice (Elimination mode) */}
              <div className="space-y-3">
                <Switch
                  checked={isEliminationMode}
                  onChange={setIsEliminationMode}
                  label="Limit votes per choice"
                  description="Choices become disabled when their spot limit is reached."
                />

                {isEliminationMode && (
                  <CapacitySlider
                    value={maxPerOption}
                    onChange={setMaxPerOption}
                  />
                )}
              </div>

              {/* Rule 3: Set total vote limit */}
              <div className="space-y-3">
                <Switch
                  checked={hasMaxVotes}
                  onChange={setHasMaxVotes}
                  label="Set total vote limit"
                  description="Poll closes automatically after accepted submissions."
                />

                {hasMaxVotes && (
                  <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)] space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--text)]">
                      <span>Poll closes after:</span>
                      <span className="font-mono tabular-nums text-sm font-bold text-[var(--primary)]">
                        {maxTotalVotes} submissions
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {[10, 25, 50, 100, 150, 200].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setMaxTotalVotes(preset)}
                          className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md border transition-colors cursor-pointer ${
                            maxTotalVotes === preset
                              ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
                              : "bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-muted)]"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                      Poll closes after {maxTotalVotes} accepted voter submissions.
                    </p>
                  </div>
                )}
              </div>

              {/* Rule 4: Set voting time limit */}
              <div className="space-y-3">
                <Switch
                  checked={hasTimeLimit}
                  onChange={setHasTimeLimit}
                  label="Set voting time limit"
                  description="Voting closes automatically when the timer expires."
                />

                {hasTimeLimit && (
                  <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)] space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--text)]">
                      <span>Voting duration:</span>
                      <span className="font-mono tabular-nums text-sm font-bold text-[var(--primary)]">
                        {timeLimitHours}h
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 4, 8, 12, 24].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTimeLimitHours(preset)}
                          className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md border transition-colors cursor-pointer ${
                            timeLimitHours === preset
                              ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
                              : "bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-muted)]"
                          }`}
                        >
                          {preset}h
                        </button>
                      ))}
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                      Voting closes automatically {timeLimitHours} hours after creation.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </form>

      {/* Share Dialog on Creation */}
      {createdPollId && (
        <ShareDialog
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          pollId={createdPollId}
          creatorKey={createdAdminKey || undefined}
        />
      )}
    </div>
  );
}
