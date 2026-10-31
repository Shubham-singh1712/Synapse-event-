"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Lightbulb,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { EventEntity } from "@/lib/domain/schemas";
import { formatCentsToCurrency } from "@/lib/domain/money";
import type {
  CopilotChatResponse,
  CopilotProposedAction,
} from "@/lib/domain/copilot-contracts";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

interface Props {
  event: EventEntity;
  currency: string;
  currencySymbol: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: "overview" | "budget" | "plan" | "vendors" | "ideas" | "impact") => void;
  onAddBudget: (item: {
    category: string;
    description: string;
    estimatedCostCents: number;
    status: "ESTIMATED";
    isGuestSensitive: boolean;
  }) => Promise<void>;
  onAddTask: (task: {
    category: string;
    title: string;
    requirements?: string;
    estimatedCostCents?: number;
  }) => Promise<void>;
  showFeedback: (type: "success" | "error", text: string) => void;
  initialPrompt?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  suggestedActions?: CopilotProposedAction[];
  contextSummary?: string;
  provider?: "gemini" | "deterministic_copilot";
  modelUsed?: string;
}

const STARTER_PROMPTS = [
  "How much to add a kids' dance competition?",
  "Help me plan the next seven days.",
  "How can I stay within my budget?",
  "What should I book first?",
  "What if 10 more guests attend?",
  "Create a checklist for coordinating my family.",
];

export function CelebrationCopilotDrawer({
  event,
  currency,
  currencySymbol: _currencySymbol,
  isOpen,
  onClose,
  onNavigateTab,
  onAddBudget,
  onAddTask,
  showFeedback,
  initialPrompt,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [appliedActionIds, setAppliedActionIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with greeting if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome-1",
          role: "assistant",
          content: `Hello! I am your Celebration Copilot for ${event.title}.\n\nHow can I help you coordinate and plan your celebration today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          provider: "deterministic_copilot",
          modelUsed: "synapse-celebration-advisor-v1",
        },
      ]);
    }
  }, [event.title, messages.length]);

  // Handle external initial prompt trigger (e.g. from Budget or Impact tab)
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when opened (with cleanup on close/unmount)
  useEffect(() => {
    if (isOpen) {
      const focusTimer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(focusTimer);
    }
    return undefined;
  }, [isOpen]);

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome-1")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`/api/events/${event.id}/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history,
        }),
      });

      if (!res.ok) {
        let errorMsg = "Failed to reach AI Copilot.";
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch {
          errorMsg = `Server error (${res.status}). The service is updating or initializing. Please retry in a moment.`;
        }
        throw new Error(errorMsg);
      }

      let data: CopilotChatResponse;
      try {
        data = await res.json();
      } catch {
        throw new Error("Received an unexpected response format from server. Please retry.");
      }

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedActions: data.suggestedActions,
        contextSummary: data.contextSummary,
        provider: data.provider,
        modelUsed: data.modelUsed,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error contacting Copilot";
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `I encountered a problem retrieving assistance: ${errorMsg}. Please try again or pick one of the suggested prompts below.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          provider: "deterministic_copilot",
        },
      ]);
      showFeedback("error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute proposed action with explicit user confirmation
  const handleApplyAction = async (action: CopilotProposedAction) => {
    if (appliedActionIds.has(action.id)) return;

    try {
      if (action.type === "PROPOSE_BUDGET_ITEM") {
        await onAddBudget({
          category: action.payload.category || "General",
          description: `[AI Copilot] ${action.title}`,
          estimatedCostCents: action.payload.amountCents || 1000000,
          status: "ESTIMATED",
          isGuestSensitive: false,
        });
        setAppliedActionIds((prev) => new Set([...prev, action.id]));
        showFeedback("success", `Added "${action.title}" to Budget Ledger.`);
      } else if (action.type === "PROPOSE_TASK") {
        await onAddTask({
          category: action.payload.category || "General",
          title: action.title,
          requirements: action.description,
          estimatedCostCents: action.payload.amountCents,
        });
        setAppliedActionIds((prev) => new Set([...prev, action.id]));
        showFeedback("success", `Added "${action.title}" to Plan & Checklist.`);
      } else if (action.type === "NAVIGATE_TAB" && action.payload.targetTab) {
        onNavigateTab(
          action.payload.targetTab as "overview" | "budget" | "plan" | "vendors" | "ideas" | "impact"
        );
        onClose();
      } else if (action.type === "PROPOSE_PLAN_ADJUSTMENT") {
        onNavigateTab("impact");
        onClose();
        showFeedback("success", "Opened Plan Adjustments simulator.");
      }
    } catch {
      showFeedback("error", "Failed to apply proposed action.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`bg-surface border-l border-champagne/40 h-full flex flex-col shadow-2xl transition-all duration-300 relative ${
          isExpanded ? "w-full max-w-4xl" : "w-full max-w-lg"
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between bg-page/70 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-aubergine dark:bg-champagne text-white dark:text-aubergine flex items-center justify-center shadow-subtle">
              <Sparkles className="w-5 h-5 text-coral" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-normal text-primary">
                  AI Celebration Copilot
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Live Context
                </span>
              </div>
              <p className="text-[11px] text-muted truncate max-w-[240px] sm:max-w-xs">
                Planning for {event.title} • {event.guestCount} Guests
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-muted hover:text-primary transition rounded-lg hidden sm:block"
              title={isExpanded ? "Collapse width" : "Expand width"}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-primary transition rounded-lg"
              title="Close Copilot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Grounding Info Banner */}
        <div className="px-4 py-2 bg-champagne/10 border-b border-champagne/20 text-[11px] text-secondary flex items-center gap-2 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-champagne shrink-0" />
          <span className="truncate">
            Private &amp; Authorized. All budget math verified deterministically.
          </span>
        </div>

        {/* Message Stream */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs"
        >
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-aubergine/10 text-aubergine dark:text-champagne flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 space-y-2.5 shadow-subtle ${
                    isUser
                      ? "bg-aubergine text-white dark:bg-champagne dark:text-aubergine rounded-br-none"
                      : "bg-page/80 border border-border/80 text-primary rounded-bl-none"
                  }`}
                >
                  {/* Body text with clean styling */}
                  {isUser ? (
                    <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                      {msg.content}
                    </div>
                  ) : (
                    <MarkdownRenderer content={msg.content} className="font-sans text-xs" />
                  )}

                  {/* Provider tag */}
                  {!isUser && (
                    <div className="flex items-center justify-between text-[10px] text-muted pt-1 border-t border-border/50">
                      <span>{msg.timestamp}</span>
                      <span className="font-mono">
                        {msg.provider === "gemini" ? "Google Gemini" : "Celebration Advisor"}
                      </span>
                    </div>
                  )}

                  {/* Suggested Action Preview Cards */}
                  {!isUser &&
                    msg.suggestedActions &&
                    msg.suggestedActions.length > 0 && (
                      <div className="pt-2 space-y-2">
                        <span className="text-[10px] font-serif uppercase tracking-wider text-coral block font-semibold">
                          Proposed Action:
                        </span>
                        {msg.suggestedActions.map((act) => {
                          const isApplied = appliedActionIds.has(act.id);
                          return (
                            <div
                              key={act.id}
                              className="p-3 rounded-xl bg-surface border border-champagne/30 text-primary space-y-1.5 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium text-xs text-primary leading-snug">
                                  {act.title}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-coral/10 text-coral">
                                  {act.type.replace("PROPOSE_", "").replace("_", " ")}
                                </span>
                              </div>

                              <p className="text-[11px] text-muted leading-relaxed">
                                {act.description}
                              </p>

                              {act.payload.amountCents && (
                                <span className="font-mono text-secondary text-xs block">
                                  Amount: {formatCentsToCurrency(act.payload.amountCents, currency)}
                                </span>
                              )}

                              <div className="pt-1 flex items-center justify-between">
                                {isApplied ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Accepted &amp; Added</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleApplyAction(act)}
                                    className="px-3 py-1 rounded-lg bg-coral hover:bg-coral-hover text-white text-[11px] font-medium transition shadow-sm flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Accept Suggestion</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-coral/15 text-coral flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-aubergine/10 text-aubergine dark:text-champagne flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-page/80 border border-border/80 text-xs text-muted flex items-center gap-2 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-champagne animate-spin" />
                <span>Consulting celebration records and planning rules...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Starter Prompts Pills */}
        <div className="p-3 bg-page/40 border-t border-border/70 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted mb-2 font-medium">
            <Lightbulb className="w-3.5 h-3.5 text-champagne" />
            <span>Suggested Inquiries:</span>
          </div>
          <div
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 select-none text-[11px]"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {STARTER_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-surface hover:bg-surface-elevated border border-border/80 hover:border-champagne text-secondary hover:text-primary whitespace-nowrap transition shadow-sm"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="p-3 sm:p-4 border-t border-border/80 bg-surface shrink-0 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about budget, week schedule, or vendor bookings..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-page border border-border rounded-xl px-3.5 py-2.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-coral transition"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-2.5 rounded-xl bg-aubergine dark:bg-champagne hover:bg-aubergine-dark dark:hover:bg-champagne-dark text-white dark:text-aubergine disabled:opacity-40 transition shadow-subtle shrink-0"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
