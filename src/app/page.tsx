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
import { VoteLimitSlider } from "@/components/poll/vote-limit-slider";
import { TimeLimitSlider } from "@/components/poll/time-limit-slider";
import { ShareDialog } from "@/components/poll/share-dialog";
import { useLanguage } from "@/lib/language-context";

export default function CreatePollPage() {
  const { t } = useLanguage();
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
      errors.question = t.create.questionErrorEmpty;
    } else if (cleanQuestion.length > 300) {
      errors.question = t.create.questionErrorMax;
    }

    const cleanOptions = options
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);

    if (cleanOptions.length < 2) {
      errors.options = t.create.choicesErrorMin;
    } else if (cleanOptions.length > 25) {
      errors.options = t.create.choicesErrorMax;
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
        throw new Error(data.error || t.create.failedToCreate);
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
      const msg = err instanceof Error ? err.message : t.common.somethingWentWrong;
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMinChoices = options.length <= 2;
  const isMaxChoices = options.length >= 25;

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <PageHeading
        title={t.create.title}
        subtitle={t.create.subtitle}
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
                label={t.create.questionLabel}
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  if (fieldErrors.question) {
                    setFieldErrors((prev) => ({ ...prev, question: undefined }));
                  }
                }}
                maxLength={300}
                showCounter={true}
                placeholder={t.create.questionPlaceholder}
                error={fieldErrors.question}
              />

              {/* Choices Field */}
              <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[var(--text)]">
                    {t.create.choicesLabel}
                  </label>
                  <span className="text-xs text-[var(--text-subtle)] font-mono tabular-nums">
                    {t.create.choicesCount(options.length)}
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
                          placeholder={t.create.choicePlaceholder(idx + 1)}
                          aria-label={t.create.choiceAria(idx + 1)}
                          className="flex-1 h-11 px-3.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-colors"
                        />

                        {/* Remove button with boundary disabled state & accessible label */}
                        <button
                          type="button"
                          disabled={isMinChoices}
                          onClick={() => handleRemoveOption(idx)}
                          aria-label={
                            isMinChoices
                              ? t.create.minChoicesTooltip
                              : t.create.removeChoiceAria(idx + 1)
                          }
                          title={
                            isMinChoices
                              ? t.create.minChoicesTooltip
                              : t.create.removeChoiceAria(idx + 1)
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
                    {t.create.minChoicesNotice}
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
                    <span>{t.create.addChoice}</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)] text-center text-xs text-[var(--text-muted)] font-medium">
                    {t.create.maxChoicesReached}
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
                <span>{t.create.createAndShare}</span>
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
                  {t.create.rulesHeading}
                </h2>
              </div>

              {/* Rule 1: Allow multiple selections */}
              <Switch
                checked={isMultipleChoice}
                onChange={setIsMultipleChoice}
                label={t.create.ruleMultipleChoiceTitle}
                description={t.create.ruleMultipleChoiceDesc}
              />

              {/* Rule 2: Limit votes per choice (Elimination mode) */}
              <div className="space-y-3">
                <Switch
                  checked={isEliminationMode}
                  onChange={setIsEliminationMode}
                  label={t.create.ruleEliminationTitle}
                  description={t.create.ruleEliminationDesc}
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
                  label={t.create.ruleTotalLimitTitle}
                  description={t.create.ruleTotalLimitDesc}
                />

                {hasMaxVotes && (
                  <VoteLimitSlider
                    value={maxTotalVotes}
                    onChange={setMaxTotalVotes}
                  />
                )}
              </div>

              {/* Rule 4: Set voting time limit */}
              <div className="space-y-3">
                <Switch
                  checked={hasTimeLimit}
                  onChange={setHasTimeLimit}
                  label={t.create.ruleTimeLimitTitle}
                  description={t.create.ruleTimeLimitDesc}
                />

                {hasTimeLimit && (
                  <TimeLimitSlider
                    value={timeLimitHours}
                    onChange={setTimeLimitHours}
                  />
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
