import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as signInRoute } from "@/app/api/auth/sign-in/route";
import { POST as signUpRoute } from "@/app/api/auth/sign-up/route";
import { POST as copilotRoute } from "@/app/api/events/[id]/copilot/route";
import { AuthenticationError } from "@/lib/auth/auth-service";
import { UnauthorizedError } from "@/lib/auth/guest-workspace";
import { DatabaseConfigurationError } from "@/lib/db/client";

// Mock auth-service
vi.mock("@/lib/auth/auth-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/auth-service")>("@/lib/auth/auth-service");
  return {
    ...actual,
    signInUser: vi.fn(),
    signUpUser: vi.fn(),
    setAuthSessionCookie: vi.fn(),
  };
});

// Mock session-helper
vi.mock("@/lib/auth/session-helper", () => ({
  getOrCreateWorkspaceSession: vi.fn(),
  setWorkspaceSessionCookie: vi.fn(),
}));

// Mock event-service
vi.mock("@/lib/services/event-service", () => ({
  getEventWithPlan: vi.fn(),
}));

// Mock copilot AI engine
vi.mock("@/lib/ai/copilot", () => ({
  executeCopilotChat: vi.fn(),
}));

import { signInUser, signUpUser, setAuthSessionCookie } from "@/lib/auth/auth-service";
import { getOrCreateWorkspaceSession } from "@/lib/auth/session-helper";
import { getEventWithPlan } from "@/lib/services/event-service";
import { executeCopilotChat } from "@/lib/ai/copilot";

describe("Batch A — API Boundary Correctness & Validation", () => {
  const validEventId = "11111111-2222-4333-8444-555555555555";
  const validWorkspaceId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getOrCreateWorkspaceSession).mockResolvedValue({
      workspaceId: validWorkspaceId,
      isAuthenticated: true,
      isNew: false,
      user: {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        createdAt: new Date(),
      },
    });
  });

  // ============================================================================
  // POST /api/auth/sign-in
  // ============================================================================
  describe("POST /api/auth/sign-in", () => {
    it("returns 400 INVALID_JSON when body is malformed JSON", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ malformed json",
      });

      const res = await signInRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("INVALID_JSON");
      expect(json.message).toContain("valid JSON");
      expect(signInUser).not.toHaveBeenCalled();
    });

    it("returns 400 VALIDATION_ERROR when email or password is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "" }),
      });

      const res = await signInRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("VALIDATION_ERROR");
      expect(signInUser).not.toHaveBeenCalled();
    });

    it("returns 400 VALIDATION_ERROR when email format is invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "mypassword" }),
      });

      const res = await signInRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("VALIDATION_ERROR");
      expect(json.message).toContain("valid email");
      expect(signInUser).not.toHaveBeenCalled();
    });

    it("returns 401 AUTH_ERROR when credentials are wrong", async () => {
      vi.mocked(signInUser).mockRejectedValue(
        new AuthenticationError("Invalid email or password.")
      );

      const req = new NextRequest("http://localhost:3000/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "wrongpassword" }),
      });

      const res = await signInRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("AUTH_ERROR");
      expect(json.message).toBe("Invalid email or password.");
    });

    it("returns 503 DATABASE_UNCONFIGURED when DB is not configured", async () => {
      vi.mocked(signInUser).mockRejectedValue(
        new DatabaseConfigurationError("DB unconfigured")
      );

      const req = new NextRequest("http://localhost:3000/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      });

      const res = await signInRoute(req);
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toBe("DATABASE_UNCONFIGURED");
    });

    it("returns 200 on successful sign-in and sets session cookie", async () => {
      vi.mocked(signInUser).mockResolvedValue({
        user: {
          id: "u-1",
          email: "user@example.com",
          name: "Test User",
          createdAt: new Date(),
        },
        sessionToken: "session-token-xyz",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      });

      const res = await signInRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.user.email).toBe("user@example.com");
      expect(setAuthSessionCookie).toHaveBeenCalledWith("session-token-xyz");
    });
  });

  // ============================================================================
  // POST /api/auth/sign-up
  // ============================================================================
  describe("POST /api/auth/sign-up", () => {
    it("returns 400 INVALID_JSON when body is malformed JSON", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ not valid json",
      });

      const res = await signUpRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("INVALID_JSON");
      expect(signUpUser).not.toHaveBeenCalled();
    });

    it("returns 400 VALIDATION_ERROR when password is shorter than 8 chars", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "user@example.com",
          password: "short",
        }),
      });

      const res = await signUpRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("VALIDATION_ERROR");
      expect(json.message).toContain("8 characters");
      expect(signUpUser).not.toHaveBeenCalled();
    });

    it("returns 400 VALIDATION_ERROR when name is shorter than 2 chars", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "A",
          email: "user@example.com",
          password: "password123",
        }),
      });

      const res = await signUpRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("VALIDATION_ERROR");
      expect(signUpUser).not.toHaveBeenCalled();
    });

    it("returns 400 AUTH_ERROR when user already exists", async () => {
      vi.mocked(signUpUser).mockRejectedValue(
        new AuthenticationError("An account with this email address already exists.")
      );

      const req = new NextRequest("http://localhost:3000/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Existing User",
          email: "existing@example.com",
          password: "password123",
        }),
      });

      const res = await signUpRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("AUTH_ERROR");
      expect(json.message).toContain("already exists");
    });

    it("returns 201 on successful sign-up and sets session cookie", async () => {
      vi.mocked(signUpUser).mockResolvedValue({
        user: {
          id: "u-new",
          email: "newuser@example.com",
          name: "New User",
          createdAt: new Date(),
        },
        sessionToken: "new-session-token",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New User",
          email: "newuser@example.com",
          password: "password123",
        }),
      });

      const res = await signUpRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.user.name).toBe("New User");
      expect(setAuthSessionCookie).toHaveBeenCalledWith("new-session-token");
    });
  });

  // ============================================================================
  // POST /api/events/[id]/copilot
  // ============================================================================
  describe("POST /api/events/[id]/copilot", () => {
    it("returns 400 for invalid event ID format", async () => {
      const req = new NextRequest("http://localhost:3000/api/events/invalid-id/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello" }),
      });

      const res = await copilotRoute(req, {
        params: Promise.resolve({ id: "invalid-id" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("INVALID_EVENT_ID");
      expect(executeCopilotChat).not.toHaveBeenCalled();
    });

    it("returns 400 INVALID_JSON for malformed JSON body", async () => {
      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ malformed json",
      });

      const res = await copilotRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("INVALID_JSON");
      expect(getEventWithPlan).not.toHaveBeenCalled();
      expect(executeCopilotChat).not.toHaveBeenCalled();
    });

    it("returns 400 VALIDATION_FAILED when message is empty or missing", async () => {
      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "" }),
      });

      const res = await copilotRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("VALIDATION_FAILED");
      expect(getEventWithPlan).not.toHaveBeenCalled();
      expect(executeCopilotChat).not.toHaveBeenCalled();
    });

    it("returns 404 EVENT_NOT_FOUND when event does not exist", async () => {
      vi.mocked(getEventWithPlan).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "How can I reduce budget?" }),
      });

      const res = await copilotRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("EVENT_NOT_FOUND");
      expect(executeCopilotChat).not.toHaveBeenCalled();
    });

    it("returns 403 FORBIDDEN when user does not own event", async () => {
      vi.mocked(getEventWithPlan).mockRejectedValue(
        new UnauthorizedError("Access denied.")
      );

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "How can I reduce budget?" }),
      });

      const res = await copilotRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("FORBIDDEN");
      expect(executeCopilotChat).not.toHaveBeenCalled();
    });

    it("returns 200 with copilot response for valid request", async () => {
      const mockPlan = {
        event: { id: validEventId, name: "Anniversary Gala" },
        budgetItems: [],
        timelineMilestones: [],
        vendorTasks: [],
        ideas: [],
      };
      vi.mocked(getEventWithPlan).mockResolvedValue(mockPlan as never);

      const mockCopilotResponse = {
        success: true,
        reply: "You can optimize catering to save 15%.",
        suggestedActions: [],
        followUpPrompts: ["Review catering menu"],
        provider: "deterministic_copilot" as const,
        modelUsed: "synapse-rules-engine",
        generationDurationMs: 12,
      };
      vi.mocked(executeCopilotChat).mockResolvedValue(mockCopilotResponse);

      const req = new NextRequest(`http://localhost:3000/api/events/${validEventId}/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "How can I reduce budget?",
          intent: "BUDGET_ANALYSIS",
        }),
      });

      const res = await copilotRoute(req, {
        params: Promise.resolve({ id: validEventId }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.reply).toBe("You can optimize catering to save 15%.");
      expect(executeCopilotChat).toHaveBeenCalledWith(mockPlan, expect.objectContaining({
        message: "How can I reduce budget?",
        intent: "BUDGET_ANALYSIS",
      }));
    });
  });
});
