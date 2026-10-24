import { NextRequest, NextResponse } from "next/server";
import { signUpUser, setAuthSessionCookie, AuthenticationError } from "@/lib/auth/auth-service";
import { DatabaseConfigurationError } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    try {
      const result = await signUpUser({ name, email, password });
      await setAuthSessionCookie(result.sessionToken);

      return NextResponse.json(
        {
          success: true,
          user: result.user,
        },
        { status: 201 }
      );
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
          { status: 400 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: "SERVER_ERROR", message }, { status: 500 });
  }
}
