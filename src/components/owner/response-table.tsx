import React from "react";
import { VoteRecord, PollOption } from "@/lib/types";

export interface ResponseTableProps {
  records: VoteRecord[];
  options: PollOption[];
}

export const ResponseTable: React.FC<ResponseTableProps> = ({
  records,
  options,
}) => {
  if (!records || records.length === 0) {
    return (
      <div className="text-center py-10 px-4 rounded-[var(--radius-card)] bg-[var(--surface-muted)]/50 border border-[var(--border)]">
        <p className="text-sm font-semibold text-[var(--text)]">No votes yet</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Share your poll link to start collecting responses.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full text-left text-xs border-collapse">
        <caption className="sr-only">Owner Response Log</caption>
        <thead className="bg-[var(--surface-muted)] text-[var(--text-muted)] font-semibold border-b border-[var(--border)]">
          <tr>
            <th scope="col" className="py-3 px-3.5 w-12 text-center">
              #
            </th>
            <th scope="col" className="py-3 px-3.5">
              Voter
            </th>
            <th scope="col" className="py-3 px-3.5">
              Selection
            </th>
            <th scope="col" className="py-3 px-3.5 text-right">
              Submitted
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
          {records.map((rec, i) => {
            const selectedLabels = rec.optionIds.map((optId) => {
              const found = options.find((o) => o.id === optId);
              return found ? found.text : optId;
            });

            return (
              <tr
                key={rec.id}
                className="hover:bg-[var(--surface-muted)]/50 transition-colors"
              >
                <td className="py-3 px-3.5 text-center font-mono text-[var(--text-muted)]">
                  {i + 1}
                </td>
                <td className="py-3 px-3.5 font-semibold text-[var(--text)] max-w-[200px] truncate">
                  {rec.voterName}
                </td>
                <td className="py-3 px-3.5">
                  <div className="flex flex-wrap gap-1">
                    {selectedLabels.map((label, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 rounded-md bg-[var(--surface-muted)] border border-[var(--border)] text-xs text-[var(--text)]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-3.5 text-right font-mono text-[var(--text-muted)] whitespace-nowrap">
                  {new Date(rec.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
