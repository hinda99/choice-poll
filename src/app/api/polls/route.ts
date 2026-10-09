import { NextRequest, NextResponse } from "next/server";
import { createPoll } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      question,
      options,
      isMultipleChoice,
      isEliminationMode,
      maxPerOption,
      maxTotalVotes,
      timeLimitHours,
    } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { error: "A valid question is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: "At least two options are required." },
        { status: 400 }
      );
    }

    if (options.length > 25) {
      return NextResponse.json(
        { error: "You can create at most 25 choices." },
        { status: 400 }
      );
    }

    const poll = await createPoll({
      question,
      options,
      isMultipleChoice: Boolean(isMultipleChoice),
      isEliminationMode: Boolean(isEliminationMode),
      maxPerOption: maxPerOption ? Number(maxPerOption) : undefined,
      maxTotalVotes: maxTotalVotes ? Number(maxTotalVotes) : undefined,
      timeLimitHours: timeLimitHours ? Number(timeLimitHours) : undefined,
    });

    return NextResponse.json(
      { success: true, poll, creatorKey: poll.creatorKey },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create poll.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
