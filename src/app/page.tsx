"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  ArrowRight,
  Flame,
  Clock,
  Users,
} from "lucide-react";

export default function CreatePollPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [isEliminationMode, setIsEliminationMode] = useState(false);
  const [maxPerOption, setMaxPerOption] = useState<number>(5);
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeLimitHours, setTimeLimitHours] = useState<number>(24);
  const [hasMaxVotes, setHasMaxVotes] = useState(false);
  const [maxTotalVotes, setMaxTotalVotes] = useState<number>(200);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleAddOption = () => {
    if (options.length < 25) {
      setOptions([...options, ""]);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      setErrorMessage("Please enter a question for your poll.");
      return;
    }

    const cleanOptions = options
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);

    if (cleanOptions.length < 2) {
      setErrorMessage("Please provide at least 2 non-empty options.");
      return;
    }

    if (cleanOptions.length > 25) {
      setErrorMessage("You can add at most 25 options.");
      return;
    }

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

      // Store in localStorage that user is creator
      if (typeof window !== "undefined") {
        localStorage.setItem(`created_${data.poll.id}`, "true");
      }

      router.push(`/poll/${data.poll.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Instant Anonymous Polls</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Create a New Poll
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
          Ask anything, customize voting rules, and share the link instantly.
        </p>
      </div>

      {/* Poll Creation Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Input */}
          <div>
            <label
              htmlFor="question"
              className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2"
            >
              Poll Question <span className="text-rose-500">*</span>
            </label>
            <input
              id="question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What should we order for lunch?"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-base"
              maxLength={200}
              required
            />
          </div>

          {/* Options Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Answer Choices <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {options.length}/25 choices
              </span>
            </div>

            <div className="space-y-2.5">
              {options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Choice ${idx + 1}`}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                    maxLength={100}
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                      title="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 25 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800/80 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Choice</span>
              </button>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Voting Rules & Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Poll Settings</span>
            </h3>

            {/* Multiple Choice Toggle */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition cursor-pointer">
              <input
                type="checkbox"
                checked={isMultipleChoice}
                onChange={(e) => setIsMultipleChoice(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                  Allow Multiple Choices
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                  Voters can check more than one answer option.
                </span>
              </div>
            </label>

            {/* Elimination / Single-Claim Mode Toggle (User's special request!) */}
            <div className="p-4 rounded-xl border-2 border-amber-500/30 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEliminationMode}
                  onChange={(e) => setIsEliminationMode(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-700"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      Elimination / Single-Claim Mode
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                      <Flame className="w-2.5 h-2.5" /> First-Come
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 block mt-0.5">
                    When a choice reaches its selection limit, it becomes{" "}
                    <strong className="text-amber-700 dark:text-amber-400">
                      disabled and eliminated
                    </strong>{" "}
                    for everyone else!
                  </span>
                </div>
              </label>

              {/* Max votes per choice selector (up to 200) */}
              {isEliminationMode && (
                <div className="mt-4 pt-3.5 border-t border-amber-200/80 dark:border-amber-900/60 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Max votes allowed per choice (1 to 200):
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        {maxPerOption === 1
                          ? "Strict single-claim: 1 person takes the choice, then it is eliminated."
                          : `Up to ${maxPerOption} people can choose each option before it is eliminated.`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={maxPerOption}
                        onChange={(e) =>
                          setMaxPerOption(
                            Math.min(200, Math.max(1, Number(e.target.value) || 1))
                          )
                        }
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-center"
                      />
                      <span className="text-xs text-slate-500">max/choice</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 5, 10, 25, 50, 100, 200].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMaxPerOption(num)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          maxPerOption === num
                            ? "bg-amber-500 text-white shadow-sm scale-105"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Total Vote Limit (Cap up to 200 votes) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasMaxVotes}
                  onChange={(e) => setHasMaxVotes(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      Poll-wide Total Votes Cap (Up to 200 Votes)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      <Users className="w-2.5 h-2.5" /> Max 200
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                    Automatically close and lock the poll once the total votes reach this limit.
                  </span>
                </div>
              </label>

              {hasMaxVotes && (
                <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-700/80 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Close after total votes:
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        The poll will automatically lock when {maxTotalVotes} votes have been cast.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={maxTotalVotes}
                        onChange={(e) =>
                          setMaxTotalVotes(
                            Math.min(200, Math.max(1, Number(e.target.value) || 1))
                          )
                        }
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-center"
                      />
                      <span className="text-xs text-slate-500">votes</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[10, 25, 50, 100, 150, 200].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setMaxTotalVotes(count)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          maxTotalVotes === count
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Time Limit Setting (Up to 24h) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTimeLimit}
                  onChange={(e) => setHasTimeLimit(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      Voting Time Limit (Up to 24 Hours)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      <Clock className="w-2.5 h-2.5" /> Max 24h
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                    Automatically close the poll and end voting after a set duration.
                  </span>
                </div>
              </label>

              {hasTimeLimit && (
                <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Close poll after:
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Voting will be locked after {timeLimitHours} hour{timeLimitHours === 1 ? "" : "s"}.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 4, 8, 12, 24].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => setTimeLimitHours(hrs)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          timeLimitHours === hrs
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                        }`}
                      >
                        {hrs}h
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-base"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Poll...</span>
              </>
            ) : (
              <>
                <span>Create Poll & Share Link</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
