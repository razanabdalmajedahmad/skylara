"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiPost, apiGet } from "@/lib/api";

/**
 * Web Push Notifications hook.
 *
 * Manages browser push notification subscription via the Web Push API (VAPID).
 * Automatically subscribes when permission is granted and VAPID key is available.
 */

type PushPermission = "granted" | "denied" | "default" | "unsupported";

interface UseWebPushReturn {
  permission: PushPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function useWebPush(): UseWebPushReturn {
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);

  // Check support and current state
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      setIsLoading(false);
      return;
    }

    // Check current permission state
    setPermission(Notification.permission as PushPermission);

    // Check if already subscribed
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((subscription) => {
        setIsSubscribed(!!subscription);
        setIsLoading(false);
      });
    });
  }, []);

  const subscribeUser = useCallback(async () => {
    try {
      // Fetch VAPID public key from API
      const response = await apiGet("/notifications/vapid-key");
      const vapidKey = response?.data?.key;

      if (!vapidKey) {
        console.log("[WebPush] No VAPID key available — push not configured on server");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Send subscription to server
      await apiPost("/notifications/web-push-subscribe", {
        subscription: subscription.toJSON(),
      });

      setIsSubscribed(true);
      console.log("[WebPush] Subscription registered");
    } catch (err) {
      console.error("[WebPush] Failed to subscribe:", err);
    }
  }, []);

  // Auto-subscribe when permission is granted
  useEffect(() => {
    if (permission === "granted" && !isSubscribed && !isLoading) {
      subscribeUser().catch(console.error);
    }
  }, [permission, isSubscribed, isLoading, subscribeUser]);

  const requestPermission = useCallback(async () => {
    if (permission === "unsupported") return;

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);

      if (result === "granted") {
        await subscribeUser();
      }
    } catch (err) {
      console.error("[WebPush] Permission request failed:", err);
    }
    setIsLoading(false);
  }, [permission, subscribeUser]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Notify server
        await apiPost("/notifications/push-token", {
          method: "DELETE",
          body: { token: JSON.stringify(subscription.toJSON()) },
        }).catch(() => {});
      }

      setIsSubscribed(false);
    } catch (err) {
      console.error("[WebPush] Unsubscribe failed:", err);
    }
  }, []);

  return { permission, isSubscribed, isLoading, requestPermission, unsubscribe };
}

/**
 * Convert a base64url-encoded VAPID public key to Uint8Array
 * for use with PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
