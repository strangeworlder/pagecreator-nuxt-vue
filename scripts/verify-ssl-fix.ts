import https from "node:https";

const url = "https://gogam.eu/images/cars-and-family-cover.png";

async function testFetch() {
  console.log(`\nTesting standard fetch to: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    console.log("❌ Standard fetch: Success (Unexpected if cert is invalid)");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`✅ Standard fetch: Failed as expected (${msg})`);
  }
}

async function testFallback() {
  console.log(`\nTesting fallback (insecure) to: ${url}`);
  return new Promise<void>((resolve) => {
    const req = https.get(url, { rejectUnauthorized: false }, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ Fallback (insecure): Success - Got ${res.headers["content-length"]} bytes`);
      } else {
        console.log(`❌ Fallback (insecure): Failed with status ${res.statusCode}`);
      }
      resolve();
    });
    req.on("error", (e) => {
      console.log(`❌ Fallback (insecure): Error ${e.message}`);
      resolve();
    });
  });
}

(async () => {
  await testFetch();
  await testFallback();
})();
