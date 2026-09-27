# CORS

Layer: **browser only**. Any server can *send* CORS headers (a val.town
handler does it with an ordinary object), but only browsers *enforce*
them. `curl`, Deno and Node ignore them completely.

[Try it](https://backspaces.github.io/Browser/CORS/). The page has three
parts:

1. **Real requests:** seven real `fetch` calls from the page, some that
   work and some that fail on purpose.
2. **What if…:** a model of the browser's checks, where you can change the
   request and the server's headers.
3. **The headers:** a reference table.

This builds on [HTTP](../HTTP/) (requests, methods, headers, status
codes) and [fetch](../fetch/) (making requests from JavaScript).

## Origins

An **origin** is scheme + host + port. Two URLs have the same origin only
if all three match:

| Page | Request to | Same origin? |
| --- | --- | --- |
| `https://backspaces.github.io/Browser/` | `https://backspaces.github.io/ValTown/` | yes (the path doesn't count) |
| `https://backspaces.github.io` | `https://backspaces-rooms.val.run` | no: different host |
| `https://rooms.example` | `http://rooms.example` | no: different scheme |
| `http://localhost:8000` | `http://localhost:8765` | no: different port |
| a page opened from a file | anything | no: its origin is `null` |

## The rule CORS relaxes

The **same-origin policy**: a page may *send* a request to any origin, but
its JavaScript may only *read* the reply from its own origin.

The reason is cookies. Without the rule, any site you visit could run
`fetch("https://yourbank.com/account", { credentials: "include" })`. Your
browser would attach your bank cookies, and the page would read your
balance.

Sending was never blocked. HTML forms and `<img>` tags could always hit
other sites, and blocking them would have broken the web. So the rule
only protects the *reply*.

**CORS** (Cross-Origin Resource Sharing) is how a server opts out. The
server adds `access-control-*` headers that tell the browser which other
origins may read its replies.

Three consequences surprise people:

- **The browser enforces it, not the server.** The server handles the
  request and replies as usual. If the reply lacks the right headers, the
  browser receives it anyway and just hides it from the page. That's why
  the same URL works from `curl` and fails from a page.
- **The request often still happens.** For a "simple" request (below),
  the browser sends it first and checks afterwards. A blocked POST can
  still have added a row to a database. CORS protects what the page can
  *read*, not what the server *does*.
- **The page is told almost nothing.** A blocked `fetch` rejects with a
  bare `TypeError: Failed to fetch`. The real reason appears only in
  DevTools' Console, for example "No 'Access-Control-Allow-Origin' header
  is present". Telling the page more would leak information about the
  other site.

CORS is not a way to secure a server. Anyone can call it with `curl`. It
protects the *user*: it stops a page in their browser from reading another
site with their cookies.

## Simple requests and preflights

The browser divides cross-origin requests into two kinds.

**Simple requests** are sent right away, and the reply is checked when it
arrives. A request is simple when:

- the method is GET, HEAD or POST, and
- it sets no headers beyond a short safe list (`accept`,
  `accept-language`, `content-language`, `content-type`), and
- any `content-type` is one of the three that HTML forms can send:
  `text/plain`, `application/x-www-form-urlencoded` or
  `multipart/form-data`.

Those limits match what a plain HTML form could always do. Servers already
had to cope with such requests arriving from anywhere.

**Anything else is preflighted.** Common triggers:

- `content-type: application/json`, which covers almost every JSON API
  call;
- PUT, PATCH or DELETE;
- an `authorization` header or a custom one like `x-api-key`.

Before sending such a request, the browser asks permission with an
`OPTIONS` request to the same URL:

```
OPTIONS /room/bath
origin: https://backspaces.github.io
access-control-request-method: POST
access-control-request-headers: content-type
```

The server's reply must allow that origin, method and each listed header.
Only then is the real request sent. If the preflight fails, the real
request never leaves the browser.

The preflight protects servers written before CORS. Those servers assume
no browser page can send them a cross-origin JSON POST or a DELETE,
because until CORS none could. The browser checks before breaking that
assumption.

## The headers

### Sent by the browser

The browser adds these itself; page code can't set or fake them.

- **`origin`**: the page's origin, on every cross-origin request and on
  same-origin POSTs. It's `null` for pages opened from a file, sandboxed
  iframes, and some redirects.
- **`access-control-request-method`** (preflight only): the method the
  real request will use.
- **`access-control-request-headers`** (preflight only): the non-safe
  headers the real request will carry, lowercase, sorted and
  comma-separated.

### Sent by the server

**`access-control-allow-origin`** is the essential one. It has to be on
every reply the page should read, preflight or not.

- `*` means any origin. That fits public data with no cookies involved,
  like Rooms.
- One exact origin, `https://backspaces.github.io`, allows only that
  origin. It must match exactly: scheme, host and port, with no trailing
  slash.
- The header holds **one value**. `https://a.example, https://b.example`
  is invalid and fails for everyone. To allow several origins, the server
  keeps its own list, checks the request's `origin` against it, and
  echoes the matching one back:

  ```js
  const allowed = ["https://backspaces.github.io", "http://localhost:8765"];
  const origin = req.headers.get("origin");
  const cors = allowed.includes(origin)
    ? { "access-control-allow-origin": origin, "vary": "origin" }
    : {};
  ```

  **`vary: origin`** matters with echoing. It tells caches (the
  browser's, a CDN's) that the reply depends on the `origin` header.
  Otherwise a cache could hand one origin's reply, holding that origin's
  permission, to another.

**`access-control-allow-methods`** (preflight only): the extra methods
allowed, e.g. `GET, POST, PUT, DELETE`.

- GET, HEAD and POST are always allowed, listed or not. The header only
  matters for PUT, PATCH, DELETE and the like.
- `*` allows any method, but only for requests without cookies.

**`access-control-allow-headers`** (preflight only): the non-safe request
headers allowed, e.g. `content-type, authorization`. It's not
case-sensitive.

- `*` allows any header for requests without cookies.
- `*` never covers `authorization`, which always has to be named.

**`access-control-allow-credentials: true`** allows a page that sent
cookies to read the reply.

- A page sends cookies to another origin only when it asks with
  `fetch(url, { credentials: "include" })`. The default,
  `"same-origin"`, sends them only to the page's own origin.
- When cookies are sent, every `*` stops being a wildcard. `allow-origin`
  must name the exact origin, and methods and headers must be listed by
  name. This is deliberate: "any site, with the user's cookies" is exactly
  the attack the same-origin policy exists to stop.

**`access-control-expose-headers`** lists the response headers the page
may read beyond the basic ones.

- Without it, a cross-origin page sees only `cache-control`,
  `content-language`, `content-length`, `content-type`, `expires`,
  `last-modified` and `pragma`. Everything else is filtered out of
  `res.headers`, including the `access-control-*` headers themselves.
- A typical use is `x-request-id, etag`, or a pagination header like
  `link`. `*` exposes everything, for requests without cookies.

**`access-control-max-age`** (preflight only): how many seconds the browser
may reuse this preflight answer for the same URL and origin.

- Without it, the answer lasts 5 seconds, so a page posting JSON less
  often than that pays for an `OPTIONS` round trip every time.
- Browsers cap it: Chrome at 7200 (2 hours), Firefox at 86400 (24 hours).
  Common values are `600`, `7200` and `86400`.

## Common mistakes

Most of these can be tried in the demo's **What if…** section. The last
one is a real request on the page.

- **A list in `allow-origin`.** Only one value is allowed. Echo the
  matching origin instead, plus `vary: origin`.
- **`*` with cookies.** It's rejected. Name the origin and add
  `allow-credentials: true`.
- **Not answering OPTIONS.** Many frameworks route only GET and POST, so
  the preflight gets a 404 or 405. It needs a 2xx status and the headers.
- **Headers only on success.** If an error reply (400, 500) lacks
  `allow-origin`, the page sees a CORS error instead of the real error.
  Rooms avoids this by building every JSON reply, errors included, with
  one helper that adds the headers. A reply the handler doesn't build,
  such as the platform's error page when the code throws, won't have
  them.
- **Forgetting `expose-headers`.** The header is in the Network tab, but
  `res.headers.get("x-request-id")` returns `null`.
- **`mode: "no-cors"` as a fix.** It doesn't bypass anything. It means
  "send this, and I promise not to read the reply". You get an opaque
  response: status 0, no headers, empty body.

## Beyond `fetch`

CORS applies wherever a page wants to *use* another origin's data, not
just with `fetch`:

- `<script type="module">` and `import` load in CORS mode, so a module
  on another origin needs `allow-origin`. (Classic `<script src>` doesn't.)
- Web fonts from another origin need it.
- `<img crossorigin>` needs it too. Without the attribute the image
  still shows, but drawing it on a canvas "taints" the canvas, and the
  page then can't read the canvas's pixels.

## In the ValTown repo

[Rooms](https://github.com/backspaces/ValTown/blob/main/Rooms/http.ts)
is the demo's real server:

- [Lines 7–11](https://github.com/backspaces/ValTown/blob/main/Rooms/http.ts#L7-L11)
  define the three headers once.
- [Line 16](https://github.com/backspaces/ValTown/blob/main/Rooms/http.ts#L16)
  spreads them into every JSON reply, so errors carry them too.
- [Line 39](https://github.com/backspaces/ValTown/blob/main/Rooms/http.ts#L39)
  answers every preflight, on any path, before any routing.
- `*` suits it: Rooms uses no cookies, and anyone could call it with
  `curl` anyway.
- Two small things it could change:
  - `GET, POST, OPTIONS` in `allow-methods` is harmless, but not needed:
    GET and POST always pass, and pages don't send OPTIONS themselves.
  - It sends no `max-age`, so Peers' JSON POSTs are preflighted again
    whenever 5 seconds have passed. Adding
    `"access-control-max-age": "86400"` would remove most of those.

The Rooms test page at `/` doesn't need any of this, because it's served
from the same origin as the API.

[Peers](https://github.com/backspaces/ValTown/blob/main/Peers/http.ts)
uses Rooms from another origin, `backspaces-peers.val.run`. Its polling
GETs are simple requests. Its JSON POSTs are preflighted.

Peers' own server also sends `access-control-allow-origin: *` when it
serves `peers.js`. That's the module case above: it lets any page `import`
the module straight from `backspaces-peers.val.run`.

## The demo's code

- **Real requests.** Each test in the `tests` array has three parts: the
  code shown as text, a `run` function that does it, and a `why`
  explanation revealed after it runs.
  - `describe(res)` prints `res.type`. It's `"cors"` for a readable
    cross-origin reply and `"opaque"` for `no-cors`.
  - It also prints `[...res.headers.keys()]`, which shows the filtering:
    Rooms sends its CORS headers, but they aren't in the list.
- **What if…** `simulate()` follows the steps of the Fetch standard's
  CORS check, in order:
  1. classify the request as simple or preflighted;
  2. for a preflight, check the status, then origin and credentials, then
     method, then headers;
  3. check origin and credentials again on the real reply;
  4. work out which response headers the page can see.

  It leaves out some rarer rules, such as the length limit on safe header
  values, redirects, and Chrome's extra checks for requests into private
  networks.
- `originCheck` is shared by both replies, because the browser runs the
  same origin and credentials check on the preflight and on the real
  response.
- Everything is built with `createElement` and `textContent`, as in the
  [DOM](../DOM/) topic, so text typed into the fields is never parsed as
  HTML.
