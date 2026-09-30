# Blobs and files

Layer: mostly **web platform API**. `Blob`, `File` and
`URL.createObjectURL` exist in Deno too. Picking and dropping files,
download links and canvas are **browser only**.

[Try it](https://backspaces.github.io/Browser/Blobs/). The page has four
parts:

1. Pick or drop a file and see what the browser knows about it, including
   its first bytes.
2. Give it a `blob:` URL and preview it.
3. Make a Blob from text and download it as a file.
4. Get Blobs from a canvas and from `fetch`.

Nothing you pick leaves your computer. It all happens inside the page.

## What a Blob is

A **Blob** ("binary large object") is a chunk of bytes plus a type:

```js
const blob = new Blob(["name,count\napples,3"], { type: "text/csv" });
blob.size   // 19: bytes, not characters
blob.type   // "text/csv"
```

- **The bytes can be anything:** an image, a PDF, audio, a zip file, or
  text.
- **The type is a MIME type**, the same kind of label as HTTP's
  `content-type` header (see [HTTP](../HTTP/README.md#headers)). It's
  just a label: nothing checks it against the bytes.
- **A Blob can't be changed.** `blob.slice(start, end)` gives a new Blob
  holding part of it, without copying the bytes.
- **Reading one takes time.** The bytes might be in a file on disk, not
  in memory yet, so every way of reading them returns a Promise:

```js
await blob.text()          // as a string (UTF-8)
await blob.arrayBuffer()   // as raw bytes; wrap in a Uint8Array to use them
blob.stream()              // a stream, for reading very large ones in pieces
```

`new Uint8Array(await blob.arrayBuffer())` gives an array of numbers from
0 to 255, one per byte. The demo's hex view is those numbers written in
hexadecimal.

## A File is a Blob

```js
file instanceof Blob   // true
file instanceof File   // true
```

`File` **extends** `Blob`. That's JavaScript's class inheritance, from the
language layer. A File is a Blob with two more properties: `name` and
`lastModified`. Everything that accepts a Blob accepts a File, and
everything a Blob can do, a File can do.

The demo shows the **prototype chain**, the list of classes an object
inherits from: `File → Blob → Object`. JavaScript looks up a property on
the object, then on `File.prototype`, then on `Blob.prototype`, and so
on. That's how `file.text()` works even though `text()` is defined on
Blob, not File.

### Where Files come from

- **`<input type="file">`**: `input.files` is a list of the chosen files.
  Add `multiple` to allow several, and `accept="image/*"` to suggest a
  type.
- **Drag and drop**: `event.dataTransfer.files` in a `drop` handler. The
  `dragover` handler must call `event.preventDefault()`, or the browser
  won't allow a drop there. The `drop` handler must call it too, or the
  browser opens the file itself.

A page can never read a file the user didn't hand to it. There's no way
to open `~/Documents/anything` from page code. (Chromium browsers have an
extra API, `showOpenFilePicker`, that still requires the user to choose.)

### `file.type` is a guess from the name

The browser sets `file.type` from the file's **extension**, and never
looks inside. Rename `photo.png` to `photo.txt` and `file.type` becomes
`text/plain`, though not a byte has changed. The demo's first section
checks this.

Many formats start with fixed **magic bytes** that identify them:

| Starts with | Is |
| --- | --- |
| `89 50 4E 47` (`.PNG`) | PNG image |
| `FF D8 FF` | JPEG image |
| `47 49 46 38` (`GIF8`) | GIF image |
| `25 50 44 46` (`%PDF`) | PDF |
| `50 4B 03 04` (`PK`) | zip, and formats built on zip (`.docx`, `.xlsx`, `.epub`) |

Text files have no magic bytes; they're just characters. The practical
rule: **never trust `file.type`** (or a name, or `content-type`) for
anything that matters. A server receiving uploads should check the bytes.

## Blob URLs

```js
const url = URL.createObjectURL(file);
// "blob:https://backspaces.github.io/c5ee78e6-d4fc-4b61-af12-0199700a9a9f"
img.src = url;
```

`URL.createObjectURL` gives a Blob a URL, so anything that takes a URL
can use it:
- `<img>`, `<video>` and `<audio>` sources;
- links and `<iframe>`s;
- `fetch(url)`.

- **The URL is a reference, not the data.** It's the page's origin plus
  a random id, and the browser keeps a table from ids to Blobs. The bytes
  aren't copied into the URL or sent anywhere.
- **It lasts as long as the page that made it.** Reload or close the page
  and the URL points to nothing.
- **It holds the Blob in memory until then.** `URL.revokeObjectURL(url)`
  releases it early. The demo revokes each old URL when it makes a new
  one; a page that makes many should do the same.

**Compare `data:` URLs**, which contain the bytes themselves:
`data:text/plain;base64,aGVsbG8=`. They work anywhere and last forever,
but they're about a third bigger than the data (base64 turns every 3
bytes into 4 characters). They also have to be built as one long string.
Use `blob:` URLs for anything big, and `data:` for small things that must
travel, like an icon inlined in a CSS file.

## Making Blobs and downloading them

```js
const blob = new Blob([text], { type: "text/csv" });
const a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = "groceries.csv";   // save as this name, instead of opening it
a.click();
```

- The first argument to `new Blob` is an **array of parts**: strings
  (stored as UTF-8), byte arrays, or other Blobs, joined in order.
- The **`download` attribute** on a link tells the browser to save the
  target as a file with that name, instead of showing it. Calling
  `a.click()` from code triggers it without the link ever being on the
  page. That's how "Export" buttons in web apps work: no server needed.

## Blobs from elsewhere

- **A canvas:** `canvas.toBlob(callback, "image/png")` encodes what's
  drawn as a PNG (or `"image/jpeg"`, `"image/webp"`). The demo draws some
  circles, and the Blob's first bytes are the PNG magic number.
- **`fetch`:** `await res.blob()` reads a reply as a Blob. Its `type`
  comes from the reply's `content-type` header. See [fetch](../fetch/).
- **Sending:** a Blob or File can be a `fetch` body directly:
  `fetch(url, { method: "POST", body: file })`. For a form-style upload,
  with the file's name included, put it in a `FormData`:

  ```js
  const form = new FormData();
  form.append("photo", file);
  await fetch("/upload", { method: "POST", body: form });
  ```

## Not val.town's blob store

The [ValTown](https://github.com/backspaces/ValTown) repo's Notes val uses
val.town's **blob storage**. That's a different thing with a similar
name:
- **val.town's blob store** is on the server. It keeps data under names
  (keys) that last until deleted. Notes saves each note with
  `blob.setJSON(key, value)` and reads it back with `blob.getJSON(key)`.
- **A browser `Blob`** is a value in one page's memory. It has no name
  and disappears with the page.

Both use "blob" in its general sense: bytes whose meaning the system
doesn't care about.

## The demo's code

- **Section 1:**
  - `inspect(file)` reads only the first 64 bytes:
    `file.slice(0, 64).arrayBuffer()`. The page can inspect a
    multi-gigabyte file instantly, because the rest is never read.
  - `sniff()` compares those bytes with the magic numbers above.
  - `chain()` walks `Object.getPrototypeOf` to print the class chain.
- **Section 2:** `preview()` chooses how to show the file:
  - by the sniffed type when there is one, otherwise by `file.type`, so a
    renamed PNG still previews as an image;
  - images, video, audio and PDFs get the `blob:` URL;
  - text is read with `file.text()` and shown with `textContent`;
  - an unknown file is treated as text only if its first bytes contain no
    zeros, which text never has.
- **Section 3** rebuilds the Blob on every keystroke and revokes the
  previous URL, so the links always hold the current text.
- **Sections 3 and 4** show their code with the real values filled in.
