import Footer from "./components/Footer";
import { useMemo, useState } from "react";
import {
  Home,
  Map as MapIcon,
  Settings as SettingsIcon,
  BarChart3,
  Plus,
  Search,
  Shield,
  Trash2,
  MapPin,
  TrendingUp,
  Activity,
  Clock,
  ShieldCheck,
  LogIn,
  LogOut,
  Info,
  Download,
  Menu,
  X,
} from "lucide-react";
import { useWatchTowerData } from "./lib/useWatchTowerData";
import { useAuth } from "./lib/useAuth";
import { CATEGORY_LIST } from "./lib/categories";
import IncidentCard from "./components/IncidentCard";
import ReportModal from "./components/ReportModal";
import MapView from "./components/MapView";
import AuthModal from "./components/AuthModal";
import InstallPage from "./components/InstallPage";

type View = "feed" | "map" | "zones" | "analytics" | "about" | "install" | "privacy";

const NAV: { id: View; label: string; icon: any }[] = [
  { id: "feed", label: "Feed", icon: Home },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "zones", label: "Zones", icon: MapPin },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "install", label: "Install", icon: Download },
  { id: "about", label: "About", icon: Info },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
];

export default function App() {
  const auth = useAuth();
  const data = useWatchTowerData(auth.user?.id ?? null);
  const [view, setView] = useState<View>("feed");
  const [activeZip, setActiveZip] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("active");
  const [selectedIncident, setSelectedIncident] = useState<ReturnType<typeof useWatchTowerData>["incidents"][number] | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const zoneOptions = data.zones;
  const openIncidentMap = (incident: ReturnType<typeof useWatchTowerData>["incidents"][number]) => {
  setSelectedIncident(incident);
  setView("map");
};

  // ✅ Fixed: Now properly filters incidents based on user's watch zones
    const filteredIncidents = useMemo(() => {
  let list = [...data.incidents];

  if (activeZip) {
    list = list.filter((i) => i.zip_code === activeZip);
  } else if (data.zones.length > 0) {
    const watchedZips = data.zones.map((z) => z.zip_code);
    list = list.filter((i) => watchedZips.includes(i.zip_code));
  }

  // Status + Search filters...
  if (statusFilter !== "all") {
    list = list.filter((i) => i.status === statusFilter);
  }
if (search.trim()) {
  const q = search.toLowerCase();
  list = list.filter(
    (i) =>
      i.title.toLowerCase().includes(q) ||
      (i.description || "").toLowerCase().includes(q) ||
      (i.location_description || "").toLowerCase().includes(q) ||
      i.zip_code.includes(q)
  );
}

  return list;
}, [data.incidents, data.zones, activeZip, statusFilter, search]);

  const activeCount = data.incidents.filter((i) => i.status === "active").length;
  const resolvedCount = data.incidents.filter((i) => i.status === "resolved").length;

  const handleSignOut = async () => {
    await auth.signOut();
    setStatusFilter("active");
  };

    return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-200">
      {/* Mobile Side Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999] md:hidden">
          {/* Dark overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Side panel */}
          <div className="absolute right-0 top-0 h-full w-72 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
            {/* Header of the menu */}
            <div 
              className="flex items-center justify-between px-5 py-4 border-b border-slate-800"
              style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900">
                  <Shield size={18} />
                </span>
                <div>
                  <h1 className="text-base font-semibold text-white">VexGrid</h1>
                  <p className="text-[11px] text-slate-400">Neighborhood safety</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 space-y-1 px-3 py-4">
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = view === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setView(n.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 ${
                      active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <Icon size={18} />
                    {n.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40 backdrop-blur-sm md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900">
    <Shield size={20} />
  </span>
  <div>
    <h1 className="text-base font-semibold tracking-tight text-white">VexGrid</h1>
    <p className="text-[11px] text-slate-400">Real-time neighborhood safety</p>
  </div>
</div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <Icon size={18} />
                {n.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          {auth.user ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-sm font-semibold text-white">
                    {(data.profile?.display_name || auth.user.email || "N").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {data.profile?.display_name || "Neighbor"}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {data.profile?.karma ?? 0} karma · {zoneOptions.length} zones
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-slate-800"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200"
            >
              <LogIn size={16} /> Sign in
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header 
  className="z-20 flex items-center gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur-md md:px-6"
  style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
>
  {/* Left: Logo (mobile only) */}
  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-900 md:hidden">
    <Shield size={16} />
  </span>

  {/* Search (only on Feed) */}
  {view === "feed" && (
    <div className="relative flex-1 max-w-md">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search alerts, locations, zip…"
        className="w-full rounded-lg border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-slate-600 focus:ring-2 focus:ring-slate-700/30"
      />
    </div>
  )}

  {/* Title (when not on Feed) */}
  {view !== "feed" && (
    <h2 className="text-base font-semibold text-white md:text-lg">
      {NAV.find((n) => n.id === view)?.label}
    </h2>
  )}

  {/* Right side buttons */}
  <div className="ml-auto flex items-center gap-2">
    {!auth.user && (
      <button
        onClick={() => setAuthOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-all duration-200 hover:bg-slate-800 md:hidden"
      >
        <LogIn size={16} />
      </button>
    )}

    <button
      onClick={() => setReportOpen(true)}
      className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200 md:px-4"
    >
      <Plus size={16} />
      <span className="hidden sm:inline">File a Report</span>
    </button>

    {/* Hamburger button - mobile only */}
    <button
      onClick={() => setMobileMenuOpen(true)}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-200 transition-all duration-200 hover:bg-slate-800 md:hidden"
    >
      <Menu size={20} />
    </button>
  </div>
</header>

        {/* Zip Filter Bar */}
        {view !== "zones" && (
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 bg-slate-950/60 px-4 py-2.5 md:px-6">
            <button
  onClick={() => setActiveZip(null)}
  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
    activeZip === null
      ? "border-white bg-white text-slate-900"
      : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50"
  }`}
>
  All Zip Codes
</button>

            {zoneOptions.map((z) => {
              const active = activeZip === z.zip_code;
              return (
                <button
                  key={z.zip_code}
                  onClick={() => setActiveZip(active ? null : z.zip_code)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    active
                      ? "border-white bg-white text-slate-900"
                      : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50"
                  }`}
                >
                  <MapPin size={11} />
                  {z.zip_code}
                  {z.label && <span className="opacity-60">· {z.label}</span>}
                </button>
              );
            })}

            {zoneOptions.length === 0 && (
              <span className="text-xs text-slate-500">
                No zones yet — add one in Watch Zones to start filtering.
              </span>
            )}
          </div>
        )}

        {/* Content */}
                {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {data.loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-slate-500">Loading your community…</div>
            </div>
          ) : data.error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-red-400">{data.error}</div>
            </div>
          ) : view === "feed" ? (
            <FeedView
              incidents={filteredIncidents}
              comments={data.comments}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onResolve={data.resolveIncident}
              onVerify={data.verifyIncident}
              onComment={data.addComment}
              authorName={data.profile?.display_name || "Neighbor"}
onOpenMap={openIncidentMap}
            />
          ) : view === "map" ? (
            <div className="h-[calc(100vh-13rem)] w-full overflow-hidden rounded-2xl border border-slate-800 md:h-[calc(100vh-9.5rem)]">
              <MapView
  incidents={filteredIncidents}
  activeZip={activeZip}
  onResolve={data.resolveIncident}
  selectedIncident={selectedIncident}
/>
            </div>
          ) : view === "zones" ? (
            <ZonesView
              zones={data.zones}
              karma={data.profile?.karma ?? 0}
              displayName={data.profile?.display_name || ""}
              onAddZone={data.addZone}
              onRemoveZone={data.removeZone}
              onUpdateName={data.updateProfileName}
            />
          ) : view === "analytics" ? (
            <AnalyticsView
  incidents={
    activeZip 
      ? data.incidents.filter((i) => i.zip_code === activeZip) 
      : data.incidents
  }
  zones={data.zones}
/>
                    ) : view === "install" ? (
  <InstallPage />
) : view === "about" ? (
  // ==================== ABOUT PAGE ====================
  <div className="mx-auto max-w-2xl p-6 space-y-8">
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">About VexGrid</h1>
      <p className="text-slate-400">
        VexGrid is a community-driven safety platform that helps neighbors
        stay informed and look out for each other in real time. While we designed this app for Loudoun, we designed it to work in any U.S. community.
      </p>
    </div>
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">How it works</h2>
      <ul className="space-y-2 text-slate-300 list-disc list-inside">
        <li>Neighbors post reports about local incidents</li>
        <li>Others can verify reports and add updates</li>
        <li>Everyone sees incidents only in their watch zones</li>
        <li>Earn karma by contributing to your community</li>
      </ul>
    </div>
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">Our Mission</h2>
      <p className="text-slate-300">
        We believe that safer neighborhoods start with better information.
        By sharing what we see, we can all look out for each other.
      </p>
    </div>
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">About Us</h2>
      <p className="text-slate-300">
        You may be wondering, “What exactly is this project?” To answer your question, VexGrid is a project created for the Step Up Loudoun Youth Competition by 9th graders Aarmaan Pahuja and Aditya Ghosh, along with 7th graders Abhir Pahuja and Ayaan Priyal.
We all live in communities where neighbors look out for each other, but we noticed that there was not an easy way for people to quickly share important local updates. Whether it is an unattended package, a lost pet, suspicious activity, vandalism, or a request for a safe walk, important information can easily go unnoticed. We wanted to create a platform that helps communities stay connected, informed, and safer.
VexGrid is a real-time neighborhood safety platform where residents can report and track local incidents within their community. Users can view active reports, receive updates, communicate through comments, verify incidents, and monitor specific watch zones that matter to them. By making it easier for neighbors to work together, VexGrid helps communities respond faster and support each other.
However, technology alone cannot create a safer community. VexGrid is designed to encourage awareness, responsibility, and cooperation between neighbors. The goal is not to expose problems, but to give communities the tools they need to help one another and prevent small issues from becoming bigger ones.
Through this project, we hope to show how technology can bring people together and create stronger, more connected neighborhoods.
      </p>
    </div>
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">Our Mission</h2>
      <p className="text-slate-300">
        We believe that safer neighborhoods start with better information.
        By sharing what we see, we can all look out for each other.
      </p>
    </div>
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">Contact</h2>
      <p className="text-slate-300">
        vexgrid866@gmail.com
      </p>
    </div>
  </div>

) : view === "privacy" ? (
  // ==================== PRIVACY POLICY ====================
  <div className="mx-auto max-w-3xl p-6 space-y-8 text-slate-300">
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-slate-400 text-sm">Last Updated: August 28, 2026</p>
    </div>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">1. Introduction</h2>
      <p>
        VexGrid (“we,” “us,” or “our”) is a real-time neighborhood safety platform that enables community members to report and track local incidents such as open garage doors, unattended packages, lost/found pets, property vandalism, suspicious activity, and safe-walk requests. The service is available at https://vexgrid.vercel.app (and related domains or progressive web app installs).
      </p>
      <p>
        This Privacy Policy explains what information we collect, how we use and share it, and the choices you have. By using VexGrid you agree to the practices described here.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">2. Information We Collect</h2>

      <h3 className="text-lg font-medium text-white mt-4">A. Information You Provide Directly</h3>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li><strong>Incident reports</strong>: Category, title, description, zip code, optional location description, and status updates.</li>
        <li><strong>Comments / updates</strong>: Text body and optional display/author name on incidents.</li>
        <li><strong>Watch zones</strong>: Zip codes you choose to monitor (and optional labels).</li>
        <li><strong>Profile information</strong>: Display name and karma score (earned for filing reports).</li>
        <li><strong>Account information</strong> (optional): Email address and password when you create an account, plus the display name you provide at sign-up.</li>
      </ul>

      <h3 className="text-lg font-medium text-white mt-4">B. Automatically Collected / Device Information</h3>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li><strong>Anonymous client identifier</strong>: A randomly generated UUID (<code>client_id</code>) created in your browser and stored in localStorage. This identifies your activity in anonymous mode and is sent with requests so the system can associate your private data (watch zones, profile) with you.</li>
        <li><strong>Location data</strong>: When you file a report, the app may request your device’s geolocation (via the browser Geolocation API). If granted, latitude and longitude are stored with the incident and may be used to automatically suggest the local zip code (reverse geocoding). You can still edit the zip. If geolocation is denied, you can enter a zip manually; approximate map position may be derived from that zip.</li>
        <li><strong>Technical data</strong>: Standard request metadata handled by our backend provider (IP address, user agent, timestamps) as part of normal web service operation. We do not operate our own analytics or tracking scripts in the application code.</li>
      </ul>

      <h3 className="text-lg font-medium text-white mt-4">C. Information from Authentication</h3>
      <p>
        When you sign up or sign in with email/password, authentication is handled by Supabase Auth. We store a reference to your authenticated user ID and link it to your profile, watch zones, reports, comments, and verifications so your data can follow you across devices.
      </p>

      <h3 className="text-lg font-medium text-white mt-4">D. Push notification data</h3>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>If you enable notifications, we store a push subscription for your device (endpoint URL and encryption keys provided by your browser/OS).</li>
        <li>That subscription is linked to your anonymous <code>client_id</code> and, if you are signed in, your account <code>user_id</code>.</li>
        <li>We use this only to send optional alerts about new incidents in zip codes you monitor (watch zones).</li>
      </ul>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">3. How We Use Your Information</h2>
      <p>We use the information to:</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Operate the core service (display live incident feeds and maps filtered by your watch zones).</li>
        <li>Enable real-time synchronization of new reports, comments, status changes, and verifications across users via Supabase Realtime.</li>
        <li>Associate ownership of private data (profiles and watch zones) and allow deletion of your own content.</li>
        <li>Calculate and display neighbor karma.</li>
        <li>Support optional account features so you can access the same profile and zones from different browsers/devices.</li>
        <li>Suggest a zip code from your GPS location when you file a report (you may change it).</li>
        <li>Send optional push notifications about new incidents in your watch zones, when you have enabled notifications.</li>
        <li>Support installing the app on your home screen as a Progressive Web App.</li>
        <li>Improve reliability and security of the service.</li>
      </ul>
      <p className="mt-2">
        We do <strong>not</strong> use the data for advertising, profiling for marketing, or selling personal information.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">4. Public Nature of Community Content</h2>
      <p>VexGrid is designed as a community bulletin board:</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li><strong>Incidents</strong> (including category, title, description, zip code, status, verification count, and associated latitude/longitude) and <strong>comments</strong> are publicly readable by anyone using the service.</li>
        <li>Precise location coordinates attached to reports appear on the interactive map and are visible to other users.</li>
        <li>Your display name (if set) may appear with comments or in connection with your activity.</li>
        <li>Watch zones and full profile details are intended to remain private to you and are protected by row-level security policies.</li>
      </ul>
      <p className="mt-2">
        Push alerts are private to your device; the underlying incident remains public on the feed and map as described above. Because location data on public reports is visible, please avoid including highly sensitive personal details in titles or descriptions.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">5. Location Data</h2>
      <p>
        Location is requested when you choose to capture it while filing a report. It is used to place the incident on the map and, when possible, to detect the local zip code so you do not have to type it. You can deny the browser permission and enter a zip manually. Location data attached to a report becomes part of the public incident record on the feed and map.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">6. Third-Party Services</h2>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li><strong>Supabase</strong> (database, authentication, realtime, Edge Functions, storage of all application data). Your data is processed according to Supabase’s terms and privacy practices.</li>
        <li><strong>Leaflet + Esri</strong> for map rendering. Basemap tiles are loaded from Esri (World Dark Gray). Street/geographic context is derived from map data providers including OpenStreetMap.</li>
        <li><strong>Hosting</strong>: The frontend is deployed on Vercel.</li>
        <li><strong>Browser / OS push services</strong> (e.g. services used by Chrome and by Apple for Home Screen web apps). When a notification is sent, delivery is handled by those platforms. We send only the alert content and a link back to the app.</li>
        <li><strong>Geocoding providers</strong> used to turn zip codes into map centers and coordinates into zip codes (e.g. Zippopotam.us, BigDataCloud). These requests use location or zip only for that lookup.</li>
      </ul>
      <p className="mt-2">
        We do not integrate advertising networks, analytics SDKs, or social login providers beyond the email/password flow handled by Supabase.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">7. Data Storage, Security, and Retention</h2>
      <p>
        Data is stored in a Supabase-managed PostgreSQL database with row-level security enabled. Private data is scoped to either the browser <code>client_id</code> or the authenticated <code>user_id</code>. Community content is intentionally shared.
      </p>
      <p>
        We retain data for as long as necessary to provide the service. You may delete individual incidents or comments you created (subject to ownership checks). Public reports you filed may remain visible as community records even after account deletion unless separately removed.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">8. Your Choices and Rights</h2>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Use the app anonymously (browser <code>client_id</code> only) or create an optional account.</li>
        <li>Grant or deny geolocation permission in your browser.</li>
        <li>Edit an auto-filled zip code before posting a report.</li>
        <li>Edit your display name.</li>
        <li>Add or remove watch zones.</li>
        <li>Enable or disable push notifications in the app (Install page) and in your device/browser settings.</li>
        <li>Install or remove the app from your home screen at any time.</li>
        <li>Delete your own reports and comments.</li>
        <li>Sign out or stop using the service at any time.</li>
        <li>Clear localStorage to reset your anonymous client ID.</li>
      </ul>
      <p className="mt-2">
        Depending on your jurisdiction you may have rights to access, correct, delete, or port your personal data. Contact us to exercise these rights.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">9. Children’s Privacy</h2>
      <p>
        VexGrid is not directed at children under 13 (or the applicable age in your jurisdiction). We do not knowingly collect personal information from children. If you believe we have collected such information, please contact us so we can delete it.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">10. International Users</h2>
      <p>
        The service is operated with infrastructure that may process data in the United States or other locations where Supabase and Vercel operate. By using VexGrid you consent to the transfer of information to those locations.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The “Last Updated” date at the top will reflect the most recent revision. Continued use of the service after changes constitutes acceptance of the updated policy.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">12. Contact Us</h2>
      <p>
        For privacy-related questions, data requests, or concerns, please contact the operators of VexGrid via vexgrid866@gmail.com or the project repository associated with the application.
      </p>
    </section>
  </div>
) : null}
        </div>

        
        <Footer />

        
      </main>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        zones={zoneOptions}
        onSubmit={data.addIncident}
      />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
      />
    </div>
  );
}

/* ---------- Feed View ---------- */
function FeedView({
  incidents,
  comments,
  statusFilter,
  setStatusFilter,
  onResolve,
  onVerify,
  onComment,
  authorName,
onOpenMap,
}: {
  incidents: ReturnType<typeof useWatchTowerData>["incidents"];
  comments: ReturnType<typeof useWatchTowerData>["comments"];
  statusFilter: "all" | "active" | "resolved";
  setStatusFilter: (s: "all" | "active" | "resolved") => void;
  onResolve: ReturnType<typeof useWatchTowerData>["resolveIncident"];
  onVerify: ReturnType<typeof useWatchTowerData>["verifyIncident"];
  onComment: (incidentId: string, body: string, authorName: string) => Promise<unknown>;
  authorName: string;
  onOpenMap: (incident: ReturnType<typeof useWatchTowerData>["incidents"][number]) => void;
}) {
  const tabs: { id: "active" | "resolved" | "all"; label: string }[] = [
    { id: "active", label: "Active" },
    { id: "resolved", label: "Resolved" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              statusFilter === t.id
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{incidents.length} alerts</span>
      </div>

      {incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 py-16 text-center">
          <Shield size={32} className="text-slate-700" />
          <p className="mt-3 text-sm text-slate-400">No alerts here yet.</p>
          <p className="text-xs text-slate-600">Be the first to file a report in this community.</p>
        </div>
      ) : (
        incidents.map((inc) => (
          <IncidentCard
            key={inc.id}
            incident={inc}
            comments={comments}
            onResolve={onResolve}
            onVerify={onVerify}
            onComment={onComment}
            authorName={authorName}
onOpenMap={onOpenMap}
          />
        ))
      )}
    </div>
  );
}

/* ---------- Zones View ---------- */
function ZonesView({
  zones,
  karma,
  displayName,
  onAddZone,
  onRemoveZone,
  onUpdateName,
}: {
  zones: ReturnType<typeof useWatchTowerData>["zones"];
  karma: number;
  displayName: string;
  onAddZone: ReturnType<typeof useWatchTowerData>["addZone"];
  onRemoveZone: ReturnType<typeof useWatchTowerData>["removeZone"];
  onUpdateName: ReturnType<typeof useWatchTowerData>["updateProfileName"];
}) {
  const [zip, setZip] = useState("");
  const [label, setLabel] = useState("");
  const [name, setName] = useState(displayName);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const validZip = /^\d{5}$/.test(zip);

  const add = async () => {
    if (!validZip) return;
    setBusy(true);
    setErr(null);
    try {
      await onAddZone(zip, label.trim());
      setZip("");
      setLabel("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add zone");
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    if (name.trim() === displayName) return;
    setBusy(true);
    try {
      await onUpdateName(name.trim() || "Neighbor");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Karma */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/40 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <TrendingUp size={26} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Neighbor Karma Score</p>
            <p className="mt-0.5 text-3xl font-bold text-white">{karma}</p>
            <p className="text-xs text-slate-500">+10 for every report you file</p>
          </div>
        </div>
      </div>

      {/* Profile Name */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">Your identity</h3>
        <p className="mt-0.5 text-xs text-slate-500">Shown on comments you post.</p>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-slate-500"
          />
          <button
            onClick={saveName}
            disabled={busy}
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      {/* Add Zone */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">Add a new watch zone</h3>
        <p className="mt-0.5 text-xs text-slate-500">Monitor any US zip code community.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="Zip code (5 digits)"
            inputMode="numeric"
            className={`flex-1 rounded-lg border bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-slate-700/30 ${
              zip && !validZip ? "border-red-500/50" : "border-slate-700 focus:border-slate-500"
            }`}
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Home, Work)"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-slate-500"
          />
          <button
            onClick={add}
            disabled={!validZip || busy}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} /> Add
          </button>
        </div>
        {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
      </div>

      {/* Zone List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">Your watch zones</h3>
        {zones.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No zones yet. Add one above to start monitoring a community.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {zones.map((z) => (
              <li key={z.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                  <MapPin size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{z.zip_code}</p>
                  {z.label && <p className="text-xs text-slate-500">{z.label}</p>}
                </div>
                <button
                  onClick={() => onRemoveZone(z.id)}
                  className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 transition-all duration-200 hover:bg-red-500/20"
                >
                  <Trash2 size={13} /> Leave
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- Analytics View ---------- */
function AnalyticsView({
  incidents,
  zones,
}: {
  incidents: ReturnType<typeof useWatchTowerData>["incidents"];
  zones: ReturnType<typeof useWatchTowerData>["zones"];
}) {
  // Calculate active and resolved counts from the incidents passed in
  const activeCount = incidents.filter((i) => i.status === "active").length;
  const resolvedCount = incidents.filter((i) => i.status === "resolved").length;
  const byCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of incidents) counts[i.category] = (counts[i.category] || 0) + 1;
    return CATEGORY_LIST.map((c) => ({ meta: c, count: counts[c.id] || 0 })).sort((a, b) => b.count - a.count);
  }, [incidents]);

  const byZip = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of incidents) counts[i.zip_code] = (counts[i.zip_code] || 0) + 1;
    return Object.entries(counts)
      .map(([zip, count]) => ({ zip, count }))
      .sort((a, b) => b.count - a.count);
  }, [incidents]);

  const maxCat = Math.max(1, ...byCategory.map((c) => c.count));
  const maxZip = Math.max(1, ...byZip.map((z) => z.count));

  const stats = [
    { label: "Total Reports", value: incidents.length, icon: Activity, tint: "text-sky-300 bg-sky-500/15" },
    { label: "Active Alerts", value: activeCount, icon: Clock, tint: "text-red-300 bg-red-500/15" },
    { label: "Resolved", value: resolvedCount, icon: ShieldCheck, tint: "text-emerald-300 bg-emerald-500/15" },
    { label: "Watch Zones", value: zones.length, icon: MapPin, tint: "text-amber-300 bg-amber-500/15" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.tint}`}>
                <Icon size={18} />
              </span>
              <p className="mt-3 text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">Reports by category</h3>
        <div className="mt-4 space-y-3">
          {byCategory.map((c) => {
            const Icon = c.meta.icon;
            return (
              <div key={c.meta.id} className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${c.meta.badge}`}>
                  <Icon size={15} />
                </span>
                <span className="w-32 shrink-0 truncate text-xs text-slate-300">{c.meta.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(c.count / maxCat) * 100}%`, backgroundColor: c.meta.pinColor }}
                  />
                </div>
                <span className="w-6 text-right text-xs font-medium text-slate-400">{c.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">Reports by zip code</h3>
        <div className="mt-4 space-y-3">
          {byZip.length === 0 ? (
            <p className="text-xs text-slate-500">No data yet.</p>
          ) : (
            byZip.map((z) => (
              <div key={z.zip} className="flex items-center gap-3">
                <span className="flex h-8 w-14 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 text-xs font-medium text-slate-300">
                  {z.zip}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-slate-400 transition-all duration-500"
                    style={{ width: `${(z.count / maxZip) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs font-medium text-slate-400">{z.count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
