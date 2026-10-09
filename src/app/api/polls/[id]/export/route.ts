import { NextRequest, NextResponse } from "next/server";
import { getPoll } from "@/lib/db";

function sanitizeFormula(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  const trimmed = str.trimStart();
  if (trimmed.startsWith("'")) {
    return str;
  }
  if (
    trimmed.startsWith("=") ||
    trimmed.startsWith("+") ||
    trimmed.startsWith("-") ||
    trimmed.startsWith("@") ||
    str.startsWith("\t") ||
    str.startsWith("\r") ||
    str.startsWith("\n")
  ) {
    return `'${str}`;
  }
  return str;
}

function escapeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  let str = String(val);

  // Neutralize CSV Formula Injection (CWE-1236):
  // Spreadsheet engines (Excel, Google Sheets, Calc) execute formulas if a cell starts with =, +, -, @, \t, or \r
  // Prepending a single quote (') forces spreadsheet engines to interpret the content purely as plain text.
  str = sanitizeFormula(str);

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

    const rows: string[] = [];

    // Header row: exactly the three required columns
    rows.push(
      [
        escapeCsvCell("Selected Choice"),
        escapeCsvCell("Voters (Names)"),
        escapeCsvCell("Total Votes"),
      ].join(",")
    );

    // One row per poll choice in original choice order
    poll.options.forEach((opt) => {
      // Find all voter names who selected this choice
      let voters: string[] = [];
      if (poll.voteRecords && poll.voteRecords.length > 0) {
        voters = poll.voteRecords
          .filter((rec) => rec.optionIds && rec.optionIds.includes(opt.id))
          .map((rec) => rec.voterName);
      }
      if (voters.length === 0 && opt.claimedBy && opt.claimedBy.length > 0) {
        voters = [...opt.claimedBy];
      }

      // Filter and clean voter names
      const cleanVoters = voters
        .filter((name) => typeof name === "string" && name.trim().length > 0)
        .map((name) => name.trim());

      // Group all voter names into the same cell, separated by commas.
      // Neutralize formula injection on each voter name individually.
      const sanitizedVoters = cleanVoters.map((name) => sanitizeFormula(name));
      const votersCell = sanitizedVoters.join(", ");

      // Calculate total number of votes for this choice
      const totalVotes = Math.max(
        cleanVoters.length,
        typeof opt.votes === "number" ? opt.votes : 0
      );

      rows.push(
        [
          escapeCsvCell(opt.text),
          escapeCsvCell(votersCell),
          escapeCsvCell(totalVotes),
        ].join(",")
      );
    });

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

