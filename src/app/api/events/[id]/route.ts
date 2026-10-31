import { NextRequest, NextResponse } from "next/server";
import {
  getEventWithPlan,
  updateBudgetItem,
  addBudgetItem,
  deleteBudgetItem,
  updateMilestone,
  addMilestone,
  deleteMilestone,
  updateVendorTask,
  addVendorTask,
  deleteVendorTask,
  convertIdeaToPlanItem,
  updateEventDetails,
  deleteEvent,
} from "@/lib/services/event-service";
import { getOrCreateWorkspaceSession } from "@/lib/auth/session-helper";
import { UnauthorizedError } from "@/lib/auth/guest-workspace";
import { DatabaseConfigurationError } from "@/lib/db/client";
import { PatchEventPayloadSchema } from "@/lib/domain/schemas";

export async function GET(
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

    const session = await getOrCreateWorkspaceSession();
    const authContext = {
      workspaceId: session.workspaceId,
      userId: session.user?.id,
    };

    try {
      const plan = await getEventWithPlan(eventId, authContext);
      if (!plan) {
        return NextResponse.json(
          { error: "EVENT_NOT_FOUND", message: "Requested event does not exist." },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, plan });
    } catch (dbError) {
      if (dbError instanceof UnauthorizedError) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Access denied. Resource belongs to another workspace or account." },
          { status: 403 }
        );
      }
      if (dbError instanceof DatabaseConfigurationError) {
        return NextResponse.json(
          {
            error: "DATABASE_UNCONFIGURED",
            message: "PostgreSQL database is not configured in this environment.",
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

export async function PATCH(
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

    const [session, bodyResult] = await Promise.all([
      getOrCreateWorkspaceSession(),
      req
        .json()
        .then((data) => ({ ok: true as const, data }))
        .catch(() => ({ ok: false as const, data: null })),
    ]);
    const authContext = {
      workspaceId: session.workspaceId,
      userId: session.user?.id,
    };
    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: "INVALID_JSON", message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }
    const rawBody: unknown = bodyResult.data;

    const parseResult = PatchEventPayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          message: "Provided patch payload is invalid.",
          fieldErrors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = parseResult.data;

    try {
      if (payload.action === "UPDATE_EVENT_DETAILS") {
        const detailsUpdates = payload.updates ?? {
          title: payload.title,
          eventDate: payload.eventDate,
          location: payload.location,
          guestCount: payload.guestCount,
          totalBudgetCents: payload.totalBudgetCents,
          preferences: payload.preferences,
        };
        const res = await updateEventDetails(eventId, detailsUpdates, authContext);
        return NextResponse.json({ success: true, event: res.event });
      }

      if (payload.action === "ADD_BUDGET_ITEM") {
        const item = await addBudgetItem(
          eventId,
          {
            category: payload.category || "General",
            description: payload.description,
            estimatedCostCents: payload.estimatedCostCents,
            actualCostCents: payload.actualCostCents,
            status: payload.status,
            isGuestSensitive: payload.isGuestSensitive,
          },
          authContext
        );
        return NextResponse.json({ success: true, item });
      }

      if (payload.action === "DELETE_BUDGET_ITEM") {
        await deleteBudgetItem(eventId, payload.itemId, authContext);
        return NextResponse.json({ success: true });
      }

      if (payload.action === "ADD_MILESTONE") {
        const milestone = await addMilestone(
          eventId,
          {
            title: payload.title,
            dueAt: payload.dueAt,
            description: payload.description,
            offsetDaysFromEvent: payload.offsetDaysFromEvent,
          },
          authContext
        );
        return NextResponse.json({ success: true, milestone });
      }

      if (payload.action === "UPDATE_MILESTONE") {
        const res = await updateMilestone(
          eventId,
          payload.milestoneId,
          {
            status: payload.status,
            title: payload.title,
            description: payload.description,
            dueAt: payload.dueAt,
          },
          authContext
        );
        return NextResponse.json({ success: true, milestone: res.milestone });
      }

      if (payload.action === "DELETE_MILESTONE") {
        await deleteMilestone(eventId, payload.milestoneId, authContext);
        return NextResponse.json({ success: true });
      }

      if (payload.action === "ADD_VENDOR_TASK") {
        const task = await addVendorTask(
          eventId,
          {
            category: payload.category || "General",
            title: payload.title,
            requirements: payload.requirements,
            estimatedCostCents: payload.estimatedCostCents,
          },
          authContext
        );
        return NextResponse.json({ success: true, task });
      }

      if (payload.action === "UPDATE_VENDOR_TASK") {
        const res = await updateVendorTask(
          eventId,
          payload.taskId,
          {
            status: payload.status,
            requirements: payload.requirements,
            title: payload.title,
            category: payload.category,
            estimatedCostCents: payload.estimatedCostCents ?? undefined,
          },
          authContext
        );
        return NextResponse.json({ success: true, task: res.task });
      }

      if (payload.action === "DELETE_VENDOR_TASK") {
        await deleteVendorTask(eventId, payload.taskId, authContext);
        return NextResponse.json({ success: true });
      }

      if (payload.action === "CONVERT_IDEA") {
        const normalizedType: "BUDGET" | "TASK" =
          payload.asType === "TASK" || payload.asType === "VENDOR_TASK" || payload.asType === "MILESTONE"
            ? "TASK"
            : "BUDGET";
        const res = await convertIdeaToPlanItem(eventId, payload.ideaId, normalizedType, authContext);
        return NextResponse.json({ success: true, createdId: res.createdId });
      }

      // Default: Update Budget Item (legacy or action = UPDATE_BUDGET_ITEM)
      const result = await updateBudgetItem(
        eventId,
        payload.itemId,
        {
          estimatedCostCents: payload.estimatedCostCents,
          actualCostCents: payload.actualCostCents,
          status: payload.status,
          description: payload.description,
          category: payload.category,
        },
        authContext
      );

      return NextResponse.json({ success: true, updatedItem: result.updatedItem });
    } catch (dbError) {
      if (dbError instanceof Error && dbError.message.toLowerCase().includes("not found")) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: dbError.message },
          { status: 404 }
        );
      }
      if (dbError instanceof UnauthorizedError) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Access denied. Resource belongs to another workspace or account." },
          { status: 403 }
        );
      }
      if (dbError instanceof DatabaseConfigurationError) {
        return NextResponse.json(
          {
            error: "DATABASE_UNCONFIGURED",
            message: "PostgreSQL database is not configured in this environment.",
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

export async function DELETE(
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

    const session = await getOrCreateWorkspaceSession();
    const authContext = {
      workspaceId: session.workspaceId,
      userId: session.user?.id,
    };

    try {
      await deleteEvent(eventId, authContext);
      return NextResponse.json({ success: true, message: "Event deleted successfully." });
    } catch (dbError) {
      if (dbError instanceof UnauthorizedError) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Access denied. Resource belongs to another workspace or account." },
          { status: 403 }
        );
      }
      if (dbError instanceof DatabaseConfigurationError) {
        return NextResponse.json(
          {
            error: "DATABASE_UNCONFIGURED",
            message: "PostgreSQL database is not configured in this environment.",
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
