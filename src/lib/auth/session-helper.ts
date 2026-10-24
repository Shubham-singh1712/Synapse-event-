import { cookies } from "next/headers";
import {
  generateWorkspaceCredentials,
  DEFAULT_COOKIE_NAME,
  DEFAULT_TOKEN_VALIDITY_DAYS,
} from "./guest-workspace";
import { getCurrentUser, AuthenticatedUser } from "./auth-service";

export interface WorkspaceSessionContext {
  workspaceId: string;
  isNew: boolean;
  rawToken?: string;
  isAuthenticated: boolean;
  user?: AuthenticatedUser;
}

/**
 * Retrieves the current session context: checks for authenticated user first,
 * then falls back to guest workspace session.
 */
export async function getOrCreateWorkspaceSession(): Promise<WorkspaceSessionContext> {
  // 1. Check for logged-in user
  const user = await getCurrentUser();
  if (user) {
    return {
      workspaceId: user.id, // User ID acts as the authoritative workspace anchor
      userId: user.id,
      user,
      isAuthenticated: true,
      isNew: false,
    } as WorkspaceSessionContext & { userId: string };
  }

  // 2. Fall back to guest workspace session
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(DEFAULT_COOKIE_NAME);

  if (existingCookie?.value) {
    const parts = existingCookie.value.split(":");
    if (parts.length === 2 && parts[0] && parts[1]) {
      return {
        workspaceId: parts[0],
        rawToken: parts[1],
        isNew: false,
        isAuthenticated: false,
      };
    }
  }

  // Fresh guest credentials
  const creds = generateWorkspaceCredentials();
  return {
    workspaceId: creds.workspaceId,
    rawToken: creds.rawToken,
    isNew: true,
    isAuthenticated: false,
  };
}

/**
 * Sets the secure HTTP-only cookie for a guest workspace session.
 */
export async function setWorkspaceSessionCookie(
  workspaceId: string,
  rawToken: string
): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set(DEFAULT_COOKIE_NAME, `${workspaceId}:${rawToken}`, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * DEFAULT_TOKEN_VALIDITY_DAYS,
  });
}
