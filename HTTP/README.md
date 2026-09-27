# HTTP

Layer: **underneath all three**. HTTP isn't JavaScript at all. It's the
protocol a browser uses to fetch pages, images, scripts and data, and
the one a val.town server answers. [fetch](../fetch/) is JavaScript's way
of speaking it, and [CORS](../CORS/) is a set of HTTP headers.

[Try it](https://backspaces.github.io/Browser/HTTP/). The page has three
parts:

1. The same request in HTTP/1.1, HTTP/2 and HTTP/3.
2. The browser's record of the page's own requests: protocol, timings,
   bytes, and whether the cache answered.
3. The real headers GitHub Pages sent with the page, each explained.

## Messages

Every exchange is one **request** and one **response**.

A request has four parts:

1. a **method**: what to do (`GET`, `POST`, …);
2. a **URL**: what to do it to, including any `?query`;
3. **headers**: `name: value` facts about the request;
4. an optional **body**: the data being sent.

A response has three:

1. a **status**: how it went (200, 404, …);
2. **headers**: facts about the reply;
3. an optional **body**: the data coming back.

That list, the *meaning* of HTTP, has been stable since the 1990s. The
current standard ([RFC 9110](https://www.rfc-editor.org/rfc/rfc9110))
describes it separately from any wire format.

## Versions: text, then frames

How those parts travel has changed. It's the same request each time,
reading a Rooms room.

**HTTP/1.1** (1997) sends them as lines of text:

```
GET /room/demo?since=0 HTTP/1.1
Host: backspaces-rooms.val.run
Accept: */*

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 37

{"messages":[],"last":0,"more":false}
```

- The first line holds the method, path and version. The reply's first
  line holds the version, status and a phrase ("OK").
- A blank line separates the headers from the body.
- A connection carries one request at a time. Browsers opened up to six
  connections per server to work around that.

**HTTP/2** (2015) sends the same parts as binary **frames**:

```
HEADERS frame, stream 5
  :method     GET
  :scheme     https
  :authority  backspaces-rooms.val.run
  :path       /room/demo?since=0
  accept      */*

HEADERS frame, stream 5
  :status        200
  content-type   application/json

DATA frame, stream 5, end of stream
  {"messages":[],"last":0,"more":false}
```

- The first line becomes **pseudo-headers** starting with `:`. DevTools
  shows these in a request's Headers panel.
- There's no status phrase, only the number. That's why `res.statusText`
  is usually empty.
- **Header names must be lowercase.** That's where the lowercase style
  now used everywhere comes from.
- Headers are compressed (**HPACK**) against a table both ends keep.
  `:method GET` is the single byte `82`, and a header repeated from the
  previous request costs a byte or two.
- Many requests share **one connection** as numbered streams, with their
  frames interleaved, so the six-connection workaround isn't needed.

**HTTP/3** (2022) keeps HTTP/2's frames and pseudo-headers but carries
them on **QUIC**, over UDP instead of TCP.

- QUIC builds in the encryption, so a connection is ready in fewer round
  trips.
- Its streams are independent. A lost packet delays only its own request.
  Over TCP it delays every request on the connection until it's resent.
- Header compression is **QPACK**, adapted from HPACK.

**Which version gets used** is settled without the page's involvement:

- Browsers only speak HTTP/2 and HTTP/3 over https. During the TLS
  handshake, the browser and server agree on HTTP/2 or 1.1, a step
  called ALPN.
- A server offers HTTP/3 with an **`alt-svc`** header, which the browser
  remembers for later requests. Rooms sends `alt-svc: h3=":443"`;
  GitHub Pages doesn't.
- Over plain `http://`, browsers use 1.1. Deno's development
  file server is plain http, so the demo shows `http/1.1` when run
  locally.

**So why is HTTP still written as text?** Because the meaning is the same
in every version, the old text layout survives as the notation. Specs,
documentation and `curl -v` output all use it. This repo's other notes
do too. When you see `GET /path HTTP/1.1` in documentation, read it as
"these parts", not as "these bytes".

## URLs

```
https://backspaces-rooms.val.run/room/demo?since=0&me=abc
└─┬─┘   └──────────┬───────────┘└───┬────┘└──────┬──────┘
scheme            host             path       query
```

- The **path** usually names a thing: here, the room called `demo`.
- The **query**, everything after `?`, adds options for this request, as
  `name=value` pairs joined with `&`.
  - `?since=0` tells Rooms "only messages with an id greater than 0",
    which is all of them.
  - Rooms' reply includes `last`, the id of its newest message. Sending
    that back as the next `since` gets only newer messages. That's how
    its chat page polls: one small request a second, each picking up
    where the last one left off.
- Characters that aren't allowed in a URL are **percent-encoded**: a space
  becomes `%20`, and `&` inside a value becomes `%26`.
- The part after `#` (the **fragment**) never reaches the server. The
  browser keeps it for scrolling to a place in the page.

## Methods

The method says what the request is for. The server's code decides what
each one really does, but these are the conventions:

| Method | Means | Body? | Safe to repeat? |
| --- | --- | --- | --- |
| `GET` | read something | no | yes: reading twice changes nothing |
| `HEAD` | GET, but only the status and headers | no | yes |
| `POST` | add something, or "do this" | yes | no: posting twice adds two messages |
| `PUT` | replace something with this body | yes | yes: the same body twice gives the same result |
| `PATCH` | change part of something | yes | not necessarily |
| `DELETE` | remove something | usually not | yes |
| `OPTIONS` | ask what's allowed | no | yes |

- **Rooms uses two methods.** `GET /room/<name>` reads messages.
  `POST /room/<name>` adds one. Anything else gets `405 Method Not
  Allowed`, including HEAD, which Rooms' code doesn't handle. (Many
  frameworks answer HEAD automatically by running the GET and dropping
  the body.)
- **OPTIONS is mostly the browser's.** It sends one as the CORS
  **preflight**, asking whether a cross-origin request is allowed before
  sending it. See [CORS](../CORS/).
- **"Safe to repeat"** (the standards call it *idempotent*) matters when
  a request times out and something has to decide whether to retry.
  Retrying a GET is harmless; retrying a POST might add a duplicate.
  Browsers and proxies retry idempotent requests on their own, so a GET
  that changes things on the server can end up running twice.

## Status codes

The first digit gives the kind of result:

- **2xx, success**: `200 OK`, `201 Created`, `204 No Content`.
- **3xx, look elsewhere**:
  - `301`/`302` redirects: the reply's `location` header gives the new
    URL, and the browser follows it.
  - `304 Not Modified`: "your cached copy is still good" (see Caching
    below).
- **4xx, the request was wrong**. Rooms uses four of these:
  - `400 Bad Request`: bad JSON or missing fields;
  - `404 Not Found`: a bad room name;
  - `405 Method Not Allowed`: anything but GET or POST;
  - `413 Payload Too Large`: a body over 16 KB.
- **5xx, the server failed**: `500 Internal Server Error`, or
  `502 Bad Gateway` (a server in front couldn't reach the one behind it).

## Headers

Header names ignore case. Some common ones:

**In requests:**

| Header | Says |
| --- | --- |
| `content-type` | the body's format: `application/json`, `text/plain`, … |
| `accept` | the formats the client would like back |
| `authorization` | credentials, e.g. `Bearer <token>` |
| `cookie` | cookies the browser stored for this site |
| `origin` | the page that caused this request, for CORS |
| `if-none-match` | "only send it if it's changed from this `etag`" |

**In responses:**

| Header | Says |
| --- | --- |
| `content-type` | the body's format |
| `content-length` | the body's size in bytes |
| `content-encoding` | how the body was compressed for the trip (`gzip`, `br`) |
| `cache-control` | whether and how long it may be cached |
| `etag`, `last-modified` | which version this is, for checking later |
| `location` | where to go instead (with a 3xx) |
| `set-cookie` | a cookie for the browser to store and send back |
| `alt-svc` | another way to reach this server, such as HTTP/3 |
| `access-control-*` | CORS permissions; see [CORS](../CORS/) |

The demo's third section lists every header GitHub Pages sends with the
page, with a meaning for each. It includes a few from the CDN in front
of it (`via`, `age`, `x-cache`); names starting `x-` are a server's own,
unofficial ones.

## Caching

The browser keeps copies of replies and reuses them. That is the main
reason pages load fast the second time. The server controls it with
headers:

- **`cache-control: max-age=600`** (GitHub Pages' setting) means "this
  copy is good for 10 minutes". Within that time the browser doesn't ask
  at all. `no-store` (val.town's setting for Rooms) means "never keep it".
- **`etag: "6ab811a2-dd8"`** is a fingerprint of this version. Once the
  copy is stale, the browser asks with `if-none-match: "6ab811a2-dd8"`.
  If the file hasn't changed, the server replies `304 Not Modified` with
  no body, and the browser uses its copy. `last-modified` and
  `if-modified-since` do the same with dates.

`fetch` lets a page choose how to use the cache. The demo's buttons show
three settings:

- the default follows the headers above;
- `cache: "no-cache"` always checks, usually getting a 304;
- `cache: "reload"` downloads again regardless.

Watch the **how** and **bytes transferred** columns change.

## Seeing real HTTP

- **DevTools, Network tab.** Right-click a column header and turn on
  **Protocol** to see `h2`, `h3` or `http/1.1` per request. Click a
  request to see its headers, including the HTTP/2 pseudo-headers.
- **`curl -v https://…`** prints the request and response headers in the
  text notation, whatever version it used.
- **From page code**, via the Resource Timing API, which the demo uses:
  ```js
  for (const e of performance.getEntriesByType("resource")) {
    console.log(e.name, e.nextHopProtocol, e.transferSize, e.responseEnd - e.startTime);
  }
  ```
  For requests to other origins, the protocol, sizes and detailed
  timings come back blank or 0. They're only visible if the server sends
  **`timing-allow-origin`**, a permission header like CORS's
  `allow-origin`. Without it, a page could learn about your visits to
  other sites from how fast their files load, because cached files load
  faster.

## In the ValTown repo

Rooms is served through Cloudflare and speaks HTTP/2, with HTTP/3
offered through `alt-svc`. Its code never sees any of that. The handler
receives a `Request` with a method, URL, headers and body. That's
exactly the version-independent meaning described above, which is why
the same handler works whether the browser used HTTP/1.1, 2 or 3.

## The demo's code

- **Section 1** is static: the three wire formats as text, with notes,
  switched by buttons.
- **Section 2**:
  - `performance.getEntriesByType("navigation")` gives the page's own
    load, and `"resource"` gives every other request.
  - Each entry's timestamps (`domainLookupStart`, `connectStart`,
    `secureConnectionStart`, `requestStart`, `responseStart`,
    `responseEnd`) become the coloured phases of its bar.
  - `how()` decides where the bytes came from by comparing sizes.
    `transferSize` of 0 with a body means the cache answered. A
    `transferSize` smaller than the body means only headers crossed the
    network: a 304.
- **Section 3** sends `fetch(location.href, { method: "HEAD" })` and lists
  `res.headers`. Because it's same-origin, every header is visible; for
  another origin, CORS would filter them.
