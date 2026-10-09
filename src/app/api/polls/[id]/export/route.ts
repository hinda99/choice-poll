import { NextRequest, NextResponse } from "next/server";
import { getPoll } from "@/lib/db";

function escapeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  let str = String(val);

  // Neutralize CSV Formula Injection (CWE-1236):
  // Spreadsheet engines (Excel, Google Sheets, Calc) execute formulas if a cell starts with =, +, -, @, \t, or \r
  // Prepending a single quote (') forces spreadsheet engines to interpret the content purely as plain text.
  const trimmed = str.trimStart();
  if (
    trimmed.startsWith("=") ||
    trimmed.startsWith("+") ||
    trimmed.startsWith("-") ||
    trimmed.startsWith("@") ||
    trimmed.startsWith("\t") ||
    trimmed.startsWith("\r")
  ) {
    str = `'${str}`;
  }

  // Standard CSV escaping: double any embedded double quotes and wrap in quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const adminKey =
      request.nextUrl.searchParams.get("adminKey") ||
      request.headers.get("x-admin-key");

    const poll = await getPoll(id);

    if (!poll) {
      return NextResponse.json({ error: "Poll not found." }, { status: 404 });
    }

    if (poll.creatorKey && (!adminKey || poll.creatorKey !== adminKey)) {
      return NextResponse.json(
        { error: "Access denied. Only the poll owner can export voter response logs." },
        { status: 403 }
      );
    }

    const isExpired = poll.expiresAt && new Date() > new Date(poll.expiresAt);
    const totalVotes = poll.totalVotes || 0;

    const rows: string[] = [];

    // Header info
    rows.push(`${escapeCsvCell("Poll Question:")},${escapeCsvCell(poll.question)}`);
    rows.push(`${escapeCsvCell("Poll ID:")},${escapeCsvCell(poll.id)}`);
    rows.push(`${escapeCsvCell("Created At:")},${escapeCsvCell(poll.createdAt)}`);
    rows.push(
      `${escapeCsvCell("Expiration:")},${escapeCsvCell(
        poll.expiresAt
          ? `${new Date(poll.expiresAt).toLocaleString()} (${isExpired ? "Expired" : "Active"})`
          : "No Limit"
      )}`
    );
    rows.push(
      `${escapeCsvCell("Poll Mode:")},${escapeCsvCell(
        poll.isEliminationMode
          ? `Elimination Mode (Max ${poll.maxPerOption || 1} per choice)`
          : poll.isMultipleChoice
          ? "Multiple Choice"
          : "Single Choice"
      )}`
    );
    if (poll.maxTotalVotes) {
      rows.push(
        `${escapeCsvCell("Vote Quota Limit:")},${escapeCsvCell(
          `${poll.maxTotalVotes} maximum votes`
        )}`
      );
    }
    rows.push(`${escapeCsvCell("Total Votes Cast:")},${escapeCsvCell(totalVotes)}`);
    rows.push(""); // empty separator

    // Summary Section
    rows.push(escapeCsvCell("--- SUMMARY OF CHOICES ---"));
    rows.push(
      [
        escapeCsvCell("Option #"),
        escapeCsvCell("Choice Text"),
        escapeCsvCell("Votes Received"),
        escapeCsvCell("Percentage"),
        escapeCsvCell("Status"),
        escapeCsvCell("Claimed By (Names)"),
      ].join(",")
    );

    poll.options.forEach((opt, idx) => {
      const percentage =
        totalVotes > 0 ? `${Math.round((opt.votes / totalVotes) * 100)}%` : "0%";
      const limit = opt.maxClaims || poll.maxPerOption || 1;
      const status = opt.isEliminated || opt.votes >= limit ? "FULL / ELIMINATED" : "AVAILABLE";
      const claimedNames = (opt.claimedBy || []).join("; ");

      rows.push(
        [
          escapeCsvCell(idx + 1),
          escapeCsvCell(opt.text),
          escapeCsvCell(opt.votes),
          escapeCsvCell(percentage),
          escapeCsvCell(status),
          escapeCsvCell(claimedNames || "None"),
        ].join(",")
      );
    });

    rows.push(""); // empty separator

    // Individual voter records
    rows.push(escapeCsvCell("--- VOTER RESPONSES (FULL NAMES & CHOICES) ---"));
    rows.push(
      [
        escapeCsvCell("#"),
        escapeCsvCell("Voter Full Name"),
        escapeCsvCell("Choice(s) Selected"),
        escapeCsvCell("Date & Time"),
      ].join(",")
    );

    if (poll.voteRecords && poll.voteRecords.length > 0) {
      poll.voteRecords.forEach((record, index) => {
        const optionNames = record.optionIds
          .map((optId) => {
            const opt = poll.options.find((o) => o.id === optId);
            return opt ? opt.text : optId;
          })
          .join(" | ");

        rows.push(
          [
            escapeCsvCell(index + 1),
            escapeCsvCell(record.voterName),
            escapeCsvCell(optionNames),
            escapeCsvCell(new Date(record.createdAt).toLocaleString()),
          ].join(",")
        );
      });
    } else {
      rows.push(`${escapeCsvCell("No votes recorded yet")},,,`);
    }

    const csvContent = "\uFEFF" + rows.join("\r\n"); // UTF-8 BOM for Excel / Sheets compatibility

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="poll-${poll.id}-results.csv"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to export data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
