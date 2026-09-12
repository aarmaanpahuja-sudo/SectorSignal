import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Props {
  initialUserId?: string | null;
}

type Convo = {
  id: string;
  otherId: string;
  label: string;
};

type Msg = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function ChatPage({ initialUserId }: Props) {
  const [me, setMe] = useState<string | null>(null);
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const [emailInput, setEmailInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const preferredOtherId = useRef<string | null>(initialUserId ?? null);

  useEffect(() => {
    preferredOtherId.current = initialUserId ?? preferredOtherId.current;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErr("Sign in to use Chat.");
        return;
      }
      setMe(user.id);
      if (preferredOtherId.current && preferredOtherId.current !== user.id) {
        const id = await openOrCreate(user.id, preferredOtherId.current);
        if (id) setActiveId(id);
      }
      await loadConvos(user.id);
    })();
  }, [initialUserId]);

  async function labelFor(userId: string): Promise<string> {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();
    const name = profile?.display_name || "Neighbor";
    const { data: inc } = await supabase
      .from("incidents")
      .select("author_email")
      .eq("user_id", userId)
      .not("author_email", "is", null)
      .limit(1)
      .maybeSingle();
    const email = inc?.author_email || "unknown email";
    return `${email} - ${name}`;
  }

  async function loadConvos(myId: string) {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_a.eq.${myId},participant_b.eq.${myId}`)
      .order("created_at", { ascending: false });

    const list: Convo[] = [];
    for (const c of data || []) {
      const otherId = c.participant_a === myId ? c.participant_b : c.participant_a;
      list.push({ id: c.id, otherId, label: await labelFor(otherId) });
    }
    setConvos(list);

    const preferred = preferredOtherId.current;
    const match = preferred ? list.find((c) => c.otherId === preferred) : null;
    if (match) {
      setActiveId(match.id);
    } else if (!activeId && list[0]) {
      setActiveId(list[0].id);
    }
  }

  async function openOrCreate(myId: string, otherId: string) {
    const a = myId < otherId ? myId : otherId;
    const b = myId < otherId ? otherId : myId;
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("participant_a", a)
      .eq("participant_b", b)
      .maybeSingle();
    if (existing) return existing.id as string;
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ participant_a: a, participant_b: b })
      .select("*")
      .single();
    if (error) {
      setErr(error.message);
      return null;
    }
    return created.id as string;
  }

  const startByEmail = async () => {
    if (!me) return;
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    const { data: inc, error } = await supabase
      .from("incidents")
      .select("user_id")
      .eq("author_email", email)
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (error || !inc?.user_id) {
      setErr("No signed-in neighbor found with that email (they must have posted a report while signed in).");
      return;
    }
    if (inc.user_id === me) {
      setErr("That’s your email.");
      return;
    }
    preferredOtherId.current = inc.user_id;
    const id = await openOrCreate(me, inc.user_id);
    if (id) setActiveId(id);
    setEmailInput("");
    setErr(null);
    await loadConvos(me);
  };

  useEffect(() => {
    if (!activeId) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      setMessages((data || []) as Msg[]);
    })();

    const channel = supabase
      .channel(`chat-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Msg])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId]);
    useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, activeId]);

  const notifyOther = async (conversationId: string) => {
    const convo = convos.find((c) => c.id === conversationId);
    const otherId = convo?.otherId;
    if (!otherId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-incident-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          kind: "message",
          target_user_id: otherId,
          title: "New message",
          category: "message",
        }),
      });
    } catch {
      // non-blocking
    }
  };

  const send = async () => {
    if (!me || !activeId || !text.trim()) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender_id: me,
      body,
    });
    if (error) setErr(error.message);
    else notifyOther(activeId);
  };

  if (err === "Sign in to use Chat.") {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center text-slate-400">
        Sign in to send and receive private messages.
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 md:flex-row">
      <aside className="max-h-40 shrink-0 overflow-y-auto border-b border-slate-800 bg-slate-900/40 md:max-h-none md:w-72 md:border-b-0 md:border-r">
        <div className="flex gap-2 p-2">
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startByEmail()}
            placeholder="Message by email…"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white outline-none"
          />
          <button
            onClick={startByEmail}
            className="shrink-0 rounded-lg bg-white px-2 text-xs font-medium text-slate-900"
          >
            Start
          </button>
        </div>
        {convos.length === 0 && (
          <p className="p-4 text-xs text-slate-500">No conversations yet. Use Message privately or type an email.</p>
        )}
        {convos.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              preferredOtherId.current = c.otherId;
              setActiveId(c.id);
            }}
            className={`block w-full truncate px-3 py-3 text-left text-xs ${
              activeId === c.id ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </aside>
            <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={threadRef}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                m.sender_id === me ? "ml-auto bg-white text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {m.body}
            </div>
          ))}
        </div>
        {activeId && (
          <div className="flex shrink-0 items-center gap-2 border-t border-slate-800 p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
            />
            <button onClick={send} className="shrink-0 rounded-lg bg-white p-2 text-slate-900">
              <Send size={16} />
            </button>
          </div>
        )}
        {err && err !== "Sign in to use Chat." && (
          <p className="px-3 pb-2 text-xs text-red-400">{err}</p>
        )}
      </section>
    </div>
  );
}
