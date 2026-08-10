export { default } from "./main.mjs";
export const config = {
  name: "server handler",
  generator: "nuxt@3.21.11",
  path: "/*",
  nodeBundler: "none",
  includedFiles: ["**"],
  excludedPath: ["/.netlify/*","/_nuxt/*"],
  preferStatic: true,
};