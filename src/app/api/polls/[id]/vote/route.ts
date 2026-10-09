import { NextRequest, NextResponse } from "next/server";
import { votePoll } from "@/lib/db";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { optionIds, voterName } = body;

    const cleanVoterName = typeof voterName === "string" ? voterName.trim() : "";
    if (!cleanVoterName || cleanVoterName.length < 2) {
      return NextResponse.json(
        { error: "Please enter your full name (at least 2 characters) to cast your vote." },
        { status: 400 }
      );
    }

    if (cleanVoterName.length > 100) {
      return NextResponse.json(
        { error: "Voter name cannot exceed 100 characters." },
        { status: 400 }
      );
    }

    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one option to vote." },
        { status: 400 }
      );
    }

    // Deduplicate selected option IDs to prevent duplicate votes per option in multiple-choice
    const uniqueOptionIds = Array.from(new Set(optionIds));

    const { poll } = await votePoll(id, uniqueOptionIds, cleanVoterName);

    return NextResponse.json({ success: true, poll });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to record vote.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
