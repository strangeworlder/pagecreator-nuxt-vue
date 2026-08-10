import { h as defineWebSocketHandler } from '../../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'better-sqlite3';
import 'node:crypto';

const peers = /* @__PURE__ */ new Set();
const ws = defineWebSocketHandler({
  open(peer) {
    peers.add(peer);
    try {
      peer.send("connected");
    } catch {
    }
  },
  message(peer, message) {
    const text = typeof message === "string" ? message : message.toString("utf8");
    if (text === "ping") {
      try {
        peer.send("pong");
      } catch {
      }
      return;
    }
    for (const p of peers) {
      if (p !== peer) {
        try {
          p.send(text);
        } catch {
        }
      }
    }
  },
  close(peer) {
    peers.delete(peer);
  }
});

export { ws as default };
//# sourceMappingURL=ws.mjs.map
