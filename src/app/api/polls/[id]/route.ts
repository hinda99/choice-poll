import { NextRequest, NextResponse } from "next/server";
import { getPoll, sanitizePollForPublic } from "@/lib/db";

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

    const isOwner = Boolean(
      poll.creatorKey && adminKey && poll.creatorKey === adminKey
    );

    return NextResponse.json({
      poll: isOwner ? poll : sanitizePollForPublic(poll),
      isOwner,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
