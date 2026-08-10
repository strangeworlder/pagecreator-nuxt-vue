import { d as defineEventHandler, s as setHeader } from '../../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'better-sqlite3';
import 'node:crypto';

const health_get = defineEventHandler((event) => {
  setHeader(event, "Cache-Control", "no-store");
  return { ok: true };
});

export { health_get as default };
//# sourceMappingURL=health.get.mjs.map
