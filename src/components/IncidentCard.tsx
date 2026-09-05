import { useState } from "react";
import { Check, ThumbsUp, MessageSquare, MapPin, Send, ShieldCheck, Maximize2 } from "lucide-react";
import { CATEGORIES } from "../lib/categories";
import type { Incident, Comment } from "../lib/supabase";
import { timeAgo } from "../lib/geo";
import MiniMap from "./MiniMap";

interface Props {
  incident: Incident;
  comments: Comment[];
  onResolve: (id: string) => Promise<void>;
  onUnresolve: (id: string) => Promise<void>;
  onVerify: (id: string) => Promise<void>;
  onComment: (incidentId: string, body: string, authorName: string) => Promise<unknown>;
    authorName: string;
  onOpenMap: (incident: Incident) => void;
  onMessagePoster?: (incident: Incident) => void;
}

export default function IncidentCard({ incident, comments, onResolve, onVerify, onComment, authorName, onOpenMap, onMessagePoster, onUnresolve }: Props) {
  const meta = CATEGORIES[incident.category];
  const Icon = meta.icon;
  const resolved = incident.status === "resolved";
  const incidentComments = comments.filter((c) => c.incident_id === incident.id);

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const hasCoords = incident.latitude != null && incident.longitude != null;

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      await onComment(incident.id, commentText.trim(), authorName);
      setCommentText("");
    } finally {
      setPosting(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await onVerify(incident.id);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className={`wt-fade-up rounded-2xl border bg-slate-900/60 backdrop-blur-sm transition-all duration-200 hover:border-slate-700 ${
        resolved ? "border-slate-800 opacity-75" : "border-slate-800"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${meta.badge} ${
              resolved ? "" : meta.glow
            }`}
          >
            <Icon size={22} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.badge}`}
              >
                {meta.label}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                {incident.zip_code}
              </span>
              {resolved ? (
                <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                  <ShieldCheck size={11} /> Resolved
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 wt-pulse" />
                  Active
                </span>
              )}
              <span className="ml-auto text-xs text-slate-500">{timeAgo(incident.created_at)}</span>
            </div>

            <h3 className={`mt-2.5 text-base font-semibold leading-snug ${resolved ? "text-slate-400 line-through" : "text-white"}`}>
              {incident.title}
            </h3>

                        {incident.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{incident.description}</p>
            )}

            <p className="mt-2 text-xs text-slate-400">
              Posted by {incident.author_name || "Neighbor"}
            </p>

            {incident.location_description && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin size={12} />
                {incident.location_description}
              </p>
            )}
          </div>
        </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3.5">
          <button
            onClick={handleVerify}
            disabled={verifying || resolved}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all duration-200 hover:border-sky-600/50 hover:bg-sky-500/10 hover:text-sky-300 disabled:opacity-40"
          >
            <ThumbsUp size={13} />
            Verify ({incident.verifications})
          </button>
          <button
            onClick={() => setShowComments((s) => !s)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800 disabled:opacity-40"
          >
            <MessageSquare size={13} />
            Comments ({incidentComments.length})
          </button>
          {hasCoords && (
            <button
              onClick={() => onOpenMap(incident)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800 disabled:opacity-40"
            >
              <Maximize2 size={13} />
              Enlarge
            </button>
          )}
                    {incident.user_id && (
            <button
              onClick={() => onMessagePoster?.(incident)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-slate-800"
            >
              Message privately
            </button>
          )}
                    {!resolved ? (
            <button
              onClick={() => onResolve(incident.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-all duration-200 hover:bg-emerald-500/20"
            >
              <Check size={13} />
              Resolve
            </button>
          ) : (
            <button
              onClick={() => onUnresolve(incident.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-600/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition-all duration-200 hover:bg-amber-500/20"
            >
              Un-Resolve
            </button>
          )}
        </div>

        {hasCoords && (
          <div className="mt-3 border-t border-slate-800 pt-3">
              <CoordLinks lat={incident.latitude!} lng={incident.longitude!} />
            <MiniMap lat={incident.latitude!} lng={incident.longitude!} color={meta.pinColor} label={incident.title} />
          </div>
        )}

        {showComments && (
          <div className="mt-3 space-y-2.5 border-t border-slate-800 pt-3">
            {incidentComments.length === 0 && (
              <p className="text-xs text-slate-500">No updates yet. Be the first to help.</p>
            )}
            {incidentComments.map((c) => (
              <div key={c.id} className="rounded-lg bg-slate-800/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    {c.author_name || "Neighbor"}
                  </span>
                  <span className="text-[10px] text-slate-500">{timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-300">{c.body}</p>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                placeholder="Add an update for neighbors…"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-slate-500"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim() || posting}
                className="flex items-center justify-center rounded-lg bg-white p-2 text-slate-900 transition-all duration-200 hover:bg-slate-200 disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        )}
            </div>
    </div>
  );
}

function CoordLinks({ lat, lng }: { lat: number; lng: number }) {
  const label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const apple = `https://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`;
  const google = `https://www.google.com/maps?q=${lat},${lng}`;
  const waze = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  return (
    <div className="relative z-[9999] mb-2">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
        <MapPin size={12} className="text-slate-500" />
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={apple}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
        >
          Apple Maps
        </a>
        <a
          href={google}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
        >
          Google Maps
        </a>
        <a
          href={waze}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
        >
          Waze
        </a>
      </div>
    </div>
  );
}
