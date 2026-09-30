# fetch

Layer: **web platform API**. `fetch`, `Request`, `Response`, `Headers`
and `URL` aren't part of the JavaScript language; the environment
provides them. They were invented for browsers, and Deno copied them
exactly. That's why a val.town handler receives a `Request` and returns a
`Response`: the same classes a page uses with `fetch`, seen from the
other end.

This topic is the JavaScript side. For what's being sent (methods, URLs,
headers, status codes), see [HTTP](../HTTP/).

[Try it](https://backspaces.github.io/Browser/fetch/): build a request to
Rooms, send it, and see the code, the `Request` object, and the reply.
The **Try** buttons include replies that are errors and requests that
never get sent.

## `fetch()`

```js
const res = await fetch(url, { method, headers, body });
if (!res.ok) throw new Error(`Rooms said ${res.status}`);
const data = await res.json();
```

- **It returns a Promise** for a `Response`. `await` waits for it without
  freezing the page.
- **There are two waits.**
  - The first `await` finishes as soon as the status and headers arrive,
    even if the body is still downloading.
  - `await res.json()` (or `.text()`) waits for the rest of the body and
    reads it.
  - A body can be read only once: a second `.json()` throws.
- **An HTTP error is not a rejection.** A 404 or 500 is still a
  response: the server answered. `fetch` resolves, and `res.ok` is
  `false`. `res.ok` is true only for statuses 200–299. Forgetting to
  check it is the most common `fetch` bug, because the code then treats
  an error reply as data. The demo's **Bad room name**, **Not JSON** and
  **Missing field** all resolve.
- **Rejection means no usable response.** `fetch` rejects with a
  `TypeError` only when:
  - the network failed;
  - the request couldn't be built (**GET with a body**);
  - or CORS hid the reply (**DELETE**).

  There's nothing to inspect; the Console has the reason.
- **The options are all optional.** `fetch(url)` alone is a GET with no
  extra headers. The common options:
  - `method`: `"GET"` if left out.
  - `headers`: a plain object, `{ "content-type": "application/json" }`.
  - `body`: a string, or form data, a [`Blob`](../Blobs/) and so on. **Not allowed
    with GET or HEAD**: `fetch` throws before sending, so their data goes
    in the query string instead.
  - `cache`, `credentials`, `mode`: how to use the HTTP cache, cookies,
    and CORS. See [HTTP](../HTTP/README.md#caching) and [CORS](../CORS/).
- **The browser fills in headers.** A string body with no
  `content-type` gets `text/plain;charset=UTF-8` (**Not JSON** in the
  demo). JSON has to be labeled yourself. The browser also adds `origin`,
  `user-agent`, `accept` and cookies, which page code can't set.

## `URL` and query strings

Build URLs with the `URL` class rather than gluing strings. It handles
the `?`, the `&` and the encoding:

```js
const url = new URL("/room/demo", "https://backspaces-rooms.val.run");
url.searchParams.set("since", 0);
url.searchParams.set("me", "Ann & Bob");
url.href; // "https://backspaces-rooms.val.run/room/demo?since=0&me=Ann+%26+Bob"
```

Gluing `"?me=" + name` would break on that `&`: the server would see
`me=Ann ` and a stray parameter ` Bob`. **Bad room name** in the demo
shows `URL` encoding a space as `%20`.

A server reads them back the same way. Rooms does
`new URL(req.url).searchParams.get("since")` and gets the string `"0"`,
or `null` if it's absent. Query values are always strings, which is why
Rooms wraps it in `Number(...)`.

## `Headers`

Headers go in as a plain object and come back as a `Headers` object. It
works like a `Map` whose names ignore case:

```js
res.headers.get("Content-Type"); // "application/json;charset=UTF-8"
for (const [name, value] of res.headers) console.log(name, value);
```

When the reply comes from another origin, the page sees only a few basic
headers, unless the server lists more in `access-control-expose-headers`
(see [CORS](../CORS/)).

## `Request` and `Response`

`fetch(url, options)` is shorthand. It builds a `Request` from its
arguments and sends it. You can build one yourself; the demo does, to
show what the browser made of the form:

```js
const req = new Request(url, { method: "POST", body: "hello" });
req.method;                      // "POST"
req.url;                         // the full URL, encoded
req.headers.get("content-type"); // "text/plain;charset=UTF-8", added for you
const res = await fetch(req);
```

A `Response` is the reply. It has:
- `.status` and `.ok`;
- `.headers`;
- the body readers `.json()`, `.text()` and `.blob()` (see
  [Blobs](../Blobs/));
- `.type`: `"basic"` for a same-origin reply, `"cors"` for a
  cross-origin reply CORS allowed, and `"opaque"` for an unreadable
  `no-cors` one.

### The same classes on the server

The same classes appear on the server, used from the other side. Here
is one POST from the demo, traced through both ends:

| In the page | In Rooms' [`http.ts`](https://github.com/backspaces/ValTown/blob/main/Rooms/http.ts) |
| --- | --- |
| `fetch(url, { method: "POST", body })` builds a `Request` and sends it | `export default async function (req)`: val.town hands that request to the handler as a `Request` ([line 38](https://github.com/backspaces/ValTown/blob/main/Rooms/http.ts#L38)) |
| `method: "POST"` | `req.method === "POST"` |
| the URL and its `?since=0` | `new URL(req.url)`, then `url.searchParams.get("since")` ([line 81](https://github.com/backspaces/ValTown/blob/main/Rooms/http.ts#L81)) |
| `body: JSON.stringify(...)` | `await req.text()`, then `JSON.parse` ([lines 54–58](https://github.com/backspaces/ValTown/blob/main/Rooms/http.ts#L54-L58)) |
| `res.status`, `res.ok` | `new Response(body, { status, headers })` in `json()` ([lines 13–17](https://github.com/backspaces/ValTown/blob/main/Rooms/http.ts#L13-L17)) |
| `await res.json()` | `JSON.stringify(value)` as that `Response`'s body |

One API, used in both directions. Learning `fetch` in the browser
teaches most of what a Deno or val.town server needs, and the reverse.

## The demo's code

- `readForm()` turns the form into the two things `fetch` takes: a `URL`
  (built with `searchParams.set`, so values are encoded) and an options
  object with `method`, `headers` and `body` set only when used.
- `codeFor()` writes those same values back out as source code, so the
  code panel always shows the request that **Send** will make.
- `update()` calls `new Request(url, init)` on every change and prints
  the result. That's how the panel shows what the *browser* made of the
  request: the added `text/plain` content type, the encoded URL, or the
  `TypeError` for a GET with a body.
- **Send** passes that same `Request` to `fetch`. It then reports one of
  three outcomes:
  - resolved with `res.ok` true;
  - resolved with `res.ok` false (an HTTP error);
  - rejected (no response at all).
- As in the other topics, all output goes through `textContent`, never
  `innerHTML`.
