import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { CreateEventInputSchema, validateEventDate } from "@/lib/domain/schemas";
import { generateEventPlan } from "@/lib/ai/adapter";
import { persistEventAndPlan, getUserEvents } from "@/lib/services/event-service";
import {
  getOrCreateWorkspaceSession,
  setWorkspaceSessionCookie,
} from "@/lib/auth/session-helper";
import { DatabaseConfigurationError } from "@/lib/db/client";

export async function GET() {
  try {
    const session = await getOrCreateWorkspaceSession();

    try {
      const userEvents = await getUserEvents({
        userId: session.user?.id,
        workspaceId: session.workspaceId,
      });

      return NextResponse.json({
        success: true,
        events: userEvents,
      });
    } catch (dbError) {
      if (dbError instanceof DatabaseConfigurationError) {
        return NextResponse.json(
          {
            error: "DATABASE_UNCONFIGURED",
            message: "Database persistence is currently in unprovisioned mode.",
            events: [],
          },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: "SERVER_ERROR", message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate payload against Zod schema
    const parseResult = CreateEventInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          message: "Submitted event constraints contain invalid data.",
          fieldErrors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const eventInput = parseResult.data;

    // 2. Validate event date policy (must be today or in the future)
    const dateCheck = validateEventDate(eventInput.eventDate);
    if (!dateCheck.isValid) {
      return NextResponse.json(
        {
          error: "INVALID_EVENT_DATE",
          message: dateCheck.error,
          fieldErrors: { eventDate: [dateCheck.error!] },
        },
        { status: 400 }
      );
    }

    // 3. Establish or retrieve session context
    const session = await getOrCreateWorkspaceSession();
    const eventId = crypto.randomUUID();

    // 4. Generate structured event plan (via Gemini or deterministic benchmark template)
    const planResult = await generateEventPlan({
      eventId,
      archetype: eventInput.archetype,
      title: eventInput.title,
      eventDate: eventInput.eventDate,
      timezone: eventInput.timezone,
      totalBudgetCents: eventInput.totalBudgetCents,
      currency: eventInput.currency,
      guestCount: eventInput.guestCount,
      location: eventInput.location,
      theme: typeof eventInput.preferences?.theme === "string" ? eventInput.preferences.theme : undefined,
      priorities: typeof eventInput.preferences?.priorities === "string" ? eventInput.preferences.priorities : undefined,
      subtypes: Array.isArray(eventInput.preferences?.subtypes) ? (eventInput.preferences.subtypes as string[]) : [],
      dietary: typeof eventInput.preferences?.dietary === "string" ? eventInput.preferences.dietary : undefined,
      preferences: eventInput.preferences,
    });

    if (!planResult.success) {
      return NextResponse.json(
        {
          error: planResult.errorCode,
          message: planResult.errorMessage,
        },
        { status: 500 }
      );
    }

    // 5. Persist to PostgreSQL database atomically
    try {
      await persistEventAndPlan(
        {
          id: eventId,
          workspaceId: session.workspaceId,
          userId: session.user?.id,
          title: eventInput.title,
          archetype: eventInput.archetype,
          eventDate: eventInput.eventDate,
          timezone: eventInput.timezone,
          location: eventInput.location,
          guestCount: eventInput.guestCount,
          totalBudgetCents: eventInput.totalBudgetCents,
          currency: eventInput.currency,
          preferences: eventInput.preferences,
        },
        planResult.plan,
        planResult.mode
      );

      // Set cookie if new guest session
      if (session.isNew && session.rawToken && !session.isAuthenticated) {
        await setWorkspaceSessionCookie(session.workspaceId, session.rawToken);
      }

      return NextResponse.json(
        {
          success: true,
          eventId,
          mode: planResult.mode,
          notice: planResult.notice,
          provider: planResult.provider,
          modelUsed: planResult.modelUsed,
          durationMs: planResult.generationDurationMs,
        },
        { status: 201 }
      );
    } catch (dbError) {
      if (dbError instanceof DatabaseConfigurationError) {
        return NextResponse.json(
          {
            error: "DATABASE_UNCONFIGURED",
            message:
              "Managed PostgreSQL database is not provisioned. Please configure DATABASE_URL in .env.local to persist events.",
            planPreview: planResult.plan,
            mode: planResult.mode,
            notice: planResult.notice,
          },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message,
      },
      { status: 500 }
    );
  }
}
