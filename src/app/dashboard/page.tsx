import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/auth-service";
import { getUserEvents } from "@/lib/services/event-service";
import { DatabaseConfigurationError } from "@/lib/db/client";
import PersonalDashboardClient from "@/components/dashboard/PersonalDashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  let eventsList: import("@/lib/services/event-service").UserEventSummaryItem[] = [];
  let isDbUnconfigured = false;

  try {
    eventsList = await getUserEvents({ userId: user.id });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      isDbUnconfigured = true;
    }
  }

  return (
    <PersonalDashboardClient
      user={user}
      initialEvents={eventsList}
      isDbUnconfigured={isDbUnconfigured}
    />
  );
}
