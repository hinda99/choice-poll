"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, Check, AlertCircle, Trash2, ArrowRight } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useLanguage } from "@/lib/language-context";
import { parseOptionsFromFile } from "@/lib/file-parser";

export interface ImportOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (choices: string[], mode: "replace" | "append", fileName: string) => void;
  hasExistingChoices: boolean;
}

export const ImportOptionsDialog: React.FC<ImportOptionsDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  hasExistingChoices,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
  } | null>(null);
  const [parsedChoices, setParsedChoices] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");

  const resetState = () => {
    setSelectedFile(null);
    setParsedChoices([]);
    setErrorMessage("");
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const processFile = async (file: File) => {
    setErrorMessage("");

    const isCsvOrTxt =
      file.name.toLowerCase().endsWith(".csv") ||
      file.name.toLowerCase().endsWith(".txt") ||
      file.name.toLowerCase().endsWith(".tsv");

    if (!isCsvOrTxt) {
      setErrorMessage(t.create.invalidFileType);
      return;
    }

    try {
      // Decode with fallback to windows-1252 / ISO-8859-1 for Excel-exported French CSVs
      const buffer = await file.arrayBuffer();
      let content = "";
      try {
        content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      } catch {
        content = new TextDecoder("windows-1252").decode(buffer);
      }
      const choices = parseOptionsFromFile(content, file.name);

      if (choices.length === 0) {
        setErrorMessage(t.create.minChoicesFileError);
        return;
      }

      setSelectedFile({
        name: file.name,
        size: formatFileSize(file.size),
      });
      setParsedChoices(choices);
    } catch {
      setErrorMessage(t.create.toastImportError);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveChoice = (idxToRemove: number) => {
    const updated = parsedChoices.filter((_, idx) => idx !== idxToRemove);
    setParsedChoices(updated);
  };

  const handleApply = () => {
    if (parsedChoices.length < 2) {
      setErrorMessage(t.create.minChoicesFileError);
      return;
    }
    onImport(parsedChoices, importMode, selectedFile?.name || "file");
    handleClose();
  };

  const isBelowMin = parsedChoices.length < 2;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={t.create.importDialogTitle}
      description={t.create.importDialogDesc}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Hidden native file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.tsv,text/csv,text/plain"
          onChange={handleFileChange}
          className="hidden"
          aria-label={t.create.browseFiles}
        />

        {/* Drag & Drop zone (if no file parsed yet) */}
        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[var(--radius-control)] p-6 sm:p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[var(--primary)] bg-[var(--primary-soft)]/60 scale-[1.01]"
                : "border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-muted)]/50"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] mx-auto flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[var(--text)]">
              {t.create.dropzoneTitle}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs mx-auto">
              {t.create.dropzoneHint}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4 pointer-events-none"
            >
              {t.create.browseFiles}
            </Button>
          </div>
        ) : (
          /* File loaded view */
          <div className="space-y-4">
            {/* File info banner */}
            <div className="flex items-center justify-between p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-[var(--border)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text)] truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-subtle)]">
                    {selectedFile.size} · {t.create.choicesDetected(parsedChoices.length)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetState}
                className="text-xs font-medium text-[var(--primary)] hover:underline ml-2 shrink-0 cursor-pointer"
              >
                {t.create.chooseAnotherFile}
              </button>
            </div>

            {/* Warning if under min choices */}
            {isBelowMin && (
              <InlineAlert variant="danger">
                {t.create.minChoicesFileError}
              </InlineAlert>
            )}

            {/* Choices preview list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--text)]">
                  {t.create.choicesPreview}
                </span>
                <span className="text-xs font-mono font-medium text-[var(--primary)]">
                  {parsedChoices.length} / 200
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                {parsedChoices.map((choice, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-[var(--surface)] border border-[var(--border)]/60 text-xs text-[var(--text)]"
                  >
                    <span className="font-mono text-[11px] text-[var(--text-subtle)] w-8 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 truncate font-medium">{choice}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChoice(idx)}
                      title={t.create.removePreviewChoice}
                      aria-label={t.create.removePreviewChoice}
                      className="p-1 text-[var(--text-subtle)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Mode selection if existing poll already has user-entered choices */}
            {hasExistingChoices && (
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <label className="text-xs font-semibold text-[var(--text)]">
                  {t.create.importModeTitle}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode("replace")}
                    className={`p-2.5 rounded-[var(--radius-control)] border text-left transition-all text-xs cursor-pointer flex items-center justify-between ${
                      importMode === "replace"
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]/50 font-semibold text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <span>{t.create.importModeReplace}</span>
                    {importMode === "replace" && <Check className="w-4 h-4 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode("append")}
                    className={`p-2.5 rounded-[var(--radius-control)] border text-left transition-all text-xs cursor-pointer flex items-center justify-between ${
                      importMode === "append"
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]/50 font-semibold text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <span>{t.create.importModeAppend}</span>
                    {importMode === "append" && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <InlineAlert variant="danger">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </InlineAlert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleClose}
          >
            {t.common.cancel}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={!selectedFile || isBelowMin}
            onClick={handleApply}
            className="gap-2"
          >
            <span>{t.create.applyImportBtn(parsedChoices.length)}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
