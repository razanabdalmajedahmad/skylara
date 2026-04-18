/**
 * SkyLara Web Push Service Worker
 *
 * Handles push notifications received via the Web Push API (VAPID).
 * This file is loaded by the main service worker via importScripts.
 */

// Handle incoming push events
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "SkyLara", body: event.data.text() };
  }

  const { title = "SkyLara", body = "", data = {} } = payload;

  // Determine notification icon and badge based on event type
  const isEmergency = [
    "EMERGENCY_ACTIVATED",
    "INCIDENT_REPORTED",
    "GEAR_CHECK_FAILED",
    "RIG_GROUNDED",
    "RIG_OVERDUE",
    "WEATHER_ALERT",
    "WIND_LIMIT_EXCEEDED",
  ].includes(data.eventType);

  const options = {
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: data.notificationId || `skylara-${Date.now()}`,
    data,
    requireInteraction: isEmergency,
    vibrate: isEmergency ? [200, 100, 200, 100, 200] : [200, 100, 200],
    actions: isEmergency
      ? [
          { action: "view", title: "View Now" },
          { action: "acknowledge", title: "Acknowledge" },
        ]
      : [{ action: "view", title: "View" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = "/dashboard";

  // Route to relevant page based on event type
  if (data.eventType) {
    const type = data.eventType;
    if (type.startsWith("LOAD_") || type.startsWith("SLOT_")) {
      targetUrl = "/dashboard/manifest";
    } else if (type.startsWith("BOOKING_")) {
      targetUrl = "/dashboard/boogies";
    } else if (type.startsWith("PAYMENT_") || type.startsWith("PAYOUT_")) {
      targetUrl = "/dashboard/payments";
    } else if (type.startsWith("RIG_") || type.startsWith("GEAR_")) {
      targetUrl = "/dashboard/gear";
    } else if (type.startsWith("WEATHER_") || type.startsWith("WIND_")) {
      targetUrl = "/dashboard/weather";
    } else if (type === "EMERGENCY_ACTIVATED" || type === "INCIDENT_REPORTED") {
      targetUrl = "/dashboard/incidents";
    }
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if open
        for (const client of windowClients) {
          if (client.url.includes("/dashboard") && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow(targetUrl);
      })
  );
});
