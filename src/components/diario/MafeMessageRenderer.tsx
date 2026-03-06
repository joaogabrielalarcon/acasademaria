import React from "react";
import { cn } from "@/lib/utils";

interface MafeMessageRendererProps {
  content: string;
  className?: string;
}

const EMOJI_REGEX = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
const BOLD_REGEX = /\*\*(.+?)\*\*/g;
const ITALIC_REGEX = /(?<!\*)\*([^*]+?)\*(?!\*)/g;
const HR_REGEX = /^-{3,}$/;

/* ── Semantic color classification for bold segments ── */

const STATUS_WORDS = [
  "ótimo", "otimo", "bom", "requer atenção", "requer_atencao", "crítico", "critico",
  "confirmado", "salvo", "registrado", "anotado", "pronto", "concluído",
  "🟢", "🟡", "🟠", "🔴", "✅", "⚠️",
];

const AREA_PREFIXES = ["área:", "area:", "trecho:", "setor:"];

const PERSON_PREFIXES = ["equipe:", "time:"];

function classifyBold(_text: string): string {
  return "mafe-bold--status";
}

/* ── Inline parser ── */

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Process bold first, then italic within non-bold segments
  const boldParts = remaining.split(BOLD_REGEX);
  // boldParts: [before, match1, between, match2, after, ...]
  for (let i = 0; i < boldParts.length; i++) {
    const part = boldParts[i];
    if (!part) continue;

    if (i % 2 === 1) {
      // This is a bold match
      const cls = classifyBold(part);
      nodes.push(
        <strong key={key++} className={cls}>
          {part}
        </strong>
      );
    } else {
      // Process italic within non-bold text
      const italicParts = part.split(ITALIC_REGEX);
      for (let j = 0; j < italicParts.length; j++) {
        const sub = italicParts[j];
        if (!sub) continue;
        if (j % 2 === 1) {
          nodes.push(
            <em key={key++} className="mafe-italic--question">
              {sub}
            </em>
          );
        } else {
          nodes.push(<React.Fragment key={key++}>{sub}</React.Fragment>);
        }
      }
    }
  }

  return nodes;
}

/* ── Block-level parser ── */

function parseBlocks(content: string) {
  const lines = content.split("\n");
  const blocks: { type: "paragraph" | "list-item" | "emoji-line" | "hr" | "alert"; content: string }[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (HR_REGEX.test(trimmed)) {
      blocks.push({ type: "hr", content: "" });
      i++;
      continue;
    }

    // Alert block: lines starting with ⚠️
    if (trimmed.startsWith("⚠️")) {
      blocks.push({ type: "alert", content: trimmed });
      i++;
      continue;
    }

    // List items: lines starting with - or •
    if (/^[-•]\s/.test(trimmed)) {
      blocks.push({ type: "list-item", content: trimmed.replace(/^[-•]\s*/, "") });
      i++;
      continue;
    }

    // Emoji lines (start with emoji but not ⚠️)
    if (EMOJI_REGEX.test(trimmed) && !trimmed.startsWith("⚠️")) {
      blocks.push({ type: "emoji-line", content: trimmed });
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push({ type: "paragraph", content: trimmed });
    i++;
  }

  return blocks;
}

/* ── Main renderer ── */

export function MafeMessageRenderer({ content, className }: MafeMessageRendererProps) {
  if (!content) return null;

  const blocks = parseBlocks(content);

  // Group consecutive list items
  const elements: React.ReactNode[] = [];
  let key = 0;
  let listBuffer: string[] = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    elements.push(
      <ul key={key++} className="mafe-list">
        {listBuffer.map((item, idx) => (
          <li key={idx} className="mafe-list-item">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (const block of blocks) {
    if (block.type === "list-item") {
      listBuffer.push(block.content);
      continue;
    }

    flushList();

    switch (block.type) {
      case "hr":
        elements.push(<hr key={key++} className="mafe-hr" />);
        break;
      case "alert":
        elements.push(
          <div key={key++} className="mafe-alert">
            {renderInline(block.content)}
          </div>
        );
        break;
      case "emoji-line":
        elements.push(
          <p key={key++} className="mafe-emoji-line">
            {renderInline(block.content)}
          </p>
        );
        break;
      default:
        elements.push(
          <p key={key++} className="mafe-paragraph">
            {renderInline(block.content)}
          </p>
        );
    }
  }

  flushList();

  return <div className={cn("mafe-message-body", className)}>{elements}</div>;
}
