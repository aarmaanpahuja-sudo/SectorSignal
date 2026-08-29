import { useEffect, useState } from "react";
import { Download, Share, Smartphone, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getOrCreateClientId } from "../lib/clientId";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}


const VAPID_PUBLIC_KEY =
  "BIv4jDkdVHMEFWoQyYB6sLAMSx8dYtCTdavF9Wq_hffHfGfLTPl8WPorVlQcOlg8_pZajqVInhsqfeGtgUPdHO8";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

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

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"unknown" | "enabled" | "denied" | "default">("unknown");
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isStandalone()) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setNotifStatus("enabled");
      } else {
        setNotifStatus(Notification.permission as "default" | "denied");
      }
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstalled(true);
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
      setNotifMessage("Notifications enabled! You’ll get alerts for new incidents in your watch zones.");
    } catch (err) {
      console.error(err);
      setNotifMessage(err instanceof Error ? err.message : "Failed to enable notifications.");
    } finally {
      setNotifLoading(false);
    }
  };

  if (isInstalled && notifStatus === "enabled") {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-xl font-semibold text-white">You’re all set!</h2>
        <p className="mt-2 text-sm text-slate-400">
          VexGrid is installed and notifications are enabled.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-900">
          <Smartphone size={28} />
        </div>
        <h2 className="text-xl font-semibold text-white">Install VexGrid</h2>
        <p className="mt-2 text-sm text-slate-400">
          Add VexGrid to your home screen and enable notifications so you never miss an alert in your community.
        </p>
      </div>

      {/* Android / Chrome */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Download size={16} />
          Android / Chrome
        </h3>

        {deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
          >
            <Download size={18} />
            Install VexGrid
          </button>
        ) : (
          <p className="text-sm text-slate-400">
            Open this page in Chrome on your Android phone. An install button will appear here when available.
          </p>
        )}
      </div>

      {/* iPhone / iPad */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Share size={16} />
          iPhone / iPad
        </h3>
        <ol className="space-y-3 text-sm text-slate-300">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-slate-300">1</span>
            <span>Tap the <strong className="text-white">Share</strong> button at the bottom of Safari (if you don't see it, tap the three dots, then tap the share button).</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-slate-300">2</span>
            <span>Scroll down and tap <strong className="text-white">Add to Home Screen</strong>. If you do not see this button, tap the <strong className="text-white">More</strong> arrow and scroll down. Then tap <strong className="text-white">Add to Home Screen</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-slate-300">3</span>
            <span>Tap <strong className="text-white">Add</strong> in the top right corner</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-slate-300">4</span>
            <span>Open the app from your Home Screen, then come back here and tap <strong className="text-white">Enable Notifications</strong></span>
          </li>
        </ol>
      </div>
    </div>
  );
}
