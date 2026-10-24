import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Strips raw hashtags (#) and asterisks (*) from text
 * so that no syntax symbols leak into the rendered display.
 */
function cleanText(text: string): string {
  if (!text) return "";
  return text
    // Remove leading hashtags (e.g. ###, ##, #)
    .replace(/^[ \t]*#{1,6}[ \t]*/, "")
    // Remove bold and italic asterisks
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // Remove any remaining stray asterisks or hashtags
    .replace(/\*/g, "")
    .replace(/#/g, "")
    // Remove leading quote characters
    .replace(/^[ \t]*>[ \t]*/, "")
    .trim();
}

/**
 * Clean, safe text renderer for conversational AI responses.
 * Renders structured sections, lists, and paragraphs with elegant typography
 * with ZERO hashtags (#) or asterisks (*).
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    const ListTag = currentList.type;
    const listIndex = elements.length;

    elements.push(
      <ListTag
        key={`list-${listIndex}`}
        className={`my-1.5 space-y-1 ${
          currentList.type === "ul" ? "list-disc list-inside" : "list-decimal list-inside"
        } text-xs text-primary/90`}
      >
        {currentList.items.map((item, itemIdx) => (
          <li key={`item-${itemIdx}`} className="leading-relaxed">
            {cleanText(item)}
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Numbered list item: 1. Item
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numberedMatch[2]);
      continue;
    }

    // Bullet list item: • or -
    const bulletMatch = trimmed.match(/^([*\-•])\s+(.*)/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[2]);
      continue;
    }

    flushList();

    // Section title / heading (either marked with ### in raw text, or ending with a colon :)
    const isHeading =
      trimmed.startsWith("#") ||
      (trimmed.endsWith(":") && trimmed.length < 80 && !trimmed.includes(".")) ||
      trimmed.startsWith("Recommended") ||
      trimmed.startsWith("Current Budget") ||
      trimmed.startsWith("Transparent Cost") ||
      trimmed.startsWith("Budget Impact") ||
      trimmed.startsWith("Family Coordination");

    const cleaned = cleanText(trimmed);
    if (!cleaned) continue;

    if (isHeading) {
      elements.push(
        <h4
          key={`heading-${i}`}
          className="font-serif font-semibold text-xs text-primary dark:text-champagne mt-3 mb-1 pt-0.5 first:mt-0"
        >
          {cleaned}
        </h4>
      );
    } else {
      elements.push(
        <p key={`p-${i}`} className="my-1.5 leading-relaxed text-xs text-primary/90">
          {cleaned}
        </p>
      );
    }
  }

  flushList();

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
}
