/**
 * Shared Client & Server Return URL and Archetype Helpers
 * Free of "next/headers" or server-only imports so it can be safely used in Client Components.
 */

export type ValidArchetype = "WEDDING" | "BIRTHDAY" | "COMMUNITY";

export const VALID_ARCHETYPES: readonly ValidArchetype[] = [
  "WEDDING",
  "BIRTHDAY",
  "COMMUNITY",
] as const;

/**
 * Validates redirect paths to prevent open redirect vulnerabilities and redirect loops.
 */
export function sanitizeRedirectPath(path?: string | null): string {
  if (!path) return "/dashboard";
  const trimmed = path.trim();
  // Must be a relative path starting with '/' and NOT with '//' (protocol-relative) and no backslashes
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes("\\") &&
    !trimmed.startsWith("/sign-in") &&
    !trimmed.startsWith("/sign-up")
  ) {
    return trimmed;
  }
  return "/dashboard";
}

/**
 * Validates whether an event archetype parameter corresponds to a supported domain archetype.
 */
export function validateArchetype(type?: string | null): ValidArchetype | null {
  if (!type) return null;
  const upper = type.trim().toUpperCase();
  if (upper === "WEDDING" || upper === "BIRTHDAY" || upper === "COMMUNITY") {
    return upper as ValidArchetype;
  }
  return null;
}

/**
 * Constructs a safe authentication URL preserving returnUrl and event archetype.
 */
export function buildAuthRedirectUrl(
  type?: string | null,
  returnUrl?: string | null,
  authPath: "/sign-in" | "/sign-up" = "/sign-in"
): string {
  const archetype = validateArchetype(type);
  const target = returnUrl
    ? sanitizeRedirectPath(returnUrl)
    : archetype
    ? `/events/new?type=${archetype}`
    : "/events/new";

  const safeTarget = target !== "/dashboard" ? target : "/events/new";
  const params = new URLSearchParams();
  params.set("returnUrl", safeTarget);
  if (archetype) {
    params.set("type", archetype);
  }

  return `${authPath}?${params.toString()}`;
}
