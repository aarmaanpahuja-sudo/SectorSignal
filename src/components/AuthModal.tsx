import { useState } from "react";
import { X, Loader2, Mail, Lock, User } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, name: string) => Promise<void>;
}

export default function AuthModal({ open, onClose, onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setMode("signin");
    setEmail("");
    setPassword("");
    setName("");
    setErr(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!email.trim() || !password.trim()) return;
    if (mode === "signup" && !name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      if (mode === "signin") {
        await onSignIn(email.trim(), password);
      } else {
        await onSignUp(email.trim(), password, name.trim());
      }
      close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Authentication failed";
      setErr(msg.includes("Invalid login") || msg.includes("credentials") ? "Invalid email or password" : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={close} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl wt-fade-up">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
                        <img src="/logo.png" alt="SectorSafe" className="h-8 w-8 rounded-lg object-contain" />
            <div>
              <h2 className="text-base font-semibold text-white">
                {mode === "signin" ? "Sign in" : "Create account"}
              </h2>
              <p className="text-[11px] text-slate-500">Save your profile across devices</p>
            </div>
          </div>
          <button
            onClick={close}
            className="rounded-lg p-2 text-slate-400 transition-all duration-200 hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Display name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Neighbor name"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-700/40"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-700/40"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="At least 6 characters"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-700/40"
              />
            </div>
          </div>

          {err && <p className="text-sm text-red-400">{err}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setErr(null);
            }}
            className="text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
          <button
            onClick={submit}
            disabled={busy || !email.trim() || !password.trim() || (mode === "signup" && !name.trim())}
            className="flex items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}
