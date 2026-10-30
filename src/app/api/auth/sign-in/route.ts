import { NextRequest, NextResponse } from "next/server";
import { signInUser, setAuthSessionCookie, AuthenticationError } from "@/lib/auth/auth-service";
import { DatabaseConfigurationError } from "@/lib/db/client";
import { SignInPayloadSchema } from "@/lib/domain/schemas";

export async function POST(req: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "INVALID_JSON", message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const parseResult = SignInPayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || "Email and password are required.";
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: firstIssue,
          fieldErrors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

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

