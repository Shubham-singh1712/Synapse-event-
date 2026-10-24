import { NextRequest, NextResponse } from "next/server";
import { signInUser, setAuthSessionCookie, AuthenticationError } from "@/lib/auth/auth-service";
import { DatabaseConfigurationError } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Email and password are required." },
        { status: 400 }
      );
    }

    try {
      const result = await signInUser({ email, password });
      await setAuthSessionCookie(result.sessionToken);

      return NextResponse.json({
        success: true,
        user: result.user,
      });
    } catch (dbError) {
      if (dbError instanceof DatabaseConfigurationError) {
        return NextResponse.json(
          {
            error: "DATABASE_UNCONFIGURED",
            message:
              "Database persistence is in unprovisioned mode. Please configure DATABASE_URL in .env.local to enable user accounts.",
          },
          { status: 503 }
        );
      }
      if (dbError instanceof AuthenticationError) {
        return NextResponse.json(
          { error: "AUTH_ERROR", message: dbError.message },
          { status: 401 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: "SERVER_ERROR", message }, { status: 500 });
  }
}
