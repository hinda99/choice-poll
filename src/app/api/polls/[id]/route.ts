import { NextRequest, NextResponse } from "next/server";
import { getPoll } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const poll = await getPoll(id);

    if (!poll) {
      return NextResponse.json({ error: "Poll not found." }, { status: 404 });
    }

    return NextResponse.json({ poll });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
