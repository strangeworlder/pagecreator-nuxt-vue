// @ts-nocheck
import { defineWebSocketHandler } from "h3";

const peers = new Set<unknown>();

export default defineWebSocketHandler({
  open(peer) {
    peers.add(peer);
    try {
      peer.send("connected");
    } catch {}
  },
  message(peer, message) {
    const text = typeof message === "string" ? message : message.toString("utf8");
    if (text === "ping") {
      try {
        peer.send("pong");
      } catch {}
      return;
    }
    for (const p of peers) {
      if (p !== peer) {
        try {
          p.send(text);
        } catch {}
      }
    }
  },
  close(peer) {
    peers.delete(peer);
  },
});
