# Deno

Layer: **outside the browser**. Deno runs layers 1 and 2 (the language and
the web platform APIs) on your computer or a server, with no layer 3: no
DOM, no page. In its place it has what servers need: files, network
ports, processes. And it comes with a full set of tools, which is the
part that surprises people who think of it as "a way to run JavaScript".

[Try it](https://backspaces.github.io/Browser/Deno/): one small server,
[server.js](server.js), answers the same requests twice, once run inside
the page and once run by Deno on your computer.

## A runtime and a toolchain

A **runtime** runs code: the browser is one, Node is one, Deno is one.
Node runs JavaScript and leaves the rest to separate packages, each with
its own config file. Deno builds the usual ones in:

| Command | Does | In Node you'd add |
| --- | --- | --- |
| `deno run`, `deno serve` | run JavaScript or **TypeScript directly**, no build step | `tsx`, or `tsc` first |
| `deno check` | type-check | `typescript` |
| `deno fmt` | format code | Prettier |
| `deno lint` | find likely bugs | ESLint |
| `deno test` | run tests | Jest, Vitest |
| `deno task` | named commands | npm scripts |
| `deno add`, `deno install`, `deno outdated` | manage packages, from npm or JSR | npm, pnpm, yarn |
| `deno compile` | turn a script into one standalone program | pkg |
| `deno doc` | docs from the code's comments | TypeDoc |

All of them read one settings file, [`deno.json`](#denojson), where Node
needs `package.json`, `tsconfig.json`, `.prettierrc`, `.eslintrc` and so on.

Ryan Dahl wrote Node (2009) and then Deno (2018), largely as an answer to
what he regretted about Node: no permissions, `node_modules`, separate
tooling, and Node's own APIs where the web already had standard ones.

## One handler, many places

The web platform part matters most. A Deno server is one function: a
`Request` goes in, a `Response` comes out. They're the same classes a
page uses with [fetch](../fetch/), seen from the other end:

```js
export default {
  fetch(req) {
    const url = new URL(req.url);
    return new Response(`Hello from ${url.pathname}`);
  },
};
```

`deno serve server.js` listens on a port and calls `fetch` once per HTTP
request. Nothing in that code is Deno's own, so the same file works
anywhere that takes a "fetch handler":

| Where | How it calls `fetch(req)` |
| --- | --- |
| Deno | `deno serve server.js`, on your computer or a server |
| This page | `server.fetch(new Request(url))`, called directly; no network |
| Cloudflare Workers | for each request, at Cloudflare's data centers |
| Val Town | for each request to the val's address |
| Bun | `bun server.js` |

That's how our [MCP servers](https://github.com/backspaces/MCP) run
unchanged on a Mac with `deno serve` and on Cloudflare: each host gets
a three-line entry file and nothing else.

## The demo's code

- [server.js](server.js) answers `/hello?name=…`, `/time`, and
  `/dice?sides=…`, with JSON. It's plain `.js`, not `.ts`, only so the
  browser can load it too; Deno would run either.
- Each reply says where it ran (`ranIn`). That's the one line that peeks at
  its surroundings: `globalThis.Deno` exists only in Deno, `document` only
  in a page.
- Every reply carries `access-control-allow-origin: *`, so a page on
  another origin may read it (see [CORS](../CORS/)). Without it, the right
  column would fail.
- [index.html](index.html) does `import server from "./server.js"`, then
  for each button:
  - **left column:** `server.fetch(new Request(...))`. The page calls
    the handler itself, exactly as `deno serve` would.
  - **right column:** `fetch("http://localhost:8001/...")`. A real HTTP
    request to Deno running the same file.
- **Bad dice** and **Not found** show a 400 and a 404 coming back the
  same way from both. As in the [fetch](../fetch/) topic, those are
  replies, not failures.
- As in the other topics, output goes through `textContent`.

### Running it

The left column always works: it needs only the page. The right column
needs Deno running `server.js` on your computer, at port 8001. There are
two ways to try it.

**1. The live page, plus one command.** Open
[the live page](https://backspaces.github.io/Browser/Deno/), and in a
terminal, in any folder, run:

```sh
deno serve --port 8001 https://backspaces.github.io/Browser/Deno/server.js
```

Nothing to clone: Deno downloads `server.js` from that address and serves
it, which is itself a Deno feature. One catch: browsers are wary of a
public site calling your own computer. Some ask permission first, some
refuse. If the right column says nothing answered while the server is
running, use the second way.

**2. Everything local.** From a clone of this repo, in two terminals:

```sh
deno run -A jsr:@std/http/file-server     # serves the pages, at http://localhost:8000
deno serve --port 8001 Deno/server.js     # the demo server, at http://localhost:8001
```

Then open http://localhost:8000/Deno/. Both commands would use port 8000
if left alone, so the demo server is moved to 8001.

Ctrl-C stops each server.

## Secure by default

A script in Deno can't reach the network, read or write files, read
environment variables or start programs unless you allow it:

| Flag | Allows |
| --- | --- |
| `--allow-net` | network: listening and connecting (`--allow-net=api.example.com` for one host) |
| `--allow-read`, `--allow-write` | files (`--allow-read=./data` for one folder) |
| `--allow-env` | environment variables |
| `--allow-run` | starting other programs |
| `-A` | everything |

`deno serve` grants one thing by itself: listening on its own port. So
the demo server runs with no flags at all, yet it can't reach anything
else. Had `server.js` tried to read a file or call another site, it
would have stopped with an error naming exactly what it wanted:

```
error: NotCapable: Requires read access to "/etc/hosts", run again with the --allow-read flag
error: NotCapable: Requires net access to "example.com:443", run again with the --allow-net flag
```

Node lets every script do everything. In Deno a package you install can't
quietly read your files or send them somewhere. `-A` turns all of that
off, so it's for tools you trust, like Wrangler.

## deno.json

Deno looks for `deno.json` in the current folder and then each parent, so
everything run inside a project picks up its settings. A real one, from
the [MCP repo](https://github.com/backspaces/MCP/blob/main/deno.json):

```json
{
  "compilerOptions": { "strict": false },
  "nodeModulesDir": "none",
  "tasks": {
    "serve": "deno serve -A hosts/deno/serve.ts",
    "cf": "deno run -A npm:wrangler@4.151.3 --config=hosts/cloudflare/wrangler.jsonc",
    "cf:deploy": "deno task cf deploy",
    "cf:tail": "deno task cf tail"
  }
}
```

- **`compilerOptions`**: how strictly `deno check` checks types.
- **`nodeModulesDir`**: where npm packages live (below).
- **`tasks`**: named commands. `deno task serve` runs the line stored
  under `serve`; `deno task` alone lists them. The names are yours: `cf`
  means nothing to Deno, and the colon in `cf:deploy` is just part of the
  name.

Words after a task's name are added to the end of its command, and a task
can call another, so `deno task cf:deploy` unfolds in two steps:

```
deno task cf:deploy
  → deno task cf deploy
  → deno run -A npm:wrangler@4.151.3 --config=hosts/cloudflare/wrangler.jsonc deploy
```

The last line runs **Wrangler**, Cloudflare's publishing tool, an npm
package. Deno downloads it the first time, so it works without Node,
which matters on a Mac whose Node is too old for Wrangler. Deno prints
each step (`Task cf deno run -A …`) before running it, so the unfolding is
never hidden.

Tasks run in Deno's own small shell, so they work the same on Mac, Linux
and Windows. Other common keys: `imports` (short names for packages),
`fmt`, `lint`, `test`, `exclude`.

## Packages: npm and JSR

```js
import { z } from "npm:zod@4";                  // from npm, no install step
import { serveDir } from "jsr:@std/http@1";     // from JSR, Deno's registry
```

- **`npm:`** fetches a package from npm into Deno's cache the first time.
  There's no `npm install` and no `node_modules` unless you ask for one.
- **`jsr:`** is [JSR](https://jsr.io), a newer registry that publishes
  TypeScript directly. Deno's standard library lives there; the file
  server above is `jsr:@std/http/file-server`.
- **Bare names** (`"zod"`) work too, from `deno.json`'s `imports` or a
  `package.json`. The MCP repo uses those so the same code also builds on
  Cloudflare, whose tools read `package.json`.
- **`nodeModulesDir`** chooses where packages go: `"none"`, Deno's
  cache only; `"auto"`, a `node_modules` folder Deno manages; or
  `"manual"`, a `node_modules` you fill with `npm install`.
- **`deno.lock`** pins exact versions, like `package-lock.json`. Commit it.

## Deno and Node, side by side

| | Node | Deno |
| --- | --- | --- |
| TypeScript | needs a tool | runs it directly |
| Permissions | none | off until allowed |
| Web APIs (`fetch`, `Request`, `URL`, `crypto`) | added over the years, alongside Node's own | the first choice, as in the browser |
| Tools | separate packages | built in |
| npm packages | yes | yes, with `npm:` |
| Settings | several files | `deno.json` |

Most npm packages work in Deno now, and modern Node has most web APIs, so
the two have grown closer. The difference that remains is mostly
defaults: Deno starts locked down, typed, and with its tools in the box.
