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

    const session = await getOrCreateWorkspaceSession();
    const authContext = {
      workspaceId: session.workspaceId,
      userId: session.user?.id,
    };
    const body = await req.json();
    const action = body.action;

    try {
      if (action === "UPDATE_EVENT_DETAILS") {
        if (!body.updates || typeof body.updates !== "object") {
          return NextResponse.json({ error: "INVALID_PAYLOAD", message: "updates object is required" }, { status: 400 });
        }
        const res = await updateEventDetails(eventId, body.updates, authContext);
        return NextResponse.json({ success: true, event: res.event });
      }

      if (action === "ADD_BUDGET_ITEM") {
        const item = await addBudgetItem(
          eventId,
          {
            category: body.category || "General",
            description: body.description,
            estimatedCostCents: body.estimatedCostCents,
            actualCostCents: body.actualCostCents,
            status: body.status,
            isGuestSensitive: body.isGuestSensitive,
          },
          authContext
        );
        return NextResponse.json({ success: true, item });
      }

      if (action === "DELETE_BUDGET_ITEM") {
        if (!body.itemId) {
          return NextResponse.json({ error: "MISSING_ITEM_ID", message: "itemId is required" }, { status: 400 });
        }
        await deleteBudgetItem(eventId, body.itemId, authContext);
        return NextResponse.json({ success: true });
      }

      if (action === "ADD_MILESTONE") {
        if (!body.title || !body.dueAt) {
          return NextResponse.json({ error: "MISSING_FIELDS", message: "title and dueAt are required" }, { status: 400 });
        }
        const milestone = await addMilestone(
          eventId,
          {
            title: body.title,
            dueAt: body.dueAt,
            description: body.description,
            offsetDaysFromEvent: body.offsetDaysFromEvent,
          },
          authContext
        );
        return NextResponse.json({ success: true, milestone });
      }

      if (action === "UPDATE_MILESTONE") {
        if (!body.milestoneId) {
          return NextResponse.json({ error: "MISSING_MILESTONE_ID", message: "milestoneId is required" }, { status: 400 });
        }
        const res = await updateMilestone(
          eventId,
          body.milestoneId,
          {
            status: body.status,
            title: body.title,
            description: body.description,
            dueAt: body.dueAt,
          },
          authContext
        );
        return NextResponse.json({ success: true, milestone: res.milestone });
      }

      if (action === "DELETE_MILESTONE") {
        if (!body.milestoneId) {
          return NextResponse.json({ error: "MISSING_MILESTONE_ID", message: "milestoneId is required" }, { status: 400 });
        }
        await deleteMilestone(eventId, body.milestoneId, authContext);
        return NextResponse.json({ success: true });
      }

      if (action === "ADD_VENDOR_TASK") {
        if (!body.title) {
          return NextResponse.json({ error: "MISSING_FIELDS", message: "title is required" }, { status: 400 });
        }
        const task = await addVendorTask(
          eventId,
          {
            category: body.category || "General",
            title: body.title,
            requirements: body.requirements,
            estimatedCostCents: body.estimatedCostCents,
          },
          authContext
        );
        return NextResponse.json({ success: true, task });
      }

      if (action === "UPDATE_VENDOR_TASK") {
        if (!body.taskId) {
          return NextResponse.json({ error: "MISSING_TASK_ID", message: "taskId is required" }, { status: 400 });
        }
        const res = await updateVendorTask(
          eventId,
          body.taskId,
          {
            status: body.status,
            requirements: body.requirements,
            title: body.title,
            category: body.category,
            estimatedCostCents: body.estimatedCostCents,
          },
          authContext
        );
        return NextResponse.json({ success: true, task: res.task });
      }

      if (action === "DELETE_VENDOR_TASK") {
        if (!body.taskId) {
          return NextResponse.json({ error: "MISSING_TASK_ID", message: "taskId is required" }, { status: 400 });
        }
        await deleteVendorTask(eventId, body.taskId, authContext);
        return NextResponse.json({ success: true });
      }

      if (action === "CONVERT_IDEA") {
        if (!body.ideaId || !body.asType) {
          return NextResponse.json({ error: "MISSING_PARAMETERS", message: "ideaId and asType are required" }, { status: 400 });
        }
        const res = await convertIdeaToPlanItem(eventId, body.ideaId, body.asType, authContext);
        return NextResponse.json({ success: true, createdId: res.createdId });
      }

      // Default: Update Budget Item (legacy or action = UPDATE_BUDGET_ITEM)
      if (!body.itemId || typeof body.itemId !== "string") {
        return NextResponse.json(
          { error: "MISSING_ITEM_ID", message: "itemId is required in request body." },
          { status: 400 }
        );
      }

      const result = await updateBudgetItem(
        eventId,
        body.itemId,
        {
          estimatedCostCents: body.estimatedCostCents,
          actualCostCents: body.actualCostCents,
          status: body.status,
          description: body.description,
          category: body.category,
        },
        authContext
      );

      return NextResponse.json({ success: true, updatedItem: result.updatedItem });
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
