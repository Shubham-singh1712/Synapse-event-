import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getEventsRoute, POST as createEventRoute } from "@/app/api/events/route";
import {
  GET as getEventByIdRoute,
  PATCH as patchEventByIdRoute,
  DELETE as deleteEventByIdRoute,
} from "@/app/api/events/[id]/route";
import { UnauthorizedError } from "@/lib/auth/guest-workspace";
import { DatabaseConfigurationError } from "@/lib/db/client";

// Mock dependencies cleanly
vi.mock("@/lib/auth/session-helper", () => ({
  getOrCreateWorkspaceSession: vi.fn(),
  setWorkspaceSessionCookie: vi.fn(),
}));

vi.mock("@/lib/ai/adapter", () => ({
  generateEventPlan: vi.fn(),
}));

vi.mock("@/lib/services/event-service", () => ({
  getUserEvents: vi.fn(),
  persistEventAndPlan: vi.fn(),
  getEventWithPlan: vi.fn(),
  updateBudgetItem: vi.fn(),
  addBudgetItem: vi.fn(),
  deleteBudgetItem: vi.fn(),
  updateMilestone: vi.fn(),
  addMilestone: vi.fn(),
  deleteMilestone: vi.fn(),
  updateVendorTask: vi.fn(),
  addVendorTask: vi.fn(),
  deleteVendorTask: vi.fn(),
  convertIdeaToPlanItem: vi.fn(),
  updateEventDetails: vi.fn(),
  deleteEvent: vi.fn(),
}));

import { getOrCreateWorkspaceSession } from "@/lib/auth/session-helper";
import { generateEventPlan } from "@/lib/ai/adapter";
import * as eventService from "@/lib/services/event-service";

describe("HTTP API Route Handlers Integration & Error Boundaries", () => {
  const validEventId = "11111111-2222-4333-8444-555555555555";
  const validWorkspaceId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const validUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getOrCreateWorkspaceSession).mockResolvedValue({
      workspaceId: validWorkspaceId,
      isAuthenticated: true,
      isNew: false,
      user: {
        id: validUserId,
        email: "test@example.com",
        name: "Test User",
        createdAt: new Date(),
      },
    });
  });

  // ============================================================================
  // POST /api/events
  // ============================================================================
  describe("POST /api/events", () => {
    it("returns 400 INVALID_JSON when request body is not valid JSON", async () => {
      const req = new NextRequest("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{malformed_json: true,",
      });

      const res = await createEventRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("INVALID_JSON");
    });

    it("returns 400 VALIDATION_FAILED when required fields are missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Incomplete Event",
          // Missing archetype, eventDate, guestCount, totalBudgetCents
        }),
      });

      const res = await createEventRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("VALIDATION_FAILED");
      expect(json.fieldErrors).toBeDefined();
    });

    it("returns 400 INVALID_EVENT_DATE when eventDate is in the past", async () => {
      const req = new NextRequest("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Past Event",
          archetype: "BIRTHDAY",
          eventDate: "2020-01-01",
          guestCount: 50,
          totalBudgetCents: 5000000,
        }),
      });

      const res = await createEventRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("INVALID_EVENT_DATE");
    });

    it("returns 500 when AI generation returns failure", async () => {
      vi.mocked(generateEventPlan).mockResolvedValue({
        success: false,
        mode: "FAILED",
        errorCode: "SERVICE_UNAVAILABLE",
        errorMessage: "Gemini quota exceeded",
        isRetryable: true,
      });

      const req = new NextRequest("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Future Birthday",
          archetype: "BIRTHDAY",
          eventDate: "2026-12-25",
          guestCount: 50,
          totalBudgetCents: 5000000,
        }),
      });

      const res = await createEventRoute(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("SERVICE_UNAVAILABLE");
    });

    it("returns 503 DATABASE_UNCONFIGURED when PostgreSQL is not provisioned", async () => {
      vi.mocked(generateEventPlan).mockResolvedValue({
        success: true,
        mode: "TEMPLATE_GENERATED",
        provider: "deterministic_template",
        modelUsed: "benchmark-v1",
        generationDurationMs: 45,
        plan: {
          budgetItems: [],
          milestones: [],
          vendorTasks: [],
          ideas: [],
          assumptions: {
            budgetAssumptions: [],
            guestCountAssumptions: [],
            locationSpecificUncertainties: [],
            itemsRequiringUserConfirmation: [],
          },
        },
      });

      vi.mocked(eventService.persistEventAndPlan).mockRejectedValue(
        new DatabaseConfigurationError("No DATABASE_URL configured")
      );

      const req = new NextRequest("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Future Wedding",
          archetype: "WEDDING",
          eventDate: "2026-12-25",
          guestCount: 150,
          totalBudgetCents: 20000000,
        }),
      });

      const res = await createEventRoute(req);
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toBe("DATABASE_UNCONFIGURED");
    });

    it("returns 201 on valid submission and persists plan atomically", async () => {
      vi.mocked(generateEventPlan).mockResolvedValue({
        success: true,
        mode: "AI_GENERATED",
        plan: {
          budgetItems: [],
          milestones: [],
          vendorTasks: [],
          ideas: [],
          assumptions: {
            budgetAssumptions: [],
            guestCountAssumptions: [],
            locationSpecificUncertainties: [],
            itemsRequiringUserConfirmation: [],
          },
        },
        provider: "gemini",
        modelUsed: "gemini-2.5-flash",
        generationDurationMs: 120,
      });

      vi.mocked(eventService.persistEventAndPlan).mockResolvedValue(undefined as never);

      const req = new NextRequest("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Grand Sangeet Night",
          archetype: "WEDDING",
          eventDate: "2026-12-25",
          guestCount: 200,
          totalBudgetCents: 35000000,
          location: "Udaipur, Rajasthan",
        }),
      });

      const res = await createEventRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.eventId).toMatch(/^[0-9a-f-]{36}$/);
      expect(json.mode).toBe("AI_GENERATED");
    });
  });

  // ============================================================================
  // GET /api/events
  // ============================================================================
  describe("GET /api/events", () => {
    it("returns 200 with user events list", async () => {
      vi.mocked(eventService.getUserEvents).mockResolvedValue([
        {
          id: validEventId,
          title: "Diwali Community Mela",
          archetype: "COMMUNITY",
          eventDate: "2026-11-01",
          location: "Bangalore",
          guestCount: 500,
          totalBudgetCents: 10000000,
          totalEstimatedCostCents: 9000000,
          currency: "INR",
          completedMilestones: 2,
          totalMilestones: 5,
          daysUntilEvent: 5,
          createdAt: new Date(),
        },
      ]);

      const res = await getEventsRoute();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.events).toHaveLength(1);
    });

    it("returns 503 when database is unconfigured", async () => {
      vi.mocked(eventService.getUserEvents).mockRejectedValue(
        new DatabaseConfigurationError("No DATABASE_URL configured")
      );

      const res = await getEventsRoute();
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toBe("DATABASE_UNCONFIGURED");
    });
  });

  // ============================================================================
  // GET /api/events/[id]
  // ============================================================================
  describe("GET /api/events/[id]", () => {
    it("returns 400 INVALID_EVENT_ID for malformed ID format", async () => {
      const req = new NextRequest("http://localhost:3000/api/events/invalid-id");
      const res = await getEventByIdRoute(req, {
        params: Promise.resolve({ id: "invalid-id" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("INVALID_EVENT_ID");
    });

    it("returns 404 EVENT_NOT_FOUND when event does not exist", async () => {
      vi.mocked(eventService.getEventWithPlan).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}`);
      const res = await getEventByIdRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("EVENT_NOT_FOUND");
    });

    it("returns 403 FORBIDDEN when user attempts to access another user's event", async () => {
      vi.mocked(eventService.getEventWithPlan).mockRejectedValue(
        new UnauthorizedError("Workspace does not own target resource")
      );

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}`);
      const res = await getEventByIdRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("FORBIDDEN");
    });

    it("returns 200 with plan when user is authorized", async () => {
      vi.mocked(eventService.getEventWithPlan).mockResolvedValue({
        event: {
          id: validEventId,
          workspaceId: validWorkspaceId,
          title: "Sangeet Night",
          archetype: "WEDDING",
          eventDate: "2026-12-01",
          timezone: "Asia/Kolkata",
          location: "Jaipur",
          guestCount: 200,
          totalBudgetCents: 15000000,
          currency: "INR",
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        budgetItems: [],
        milestones: [],
        vendorTasks: [],
        ideas: [],
        budgetSummary: {} as never,
        timelineSummary: {} as never,
        generationMode: "AI_GENERATED",
        assumptions: {
          budgetAssumptions: [],
          guestCountAssumptions: [],
          locationSpecificUncertainties: [],
          itemsRequiringUserConfirmation: [],
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}`);
      const res = await getEventByIdRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.plan.event.title).toBe("Sangeet Night");
    });
  });

  // ============================================================================
  // PATCH /api/events/[id]
  // ============================================================================
  describe("PATCH /api/events/[id]", () => {
    it("returns 400 for invalid event ID format", async () => {
      const req = new NextRequest("http://localhost:3000/api/events/not-a-uuid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_BUDGET_ITEM", itemId: "1" }),
      });

      const res = await patchEventByIdRoute(req, {
        params: Promise.resolve({ id: "not-a-uuid" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 INVALID_JSON on malformed JSON payload", async () => {
      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{malformed_patch_data",
      });

      const res = await patchEventByIdRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("INVALID_JSON");
    });

    it("returns 400 VALIDATION_FAILED when action is unknown or fields are missing", async () => {
      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UNSUPPORTED_MUTATION" }),
      });

      const res = await patchEventByIdRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("VALIDATION_FAILED");
    });

    it("returns 403 FORBIDDEN when user attempts to mutate another user's event", async () => {
      vi.mocked(eventService.addBudgetItem).mockRejectedValue(
        new UnauthorizedError("Workspace does not own target resource")
      );

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_BUDGET_ITEM",
          category: "Catering",
          description: "Unauthorized Buffet Add",
          estimatedCostCents: 500000,
        }),
      });

      const res = await patchEventByIdRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("FORBIDDEN");
    });

    it("returns 404 NOT_FOUND when target item is not found", async () => {
      vi.mocked(eventService.updateMilestone).mockRejectedValue(
        new Error("Timeline milestone not found")
      );

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MILESTONE",
          milestoneId: "m-9999",
          status: "COMPLETED",
        }),
      });

      const res = await patchEventByIdRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("NOT_FOUND");
    });

    it("successfully processes UPDATE_EVENT_DETAILS", async () => {
      vi.mocked(eventService.updateEventDetails).mockResolvedValue({
        success: true,
        event: {
          id: validEventId,
          title: "Updated Title",
        } as never,
      });

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_EVENT_DETAILS",
          title: "Updated Title",
        }),
      });

      const res = await patchEventByIdRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.event.title).toBe("Updated Title");
    });

    it("successfully processes ADD_BUDGET_ITEM and DELETE_BUDGET_ITEM", async () => {
      vi.mocked(eventService.addBudgetItem).mockResolvedValue({
        id: "b-123",
        eventId: validEventId,
        description: "New Sound System",
        estimatedCostCents: 450000,
      } as never);

      vi.mocked(eventService.deleteBudgetItem).mockResolvedValue(undefined as never);

      // Add item
      const addReq = new NextRequest(`http://localhost:3000/api/events/${validEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_BUDGET_ITEM",
          description: "New Sound System",
          estimatedCostCents: 450000,
        }),
      });
      const addRes = await patchEventByIdRoute(addReq, {
        params: Promise.resolve({ id: validEventId }),
      });
      const addJson = await addRes.json();
      expect(addRes.status).toBe(200);
      expect(addJson.item.id).toBe("b-123");

      // Delete item
      const delReq = new NextRequest(`http://localhost:3000/api/events/${validEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_BUDGET_ITEM",
          itemId: "b-123",
        }),
      });
      const delRes = await patchEventByIdRoute(delReq, {
        params: Promise.resolve({ id: validEventId }),
      });
      const delJson = await delRes.json();
      expect(delRes.status).toBe(200);
      expect(delJson.success).toBe(true);
    });

    it("successfully processes CONVERT_IDEA into a task or budget item", async () => {
      vi.mocked(eventService.convertIdeaToPlanItem).mockResolvedValue({
        success: true,
        createdId: "task-converted-999",
      });

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONVERT_IDEA",
          ideaId: "idea-888",
          asType: "TASK",
        }),
      });

      const res = await patchEventByIdRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.createdId).toBe("task-converted-999");
    });
  });

  // ============================================================================
  // DELETE /api/events/[id]
  // ============================================================================
  describe("DELETE /api/events/[id]", () => {
    it("returns 400 for invalid event ID format", async () => {
      const req = new NextRequest("http://localhost:3000/api/events/invalid", {
        method: "DELETE",
      });
      const res = await deleteEventByIdRoute(req, {
        params: Promise.resolve({ id: "invalid" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 403 when user is not authorized to delete the event", async () => {
      vi.mocked(eventService.deleteEvent).mockRejectedValue(
        new UnauthorizedError("Unauthorized")
      );

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}`, {
        method: "DELETE",
      });
      const res = await deleteEventByIdRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("FORBIDDEN");
    });

    it("returns 200 on successful event deletion", async () => {
      vi.mocked(eventService.deleteEvent).mockResolvedValue(undefined as never);

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}`, {
        method: "DELETE",
      });
      const res = await deleteEventByIdRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("deleted successfully");
    });
  });
});
