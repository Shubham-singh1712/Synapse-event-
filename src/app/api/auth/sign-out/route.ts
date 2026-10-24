import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  terminateSession,
  clearAuthSessionCookie,
} from "@/lib/auth/auth-service";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (token) {
      await terminateSession(token);
    }

    await clearAuthSessionCookie();

    return NextResponse.json({ success: true, message: "Signed out successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: "SERVER_ERROR", message }, { status: 500 });
  }
}
