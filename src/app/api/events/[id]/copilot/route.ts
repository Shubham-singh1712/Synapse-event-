import { NextRequest, NextResponse } from "next/server";
import { getEventWithPlan } from "@/lib/services/event-service";
import { getOrCreateWorkspaceSession } from "@/lib/auth/session-helper";
import { UnauthorizedError } from "@/lib/auth/guest-workspace";
import { DatabaseConfigurationError } from "@/lib/db/client";
import { CopilotChatRequestSchema } from "@/lib/domain/copilot-contracts";
import { executeCopilotChat } from "@/lib/ai/copilot";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    if (!eventId || !/^[0-9a-fA-F-]{36}$/.test(eventId)) {
      return NextResponse.json(
        { error: "INVALID_EVENT_ID", message: "Provided event ID is invalid." },
        { status: 400 }
      );
    }

    // 1. Authenticate user/workspace session
    const session = await getOrCreateWorkspaceSession();
    const authContext = {
      workspaceId: session.workspaceId,
      userId: session.user?.id,
    };

    // 2. Validate request body against schema
    const body = await req.json();
    const parseResult = CopilotChatRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          message: "Invalid copilot query parameters.",
          fieldErrors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 3. Retrieve event plan enforcing ownership
    try {
      const plan = await getEventWithPlan(eventId, authContext);
      if (!plan) {
        return NextResponse.json(
          { error: "EVENT_NOT_FOUND", message: "Requested event does not exist." },
          { status: 404 }
        );
      }

      // 4. Execute contextual copilot engine
      const copilotResponse = await executeCopilotChat(plan, parseResult.data);
      return NextResponse.json(copilotResponse);
    } catch (dbError) {
      if (dbError instanceof UnauthorizedError) {
        return NextResponse.json(
          {
            error: "FORBIDDEN",
            message: "Access denied. Resource belongs to another workspace or account.",
          },
          { status: 403 }
        );
      }
      if (dbError instanceof DatabaseConfigurationError) {
        return NextResponse.json(
          {
            error: "DATABASE_UNCONFIGURED",
            message: "PostgreSQL database is unconfigured in this environment.",
          },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
