import { useEffect, useRef } from "react";

export function useAutoRefresh(callback: () => void, intervalMs = 20000) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (interval) return;
      interval = setInterval(() => callbackRef.current(), intervalMs);
    }

    function stop() {
      if (interval) clearInterval(interval);
      interval = null;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        callbackRef.current();
        start();
      } else {
        stop();
      }
    }

    start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs]);
}
