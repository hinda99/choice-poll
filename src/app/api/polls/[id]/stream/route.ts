import { NextRequest } from "next/server";
import { getPoll, pollEvents, sanitizePollForPublic } from "@/lib/db";
import { Poll } from "@/lib/types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const adminKey = request.nextUrl.searchParams.get("adminKey");
  const initialPoll = await getPoll(id);

  if (!initialPoll) {
    return new Response("Poll not found", { status: 404 });
  }

  const isOwner = Boolean(
    initialPoll.creatorKey && adminKey && initialPoll.creatorKey === adminKey
  );

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial data (sanitized if regular voter, full if owner)
  const initialPayload = isOwner ? initialPoll : sanitizePollForPublic(initialPoll);
  writer.write(encoder.encode(`data: ${JSON.stringify(initialPayload)}\n\n`));

  let isClosed = false;
  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    clearInterval(heartbeat);
    pollEvents.off(eventName, handleUpdate);
    try {
      writer.close();
    } catch {
      // ignore
    }
  };

  const handleUpdate = async (updatedPoll: Poll) => {
    if (isClosed) return;
    try {
      const payload = isOwner ? updatedPoll : sanitizePollForPublic(updatedPoll);
      await writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    } catch {
      cleanup();
    }
  };

  const eventName = `update:${id}`;
  pollEvents.on(eventName, handleUpdate);

  // Send keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(async () => {
    if (isClosed) return;
    try {
      await writer.write(encoder.encode(`: heartbeat\n\n`));
    } catch {
      cleanup();
    }
  }, 15000);

  request.signal.addEventListener("abort", () => {
    cleanup();
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
