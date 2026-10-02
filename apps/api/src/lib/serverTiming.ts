import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, Response } from "express";

// Encabezado Server-Timing opcional (SERVER_TIMING=true) para ver en las DevTools,
// pestaña Network > Timing, cuánto de cada pedido es base de datos y cuántas
// conexiones nuevas abrió el pool. Apagado por defecto: no agrega nada al pedido.
export const SERVER_TIMING_ENABLED = process.env.SERVER_TIMING === "true";

interface RequestTiming {
  dbMs: number;
  queries: number;
}

const store = new AsyncLocalStorage<RequestTiming>();
let connectCount = 0;

export function recordQuery(ms: number): void {
  const timing = store.getStore();
  if (!timing) return;
  timing.dbMs += ms;
  timing.queries += 1;
}

export function recordConnect(): void {
  connectCount += 1;
}

// Las conexiones nuevas se cuentan en todo el proceso entre el inicio y el fin del
// pedido: si hay pedidos simultáneos, el número es una cota superior para este.
export function serverTiming(allowOrigin: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    const connectsAtStart = connectCount;
    const timing: RequestTiming = { dbMs: 0, queries: 0 };

    res.setHeader("Timing-Allow-Origin", allowOrigin);

    const writeHead = res.writeHead.bind(res) as (...args: unknown[]) => Response;
    res.writeHead = ((...args: unknown[]) => {
      if (!res.headersSent) {
        res.setHeader(
          "Server-Timing",
          [
            `db;dur=${timing.dbMs.toFixed(1)};desc="consultas=${timing.queries}"`,
            `conn;desc="nuevas=${connectCount - connectsAtStart}"`,
            `total;dur=${(performance.now() - start).toFixed(1)}`,
          ].join(", "),
        );
      }
      return writeHead(...args);
    }) as typeof res.writeHead;

    store.run(timing, next);
  };
}
