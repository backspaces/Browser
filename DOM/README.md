# DOM

Layer: **browser only**. The DOM doesn't exist in Deno or Node; there's
no `document` there.

[Try it](https://backspaces.github.io/Browser/DOM/): add list items two
ways and watch the tree beside the page change.

## What the DOM is

The browser reads a page's HTML text once and turns it into a tree of
objects, the **Document Object Model**. It draws the page from that tree,
not from the text. From then on, JavaScript changes the page by changing
the tree, and the browser redraws.

That's why **View Source** and DevTools' **Elements** panel disagree after a
script runs. View Source shows the original text the server sent. The
Elements panel shows the live tree. Add a few items in the demo and
compare.

## Nodes

Everything in the tree is a node. Two kinds matter most:

- **Element nodes**, one per tag: `<ul>`, `<li>`, `<b>`. They have a tag
  name, attributes and children.
- **Text nodes**, holding the actual characters. An element never holds
  text directly; it holds text nodes.

The demo's right-hand side prints the tree. The starting list is:

```
<ul id="list">
  <li>
    text "first item"
```

Tick **show whitespace text nodes** and a surprise appears: the line
breaks and indentation between tags in the HTML source are text nodes too.

```
<ul id="list">
  text "\n      "
  <li>
    text "first item"
  text "\n    "
```

They're why `element.childNodes` often has more entries than you expect.
`element.children` lists only the element children, skipping text.

## Finding and building elements

```js
const list = document.getElementById("list"); // find one by its id
const li = document.createElement("li");      // a new, unattached <li>
li.textContent = "hello";                      // give it a text node
list.append(li);                               // attach it: now it's on the page
list.replaceChildren();                        // remove all of list's children
```

A new element isn't on the page until it's attached to the tree.
`document.querySelector(".some-class")` finds elements using any CSS
selector, when there's no id to go by.

HTML attributes show up as JavaScript properties on the element:
`id="ran"` is `el.id`, `hidden` is `el.hidden` (true or false), and
`class="me"` is `el.className`. The class property has a different name
because `class` is a reserved word in JavaScript.

## `textContent` vs `innerHTML`

Both put text into an element, but they're not the same:

- `el.textContent = s` makes **one text node** holding `s` exactly as it
  is. Any `<` or `>` is just a character.
- `el.innerHTML = s` **parses `s` as HTML** and builds whatever elements
  it describes.

Typing `<b>bold</b> text` and using each button gives:

```
<li>
  text "<b>bold</b> text"      ← textContent: the tags are shown as text
<li>
  <b>                          ← innerHTML: a real <b> element
    text "bold"
  text " text"
```

That parsing is the danger. **Load a sneaky one** fills in:

```html
<img src="nope" onerror="document.getElementById('ran').hidden = false">
```

With `innerHTML`, that becomes a real image. It fails to load, and its
`onerror` attribute runs as code: the red warning appears. Here the code
only reveals a message, but it could just as easily read the page or send
data elsewhere. With `textContent`, it's harmless text.

(A `<script>` tag inserted with `innerHTML` does *not* run. That rule
gives a false sense of safety, because event attributes like `onerror`
do.)

**Rule of thumb:** use `textContent` for anything that came from a user
or over the network. Keep `innerHTML` for HTML you wrote yourself.

## In the ValTown repo

The Rooms chat page shows messages from strangers, so its
[`show()`](https://github.com/backspaces/ValTown/blob/main/Rooms/http.ts#L142-L151)
builds every line from `createElement` and `textContent`. Anyone typing
the sneaky text into the chat just sends harmless text.

[Mailbox](https://github.com/backspaces/ValTown/blob/main/Mailbox/http.ts)
solves the same problem the other way. It builds its page as one HTML
string on the server, where there's no DOM, so it passes every piece of
email text through an `escape()` function first. That turns `<` into
`&#60;` and similar, so the browser shows those characters rather than
parsing them. Both approaches work. Building with elements needs no
escaping to remember, but it only exists in the browser.

## The demo's code

- `const $ = (id) => document.getElementById(id);` is a shorthand, since
  the page looks up elements a lot.
- `$("safe").onclick = () => addItem("text");` sets a click handler.
  Events get their own topic later.
- `lines(node, depth)` walks the tree recursively. For each node it
  returns an array of text lines: its own line, then its children's lines
  indented one level deeper.
  - `node.nodeType` tells text nodes from elements.
  - `[...node.attributes]` copies the element's attribute list into a real
    array. The DOM's lists only look like arrays; they lack methods like
    `map`.
  - `flatMap` maps each child to its array of lines and joins those arrays
    into one.
- `drawTree()` shows the result with `textContent`, so the tree printout
  itself can't run anything either.
