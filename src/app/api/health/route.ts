import { NextResponse } from "next/server";
import { env } from "@/lib/utils/env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: env.NEXT_PUBLIC_APP_NAME,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    services: {
      api: "healthy",
      database: "disabled_for_landing_phase",
    },
  });
}
