self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "SectorSafe", body: event.data.text() };
  }

  const title = data.title || "SectorSafe Alert";
  const options = {
    body: data.body || "New incident in your community",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: data.url ? { url: data.url } : { url: "/" },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
