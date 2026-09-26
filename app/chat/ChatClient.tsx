"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";

export type ChatMessage = {
  id: number;
  club_id: string;
  user_id: string;
  player_id: number | null;
  author_name: string;
  body: string;
  created_at: string;
};

type Props = {
  initialMessages: ChatMessage[];
  currentUserId: string;
  canManage: boolean;
};

function formatDay(value: string, locale: AppLocale) {
  return new Date(value).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(value: string, locale: AppLocale) {
  return new Date(value).toLocaleTimeString(locale === "de" ? "de-DE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sameDay(a: string, b: string) {
  const left = new Date(a);
  const right = new Date(b);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function ChatClient({
  initialMessages,
  currentUserId,
  canManage,
}: Props) {
  const { locale, t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const latestMessageIdRef = useRef(
    initialMessages[initialMessages.length - 1]?.id ?? 0,
  );

  function isNearBottom() {
    const node = scrollRef.current;
    if (!node) return true;
    return node.scrollHeight - node.scrollTop - node.clientHeight < 140;
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }

  useEffect(() => {
    scrollToBottom("auto");
  }, []);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    async function refresh() {
      if (document.visibilityState === "hidden") return;

      controller?.abort();
      controller = new AbortController();
      const shouldScroll = isNearBottom();

      try {
        setLoading(true);
        const response = await fetch("/api/chat/messages", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { messages?: ChatMessage[] };
        if (!active || !Array.isArray(payload.messages)) return;

        const nextMessages = payload.messages;
        const nextLatestId = nextMessages[nextMessages.length - 1]?.id ?? 0;
        const hasNewMessage = nextLatestId > latestMessageIdRef.current;

        setMessages(nextMessages);
        latestMessageIdRef.current = nextLatestId;

        if (hasNewMessage && shouldScroll) {
          window.requestAnimationFrame(() => scrollToBottom());
        }
      } catch (refreshError) {
        if (
          refreshError instanceof DOMException &&
          refreshError.name === "AbortError"
        ) {
          return;
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, 4000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: ChatMessage; error?: string }
        | null;

      if (!response.ok || !payload?.message) {
        throw new Error(payload?.error || t("chat.sendFailed"));
      }

      setMessages((current) => {
        if (current.some((entry) => entry.id === payload.message?.id)) {
          return current;
        }
        return [...current, payload.message as ChatMessage].slice(-100);
      });
      latestMessageIdRef.current = Math.max(
        latestMessageIdRef.current,
        payload.message.id,
      );
      setDraft("");
      window.requestAnimationFrame(() => scrollToBottom());
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : t("chat.sendFailed"),
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function deleteMessage(message: ChatMessage) {
    const allowed = canManage || message.user_id === currentUserId;
    if (!allowed) return;

    if (!window.confirm(t("chat.deleteConfirm"))) return;

    setError(null);

    try {
      const response = await fetch("/api/chat/messages", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: message.id }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || t("chat.deleteFailed"));
      }

      setMessages((current) =>
        current.filter((entry) => entry.id !== message.id),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("chat.deleteFailed"),
      );
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-150px)] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <div className="text-sm font-black text-slate-950">{t("chat.title")}</div>
          <div className="text-[11px] font-medium text-slate-500">
            {t("chat.clubMembers")}
          </div>
        </div>
        <div className="text-[10px] font-bold text-slate-400">
          {loading ? t("chat.refreshing") : t("chat.live")}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50/60 px-3 py-4 sm:px-4"
      >
        {messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
            <div className="text-3xl">💬</div>
            <div className="mt-2 text-sm font-black text-slate-900">
              {t("chat.emptyTitle")}
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              {t("chat.emptyHint")}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => {
          const mine = message.user_id === currentUserId;
          const previous = messages[index - 1];
          const showDay =
            !previous || !sameDay(previous.created_at, message.created_at);
          const canDelete = mine || canManage;

          return (
            <div key={message.id}>
              {showDay ? (
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">
                    {formatDay(message.created_at, locale)}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              ) : null}

              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`group max-w-[86%] sm:max-w-[72%]`}>
                  {!mine ? (
                    <div className="mb-1 px-1 text-[10px] font-black text-slate-500">
                      {message.author_name}
                    </div>
                  ) : null}

                  <div
                    className={[
                      "rounded-[20px] px-3.5 py-2.5 shadow-sm",
                      mine
                        ? "rounded-br-md bg-slate-950 text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-900",
                    ].join(" ")}
                  >
                    <div className="whitespace-pre-wrap break-words text-sm leading-5">
                      {message.body}
                    </div>
                    <div
                      className={[
                        "mt-1 flex items-center justify-end gap-2 text-[9px] font-medium",
                        mine ? "text-white/45" : "text-slate-400",
                      ].join(" ")}
                    >
                      <span>{formatTime(message.created_at, locale)}</span>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => void deleteMessage(message)}
                          className={mine ? "text-white/45 hover:text-white" : "text-slate-400 hover:text-rose-600"}
                        >
                          {t("chat.delete")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => void sendMessage(event)}
        className="border-t border-slate-200 bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]"
      >
        {error ? (
          <div className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            maxLength={500}
            rows={1}
            placeholder={t("chat.placeholder")}
            className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? "…" : t("chat.send")}
          </button>
        </div>
        <div className="mt-1 px-1 text-right text-[9px] font-medium text-slate-400">
          {draft.length}/500
        </div>
      </form>
    </div>
  );
}
