import { useEffect, useRef } from "react";

// Mientras `active` sea true, llama a `callback` cada `intervalMs` (por defecto 5 s).
export function useRetryWhile(
  active: boolean,
  callback: () => void,
  intervalMs = 5000,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
}
