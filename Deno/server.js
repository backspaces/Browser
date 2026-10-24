// A tiny server, as a web handler: a Request goes in, a Response comes out.
// It uses only the language and web platform APIs (layers 1 and 2), so the
// same file runs in three places, unchanged:
//
//   deno serve --port 8001 Deno/server.js    Deno, at http://localhost:8001
//   index.html imports it                    the page, called directly, no network
//   Cloudflare Workers, Val Town             any host that takes a fetch handler
//
// Plain .js rather than .ts so the browser can load it too.

// Where is this running? Each place leaves a different global behind.
const where = () =>
  globalThis.Deno ? `Deno ${Deno.version.deno}`
  : globalThis.document ? "a browser page"
  : globalThis.navigator?.userAgent ?? "somewhere else";

// Every reply allows any page to read it (CORS), so the demo page can
// call this server from another origin.
const reply = (body, status = 200, type = "application/json") =>
  new Response(type === "application/json" ? JSON.stringify(body, null, 2) : body, {
    status,
    headers: { "content-type": type, "access-control-allow-origin": "*" },
  });

export default {
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return reply("Try /hello?name=Ada, /time or /dice?sides=20\n", 200, "text/plain");
    }
    if (url.pathname === "/hello") {
      const name = url.searchParams.get("name") ?? "world";
      return reply({ greeting: `Hello, ${name}!`, ranIn: where() });
    }
    if (url.pathname === "/time") {
      return reply({ now: new Date().toISOString(), ranIn: where() });
    }
    if (url.pathname === "/dice") {
      const sides = Number(url.searchParams.get("sides") ?? 6);
      if (!Number.isInteger(sides) || sides < 2) {
        return reply({ error: "sides must be a whole number, 2 or more" }, 400);
      }
      const roll = 1 + crypto.getRandomValues(new Uint32Array(1))[0] % sides;
      return reply({ sides, roll, ranIn: where() });
    }
    return reply({ error: `nothing at ${url.pathname}` }, 404);
  },
};
