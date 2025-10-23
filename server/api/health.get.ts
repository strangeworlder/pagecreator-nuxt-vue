export default defineEventHandler((event) => {
  setHeader(event, "Cache-Control", "no-store");
  return { ok: true };
});
