// Force-redirect any attempts to connect to ws://localhost:4000/ws to app WS
export default defineNuxtPlugin(() => {
  if (process.server) return;
  const cfg = useRuntimeConfig();
  if (cfg.public.redirectContentWS !== "1") return;
  const OriginalWS = window.WebSocket;
  // Patch WebSocket constructor to rewrite target
  // Only affects dev tooling attempts to 4000
  type MutableWindow = Window & { WebSocket: typeof WebSocket };
  const w = window as MutableWindow;
  w.WebSocket = function WebSocketPatched(
    url: string | URL,
    protocols?: string | string[],
  ): WebSocket {
    const u = typeof url === "string" ? url : url.toString();
    const rewritten = u.replace("ws://localhost:4000/ws", `ws://${location.host}/api/ws`);
    // @ts-ignore - delegate to native constructor
    return new OriginalWS(rewritten, protocols);
  } as unknown as typeof WebSocket;
});
