import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "../lib/push";

type PushStatus = "unsupported" | "loading" | "subscribed" | "unsubscribed";

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>("loading");

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    getExistingSubscription()
      .then((sub) => setStatus(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setStatus("unsubscribed"));
  }, []);

  const toggle = useCallback(async () => {
    if (status === "subscribed") {
      setStatus("loading");
      try {
        await unsubscribeFromPush();
        setStatus("unsubscribed");
      } catch {
        setStatus("subscribed");
      }
      return;
    }

    setStatus("loading");
    try {
      await subscribeToPush();
      setStatus("subscribed");
    } catch {
      setStatus("unsubscribed");
    }
  }, [status]);

  return { status, toggle };
}
