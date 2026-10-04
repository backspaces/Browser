# REST

Layer: **underneath all three**, like [HTTP](../HTTP/). REST isn't a
protocol or a library. It's a way of designing an API on top of HTTP, so
that the URLs, methods, status codes and headers HTTP already has do the
work.

[Try it](https://backspaces.github.io/Browser/REST/). The page talks to
[Rest](https://github.com/backspaces/ValTown/tree/main/Rest), a small
REST API on val.town built for it: a collection of JSON items anyone can
read and write. Each button sets up one request; **Send** makes it, shows
the whole response, and refreshes the collection beside it.

This builds on [HTTP](../HTTP/) (methods and status codes),
[fetch](../fetch/) (making requests) and [CORS](../CORS/) (why some
requests need permission first).

## The idea

**URLs name things. Methods say what to do with them.**

| URL | `GET` | `POST` | `PUT` | `DELETE` |
| --- | --- | --- | --- | --- |
| `/items` | list them | add one; the server picks its id | | |
| `/items/milk` | read it | | create or replace it | remove it |

- A URL names a **resource**: a thing, not an action. `/items/milk`,
  never `/getItem?id=milk` or `/deleteMilk`.
- Resources come in two shapes: a **collection** (`/items`) and the
  **items** in it (`/items/milk`). Most REST APIs are a handful of
  collections, each a table of these.
- The **method** is the verb, from HTTP's short fixed list. So a
  stranger can guess what `DELETE /items/milk` does without reading any
  documentation, and so can a browser cache or a proxy.

The name, *representational state transfer*, comes from Roy Fielding's
2000 thesis. "Representation" is the word for what actually crosses the
wire: not the item itself (a row in a database) but a representation of
it, here JSON or HTML.

## `PUT` versus `POST`

This is the distinction people most often get wrong.

- **`PUT /items/milk`** means "make the item at this URL equal to this
  body". The client chooses the URL. The first `PUT` creates it (`201`);
  the second replaces it with the same thing (`200`). Either way, the
  collection ends up the same. That makes `PUT` **safe to repeat**: if a
  request times out and nobody knows whether it arrived, sending it again
  is harmless.
- **`POST /items`** means "add this to the collection". The server
  chooses the URL. Send it twice and there are two items. A timeout
  leaves you unsure whether to retry.

Try **PUT milk** twice, then **POST an item** twice, and compare the
collection.

When to use which: if the client knows (or names) the thing, `PUT` to its
URL. If the server assigns identity, as with a new order number or a chat
message, `POST` to the collection.

`PATCH` is the third way to write: "change *part* of this". Rest doesn't
support it, which the **PATCH** button shows in an unexpected way (see
CORS below).

## Status codes that carry meaning

A REST API's status codes are part of its answer, not just "worked" or
"didn't":

| Code | Rest sends it when | And says |
| --- | --- | --- |
| `200 OK` | a read, or a `PUT` that replaced | the item |
| `201 Created` | `POST`, or a `PUT` that created | the item, plus `location: /items/<id>` |
| `204 No Content` | a `DELETE` | nothing: the body is empty |
| `400 Bad Request` | the body isn't valid JSON | `{ "error": ... }` |
| `404 Not Found` | no item at that URL | `{ "error": ... }` |
| `405 Method Not Allowed` | the URL exists, the method doesn't | `allow: GET, HEAD, POST` |
| `415 Unsupported Media Type` | the body isn't sent as JSON | `{ "error": ... }` |

- **`location` after `201`** is how the client learns the URL the server
  chose. The page offers a button to follow it.
- **`allow` after `405`** tells the client what *would* work. The
  difference between `404` and `405` matters: `404` says "no such thing",
  `405` says "that thing exists, but not for that".
- **Errors still have bodies.** Rest always sends JSON with an `error`
  string, so a client can show a reason, not just a number.
- Remember from [fetch](../fetch/#fetch) that `fetch()` resolves for all
  of these. Only `res.ok` (true for 2xx) tells success from failure.

## One URL, several formats

`/items` is one resource, but it can be represented more than one way.
The client says what it wants with the `accept` header, and the server
picks:

- `fetch` sends `accept: */*` by default, and gets JSON.
- A browser tab sends `accept: text/html,...`, and gets a page: the same
  JSON, with its links clickable. Open
  [backspaces-rest.val.run/items](https://backspaces-rest.val.run/items)
  to see it.

This is **content negotiation**. The reply includes `vary: accept`,
which tells caches that this URL's answer depends on that header, so a
cached HTML page isn't handed to a program that wanted JSON.

The alternative is separate URLs (`/items.json`, `/items?format=json`).
They're easier to try in a browser, but now one thing has several names.
Both are common.

## Links between resources

Every item Rest returns includes its own `url`, and `GET /` lists the
API's starting points. A client can then follow links instead of
building URLs from strings, the way a person follows links on a web page.
Fielding's thesis makes this central (the jargon is *HATEOAS*, hypermedia
as the engine of application state). Most real APIs do a little of it,
like Rest, rather than all of it.

## Stateless

Each request carries everything needed to answer it: the method, the
URL, the headers, the body. The server remembers nothing about the
client between requests. There are no sessions, and no "current item".

That's why any request can be retried, cached or sent to a different
machine. It's also what makes REST a good fit for val.town, where
consecutive requests may not even reach the same machine.

## CORS and REST

A REST API used from pages on other sites runs into CORS more than most
APIs do:

- **`PUT` and `DELETE` are always preflighted**, and so is any JSON body
  (`content-type: application/json`). So nearly every write costs an
  extra `OPTIONS` request first, which the server must answer with
  `access-control-allow-methods` listing them. Watch DevTools' Network
  panel while sending a `PUT`: two requests go out.
- **The PATCH button never reaches the server.** Rest's preflight reply
  doesn't list `PATCH`, so the browser refuses to send it and `fetch`
  rejects. `curl`, which ignores CORS, would get `405`.
- **Headers are hidden unless exposed.** A page on another origin can
  read only a few response headers (`content-type` and a handful more).
  `location`, `allow` and `vary` would arrive but stay invisible to the
  page's JavaScript, so Rest sends
  `access-control-expose-headers: location, allow, vary`. Without that,
  the page couldn't follow a `201`'s `location`.

See [CORS](../CORS/) for the rules.

## REST versus RPC

The other big style is **RPC** (remote procedure call): one URL, and the
action named in the body.

```
POST /rpc
{"method": "deleteItem", "params": {"id": "milk"}}
```

- RPC maps directly onto functions, so it's natural for "do this" APIs
  that aren't about things: send an email, run a calculation.
- But HTTP can't see what's happening. Every call is a `POST` to the same
  URL, so caches, proxies, retries and browser tools learn nothing from
  the method or URL.
- REST suits APIs about **things**, with the same few operations on each
  kind. It gets HTTP's caching, retry rules and tooling for free.

Many real APIs mix the two: REST for the resources, plus a few `POST`
"action" URLs such as `POST /items/milk/archive`.

## In the ValTown repo

[Rest](https://github.com/backspaces/ValTown/tree/main/Rest) is the
textbook version. The other vals use HTTP in REST's spirit, but bend the
conventions in places, and seeing where is a good exercise:

- **Rooms** is nearly REST: `POST /room/<name>` adds a message,
  `GET /room/<name>` reads them. Messages are never changed, so there's
  no `PUT` or `DELETE`.
- **Notes** saves with `POST /<name>` where REST would use `PUT`, can't
  delete, and replies in plain text.
- **Watch** picks JSON with `?json` rather than `accept`, and its
  `?check` link makes a `GET` change something, which GETs shouldn't.
- **Mcp** is pure RPC. MCP is built on JSON-RPC: one URL, every call a
  `POST`, the action in the body. That suits it, because its client is
  a model discovering tools as it goes. It's built *on top of* the REST
  vals: each tool is a `fetch` to one of them.

## The demo's code

- Built on the [fetch](../fetch/) page: `readForm()` turns the form into
  a URL and an options object, and `update()` writes the same request out
  as code.
- **Send** calls `fetch`, then lists the status, every header the page is
  allowed to see, and the body (pretty-printed when it's JSON). The
  headers shown are the ones CORS lets through, so `location`, `allow`
  and `vary` appear only because Rest exposes them.
- After a `201`, the `location` header becomes a button that loads a
  `GET` for that URL into the form.
- `meanings` maps each status Rest sends to a sentence for the note
  under the panels.
- `showItems()` fetches `/items` after every send (and on load), so the
  collection panel always shows the result of what you just did.
- The status line shows only the number: `res.statusText` is empty over
  HTTP/2 and 3, which send no reason phrase.
- All output goes through `textContent`, never `innerHTML`. That's why
  **Ask for HTML** shows the HTML source rather than a page.
