import { useEffect, useState } from "react";
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
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErr("Sign in to use Chat.");
        return;
      }
      setMe(user.id);
      if (initialUserId && initialUserId !== user.id) {
        await openOrCreate(user.id, initialUserId);
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
    const email = inc?.author_email || userId.slice(0, 8);
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
    if (!activeId && list[0]) setActiveId(list[0].id);
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
    if (existing) {
      setActiveId(existing.id);
      return existing.id as string;
    }
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ participant_a: a, participant_b: b })
      .select("*")
      .single();
    if (error) {
      setErr(error.message);
      return null;
    }
    setActiveId(created.id);
    return created.id as string;
  }

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
  };

  if (err === "Sign in to use Chat.") {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center text-slate-400">
        Sign in to send and receive private messages.
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-4xl overflow-hidden rounded-2xl border border-slate-800">
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900/40 md:w-72">
        {convos.length === 0 && (
          <p className="p-4 text-xs text-slate-500">No conversations yet. Use Message privately on a report.</p>
        )}
        {convos.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={`block w-full truncate px-3 py-3 text-left text-xs ${
              activeId === c.id ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
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
          <div className="flex gap-2 border-t border-slate-800 p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
            />
            <button onClick={send} className="rounded-lg bg-white p-2 text-slate-900">
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
