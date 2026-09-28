# Browser

Notes and small working examples on coding the browser: HTML, CSS and
JavaScript as the browser provides them. The standards bodies call this
the **web platform**. There's no everyday name for the trio, so the repo is
named after the place it all runs.

No frameworks and no build step: each example is a plain page you can
open, read with View Source, and poke at in DevTools, so the machinery
stays visible. Companion to the [ValTown](https://github.com/backspaces/ValTown)
repo, whose Rooms and Peers pages prompted this one.

## Three layers of JavaScript

"JavaScript in the browser" is really three things stacked together, and
it helps to know which one you're looking at:

1. **The language** (ECMAScript): syntax, `??=`, destructuring, Promises,
   `async`/`await`, `Map`, classes, modules. Identical in the browser,
   Deno and Node.
2. **Web platform APIs**: `fetch`, `Request`, `Response`, `URL`,
   `setTimeout`, `crypto`, `WebSocket`. Not part of the language; the
   environment supplies them. Invented for browsers, but Deno copied them
   on purpose. That's why a val.town handler receives a `Request` and
   returns a `Response`, the same classes a page uses with `fetch`.
3. **Browser only**: the DOM (`document`, elements, events, forms), CSS
   and layout, `sessionStorage`, canvas, WebRTC, page lifecycle events,
   and the same-origin rule that CORS relaxes.

This repo is mostly layer 3, plus HTML and CSS, with layer 2 where it
matters. Each topic's README says which layer it's about. Underneath
all three is HTTP, the protocol pages and servers use to talk. It isn't
JavaScript, but it gets its own topic because so much depends on it.

## Topics

One folder per topic: `index.html` is the working example, `README.md`
explains it.

- [DOM](DOM/): how HTML text becomes a tree of objects (and why the tree
  has no closing tags); seeing it in DevTools; building it with
  `createElement`, and why `textContent` is safe where `innerHTML` isn't.
  ([try it](https://backspaces.github.io/Browser/DOM/))
- [HTTP](HTTP/): the protocol under it all. Requests and responses,
  methods, status codes, headers and caching, and how HTTP/1.1's text
  became HTTP/2 and 3's binary frames.
  ([try it](https://backspaces.github.io/Browser/HTTP/))
- [fetch](fetch/): speaking HTTP from JavaScript. `fetch()`, `URL`,
  `Headers`, `Request` and `Response`, and why a 404 doesn't make `fetch`
  fail. ([try it](https://backspaces.github.io/Browser/fetch/))
- [CORS](CORS/): why a page can send to any site but only read replies from
  sites that allow it; each `access-control-*` header and its common
  values, with real requests that succeed and fail on purpose.
  ([try it](https://backspaces.github.io/Browser/CORS/))

Planned, roughly in order: events and forms, storage, modules,
page lifecycle, CSS layout (flex, then grid), canvas.

## Viewing the examples

Live on GitHub Pages at
[backspaces.github.io/Browser](https://backspaces.github.io/Browser/),
which also works on a phone.

Locally, simple pages open fine straight from the file (double-click, or
`open DOM/index.html`). Pages that use `<script type="module">` don't:
browsers treat each `file://` page as its own origin and refuse to load
modules from it. For those, serve the folder instead:

```sh
deno run -A jsr:@std/http/file-server
```

then open the address it prints.
