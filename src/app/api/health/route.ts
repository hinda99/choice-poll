import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring & keep-alive pings (e.g. UptimeRobot, cron-job.org).
 * Prevents Render from putting the web service to sleep.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
