import { useEffect, useRef } from "react";

export function useAutoRefresh(callback: () => void, intervalMs = 20000) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (interval) return;
      // Sin red no tiene sentido pedir: se saltea el ciclo y se retoma al volver.
      interval = setInterval(() => {
        if (navigator.onLine) callbackRef.current();
      }, intervalMs);
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

    function handleOnline() {
      if (document.visibilityState === "visible") callbackRef.current();
    }

    start();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [intervalMs]);
}
