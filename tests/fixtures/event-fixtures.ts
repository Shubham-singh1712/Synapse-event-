import type {
  BudgetItemEntity,
  TimelineMilestoneEntity,
  VendorTaskEntity,
  EventEntity,
} from "@/lib/domain/schemas";

export const mockWorkspaceId = "11111111-1111-4111-a111-111111111111";
export const mockOtherWorkspaceId = "22222222-2222-4222-a222-222222222222";
export const mockEventId = "33333333-3333-4333-a333-333333333333";

export const sampleWeddingEvent: EventEntity = {
  id: mockEventId,
  workspaceId: mockWorkspaceId,
  title: "Sophia & Liam's Grand Wedding",
  archetype: "WEDDING",
  eventDate: "2026-11-20",
  timezone: "America/New_York",
  location: "Botanical Garden Glasshouse",
  guestCount: 120,
  totalBudgetCents: 3500000, // $35,000.00
  currency: "USD",
  preferences: { vibe: "Romantic & Elegant", dietary: ["Vegetarian", "Gluten-Free"] },
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

export const sampleBudgetItems: BudgetItemEntity[] = [
  {
    id: "b1111111-1111-4111-a111-111111111111",
    eventId: mockEventId,
    category: "VENUE",
    description: "Glasshouse Rental Deposit & Fee",
    estimatedCostCents: 1000000, // $10,000
    actualCostCents: 950000, // $9,500
    status: "PAID",
    origin: "AI_GENERATED",
    isCustomByUser: false,
    isGuestSensitive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "b2222222-2222-4222-a222-222222222222",
    eventId: mockEventId,
    category: "CATERING",
    description: "Plated 3-Course Dinner with Wine",
    estimatedCostCents: 1200000, // $12,000 ($100/guest for 120 guests)
    actualCostCents: 1250000, // $12,500
    status: "COMMITTED",
    origin: "AI_GENERATED",
    isCustomByUser: false,
    isGuestSensitive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "b3333333-3333-4333-a333-333333333333",
    eventId: mockEventId,
    category: "ENTERTAINMENT",
    description: "Live 5-Piece Jazz Band",
    estimatedCostCents: 400000, // $4,000
    actualCostCents: 400000, // $4,000
    status: "COMMITTED",
    origin: "USER_CUSTOM",
    isCustomByUser: true,
    isGuestSensitive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "b4444444-4444-4444-a444-444444444444",
    eventId: mockEventId,
    category: "PHOTOGRAPHY_VIDEO",
    description: "Full Day Photo & Drone Coverage",
    estimatedCostCents: 350000, // $3,500
    actualCostCents: 0,
    status: "ESTIMATED",
    origin: "AI_GENERATED",
    isCustomByUser: false,
    isGuestSensitive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const sampleMilestones: TimelineMilestoneEntity[] = [
  {
    id: "m1111111-1111-4111-a111-111111111111",
    eventId: mockEventId,
    title: "Secure Venue & Date",
    description: "Sign venue agreement and pay initial deposit",
    dueAt: "2026-06-01",
    offsetDaysFromEvent: -172,
    status: "COMPLETED",
    origin: "AI_GENERATED",
    isCustomByUser: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "m2222222-2222-4222-a222-222222222222",
    eventId: mockEventId,
    title: "Finalize Catering Menu Tasting",
    description: "Confirm head count and dietary requirements",
    dueAt: "2026-10-01",
    offsetDaysFromEvent: -50,
    status: "IN_PROGRESS",
    origin: "AI_GENERATED",
    isCustomByUser: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "m3333333-3333-4333-a333-333333333333",
    eventId: mockEventId,
    title: "Custom Wedding Favors Delivery",
    description: "Handcrafted candles by bride's artisan friend",
    dueAt: "2026-11-05",
    offsetDaysFromEvent: -15,
    status: "NOT_STARTED",
    origin: "USER_CUSTOM",
    isCustomByUser: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const sampleVendorTasks: VendorTaskEntity[] = [
  {
    id: "v1111111-1111-4111-a111-111111111111",
    eventId: mockEventId,
    category: "VENUE",
    title: "Confirm Load-in Window with Venue Manager",
    requirements: "Load-in starts at 9:00 AM on wedding day",
    status: "COMPLETED",
    estimatedCostCents: 0,
    origin: "AI_GENERATED",
    isCustomByUser: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "v2222222-2222-4222-a222-222222222222",
    eventId: mockEventId,
    category: "CATERING",
    title: "Submit Final Guest Count & Seating Layout",
    requirements: "Must be submitted 14 days before event",
    status: "NOT_STARTED",
    estimatedCostCents: 1200000,
    origin: "USER_CUSTOM",
    isCustomByUser: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
