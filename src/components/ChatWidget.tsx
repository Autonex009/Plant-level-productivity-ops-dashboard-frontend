import { Fragment, useEffect, useRef, useState } from "react";

import { type ChatTurn, useChat } from "@/api/queries";

/** DeepSeek replies in markdown; the widget has no reader for the rest of
 *  it, but bare **bold** asterisks read as an obvious bug, so this handles
 *  just that one case - splitting text and re-wrapping, never parsing HTML,
 *  since the content comes from a model rather than our own code. */
function renderInline(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

// Reliable, quick clicks for demoing live in front of a client instead of
// typing on the spot - one per kind of thing it can actually answer today.
const SUGGESTED_QUESTIONS = [
  "What's today's output and plant productivity?",
  "What is the production efficiency today?",
  "Any active alerts right now?",
];

/**
 * The dashboard's chat assistant, mounted once at the app shell so it floats
 * over every page rather than living on just one screen.
 *
 * Data-aware: every message gets a fresh snapshot of today's KPIs, machine
 * states and alerts, so it answers about this plant directly rather than
 * pointing elsewhere - it only demurs on things outside today or outside
 * this plant, and says so rather than guessing.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const chat = useChat();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, chat.isPending]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chat.isPending) return;

    const next = [...turns, { role: "user" as const, content: trimmed }];
    setTurns(next);
    setInput("");
    chat.mutate(next, {
      onSuccess: (data) => setTurns((prev) => [...prev, { role: "assistant", content: data.reply }]),
      onError: (error) =>
        setTurns((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Sorry, I couldn't reach the assistant (${
              error instanceof Error ? error.message : "unknown error"
            }).`,
          },
        ]),
    });
  };

  return (
    <>
      {open && (
        <div className="panel fixed bottom-20 right-4 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden sm:right-6">
          <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-3.5 py-2.5">
            <span className="font-title text-[13px] font-semibold text-[var(--color-ink)]">Ask AI</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-[13px] leading-none text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)]"
            >
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
            {turns.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[12px] text-[var(--color-ink-muted)]">
                  Ask about today's KPIs, machine states, or active alerts for this plant.
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => submit(question)}
                      className="rounded-lg border border-[var(--color-hairline)] px-3 py-2 text-left text-[12px] text-[var(--color-ink)] transition hover:border-[var(--color-series-1)] hover:bg-[var(--color-series-1-soft)]"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[12.5px] leading-snug"
                  style={
                    turn.role === "user"
                      ? { background: "var(--color-series-1)", color: "white" }
                      : { background: "var(--color-surface-3)", color: "var(--color-ink)" }
                  }
                >
                  {renderInline(turn.content)}
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-3 py-2 text-[12.5px]"
                  style={{ background: "var(--color-surface-3)", color: "var(--color-ink-muted)" }}
                >
                  Thinking…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-center gap-2 border-t border-[var(--color-hairline)] p-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="min-w-0 flex-1 rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-1)] px-3 py-1.5 text-[12.5px] text-[var(--color-ink)] outline-none focus-visible:border-[var(--color-series-1)]"
            />
            <button
              type="submit"
              disabled={!input.trim() || chat.isPending}
              className="shrink-0 rounded-full bg-[var(--color-series-1)] px-3.5 py-1.5 text-[12px] font-medium text-white transition disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        className="fixed bottom-5 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition hover:brightness-110 sm:right-6"
        style={{ background: "var(--color-series-1)" }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="22" height="22" aria-hidden>
      <path
        d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v6A1.5 1.5 0 0 1 15.5 13H9l-3.5 3v-3H4.5A1.5 1.5 0 0 1 3 11.5v-6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden>
      <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
