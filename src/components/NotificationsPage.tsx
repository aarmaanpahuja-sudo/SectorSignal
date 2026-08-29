import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getOrCreateClientId } from "../lib/clientId";

const VAPID_PUBLIC_KEY =
  "BIv4jDkdVHMEFWoQyYB6sLAMSx8dYtCTdavF9Wq_hffHfGfLTPl8WPorVlQcOlg8_pZajqVInhsqfeGtgUPdHO8";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationsPage() {
  const [notifStatus, setNotifStatus] = useState<"unknown" | "enabled" | "denied" | "default">("unknown");
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);
  const [communityUpdates, setCommunityUpdates] = useState(true);
  const [myPostActivity, setMyPostActivity] = useState(false);
  const [messagesOn, setMessagesOn] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setNotifStatus(Notification.permission === "granted" ? "enabled" : (Notification.permission as "default" | "denied"));
    }

    (async () => {
      const clientId = getOrCreateClientId();
      const { data: { user } } = await supabase.auth.getUser();
      let q = supabase.from("notification_preferences").select("*");
      q = user?.id ? q.eq("user_id", user.id) : q.eq("client_id", clientId);
      const { data } = await q.maybeSingle();
      if (data) {
        setCommunityUpdates(data.community_updates ?? true);
        setMyPostActivity(data.my_post_activity ?? false);
        setMessagesOn(data.messages ?? false);
      }
    })();
  }, []);

  const savePrefs = async (next: {
    community_updates: boolean;
    my_post_activity: boolean;
    messages: boolean;
  }) => {
    setSaving(true);
    try {
      const clientId = getOrCreateClientId();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("notification_preferences").upsert(
        {
          client_id: user ? null : clientId,
          user_id: user?.id ?? null,
          ...next,
        },
        { onConflict: user ? "user_id" : "client_id" }
      );
    } catch (e) {
      console.log(e);
    } finally {
      setSaving(false);
    }
  };

  const enableNotifications = async () => {
    setNotifLoading(true);
    setNotifMessage(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setNotifMessage("Push notifications are not supported on this browser.");
        setNotifLoading(false);
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotifStatus("denied");
        setNotifMessage("Permission denied. You can enable it later in browser settings.");
        setNotifLoading(false);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const subJson = subscription.toJSON();
      const clientId = getOrCreateClientId();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          client_id: clientId,
          user_id: user?.id ?? null,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setNotifStatus("enabled");
      setNotifMessage("Notifications enabled.");
    } catch (err) {
      setNotifMessage(err instanceof Error ? err.message : "Failed to enable notifications.");
    } finally {
      setNotifLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <h2 className="text-xl font-semibold text-white">Notifications</h2>
        <p className="mt-2 text-sm text-slate-400">
          Choose what you get alerted about. Community updates are on by default.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Bell size={16} />
          Device permission
        </h3>
        {notifStatus === "enabled" ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 size={16} />
            Notifications are enabled on this device
          </div>
        ) : notifStatus === "denied" ? (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <BellOff size={16} />
            Permission denied — enable it in your browser/phone settings
          </div>
        ) : (
          <button
            onClick={enableNotifications}
            disabled={notifLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200 disabled:opacity-50"
          >
            <Bell size={18} />
            {notifLoading ? "Enabling…" : "Enable Notifications"}
          </button>
        )}
        {notifMessage && <p className="mt-3 text-xs text-slate-400">{notifMessage}</p>}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Alert types</h3>

        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={communityUpdates}
            onChange={(e) => {
              const v = e.target.checked;
              setCommunityUpdates(v);
              savePrefs({ community_updates: v, my_post_activity: myPostActivity, messages: messagesOn });
            }}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-white">Updates in my communities</span>
            <span className="block text-xs text-slate-500">New incidents in zip codes you watch (default on)</span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={myPostActivity}
            onChange={(e) => {
              const v = e.target.checked;
              setMyPostActivity(v);
              savePrefs({ community_updates: communityUpdates, my_post_activity: v, messages: messagesOn });
            }}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-white">Activity on my posts</span>
            <span className="block text-xs text-slate-500">Comments or verifications on reports you filed</span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={messagesOn}
            onChange={(e) => {
              const v = e.target.checked;
              setMessagesOn(v);
              savePrefs({ community_updates: communityUpdates, my_post_activity: myPostActivity, messages: v });
            }}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-white">Private messages</span>
            <span className="block text-xs text-slate-500">When someone messages you in Chat</span>
          </span>
        </label>

        {saving && <p className="text-xs text-slate-500">Saving…</p>}
      </div>
    </div>
  );
}
