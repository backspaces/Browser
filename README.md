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
matters. Each topic's README says which layer it's about.

## Topics

One folder per topic: `index.html` is the working example, `README.md`
explains it.

- [DOM](DOM/): the page as a tree of objects; building it with
  `createElement`, and why `textContent` is safe where `innerHTML` isn't.
  ([try it](https://backspaces.github.io/Browser/DOM/))

Planned, roughly in order: events and forms, `fetch` and CORS (including
a deliberately failing request), storage, modules, page lifecycle, CSS
layout (flex, then grid), canvas.

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
