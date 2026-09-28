# DOM

Layer: **browser only**. The DOM doesn't exist in Deno or Node; there's
no `document` there.

[Try it](https://backspaces.github.io/Browser/DOM/). The page has two
parts:

1. **HTML in, DOM out:** type HTML and see the tree of objects the parser
   builds from it.
2. **Building the DOM from JavaScript:** build the same kind of tree with
   no HTML at all, by calling DOM functions, and see every line of
   JavaScript that ran.

The two sections are separate. Section 1 only shows what's parsed from
its text box. Section 2 starts from an empty `<div id="stage">` and builds
inside it.

## HTML is text; the DOM is objects

The browser reads a page's HTML text **once**. Its parser turns the text
into a tree of objects in memory, the **Document Object Model**. From
then on:

- the browser draws the page from the objects, not the text;
- JavaScript changes the page by changing the objects;
- the HTML text is no longer used.

The objects are linked to each other. Each one knows its parent and its
children:

```
ul element
  ├─ parentNode → the div it sits in
  ├─ childNodes → [ li element ]
  └─ attributes → { id: "list" }
li element
  ├─ parentNode → the ul
  └─ childNodes → [ text node ]
text node
  ├─ parentNode → the li
  └─ data → "first item"
```

That web of linked objects is the DOM. The name also covers the API for
working with them: `getElementById`, `append`, `childNodes`,
`textContent`, and so on.

**There are no closing tags in the DOM.** In HTML, `</li>` tells the
parser where an element ends. Once the tree is built, nesting is recorded
by the links instead, so there's nothing left for a closing tag to do. Any
drawing of the DOM has to choose a way to show nesting:

- the demo's tree panels use **indentation**: whatever is indented under a
  line is inside it;
- DevTools' Elements panel writes it back out **as HTML**, adding closing
  tags so it looks familiar.

Neither of these is the DOM itself. Both are pictures of the objects.

### The parser makes decisions

The demo's first section proves the text doesn't survive. Its **Back to
HTML** box writes the tree out again with `outerHTML`, and the result
isn't what was typed:

- **Unclosed tags.** `<p>One<p>Two` has no `</p>`, but the DOM has two
  separate `p` elements: a new `<p>` ends the previous one. `outerHTML`
  then shows `</p>` tags that were never typed. The same goes for `<li>`.
- **Missing structure.** Type just `hello`, or empty the box completely,
  and you still get `html`, `head` and `body` elements. The parser adds
  them to every document.
  A table's rows always end up inside a `<tbody>`, even if the HTML has
  none.
- **Misnested tags.** `<b>bold <i>both</b> italic?</i>` overlaps, which
  a tree can't represent. The parser closes the `<i>` at `</b>` and opens
  a second `<i>` for "italic?". The fixed-up rules are part of the HTML
  standard, so every browser builds the same tree.

The DOM records the parser's *result*. The original tags, closed or not,
are gone.

## Nodes

Everything in the tree is a node. Three kinds show up in the demo:

- **Element nodes**, one per tag: `<ul>`, `<li>`, `<b>`. They have a tag
  name, attributes and children.
- **Text nodes**, holding the actual characters. An element never holds
  text directly; it holds text nodes. The tree panels show them as
  `text "…"`: the word `text` is a label, and the quoted part is the
  characters.
- **Comment nodes**, from `<!-- … -->`. They're in the tree, but nothing
  is drawn for them.

Tick **show whitespace text nodes** and a surprise appears. The line
breaks and indentation between tags in the HTML are text nodes too. Type
this into section 1:

```html
<ul>
  <li>first item</li>
</ul>
```

and the `ul` turns out to have three children, not one:

```
<ul>
  text "\n  "
  <li>
    text "first item"
  text "\n"
```

Those whitespace nodes are why `element.childNodes` often has more
entries than you expect. `element.children` lists only the element
children, skipping text.

Section 2's list has none, even with the box ticked. JavaScript builds
exactly the nodes it's told to, and it never adds whitespace.

## Seeing the DOM yourself

**DevTools' Elements panel** (⌥⌘I, or right-click something and choose
**Inspect**) shows the live DOM, not the HTML file. It looks like HTML
because DevTools draws the objects that way, but there are clues that
it's something else:

- Text nodes appear in quotes, like `" show whitespace text nodes"`. An
  HTML file doesn't put quotes around text.
- The ▶ triangles fold and unfold nodes of the tree.
- `flex` and `grid` badges show layout the browser worked out from the
  CSS, which isn't in the HTML.
- **View Source** (⌥⌘U) shows the original text, which never changes. Add
  items in the demo: they appear in Elements but not in View Source.

**Edit the objects directly.** Double-click the heading's text in
Elements, change it, and press Enter. The page changes, but the file in
your editor doesn't. A reload rebuilds the objects from the file and
your edit is gone.

**Use the Console** (the tab next to Elements):

```js
$0                              // the element selected in Elements
console.dir($0)                 // it as an object: expand to see its properties
$0.childNodes                   // its children, whitespace text nodes included
$0.children                     // element children only
$0.firstElementChild.parentNode === $0   // true: the links go both ways
$0.outerHTML                    // written back out as HTML text
```

- `$0` is whichever row is selected in Elements, marked `== $0` there. It
  moves when you select another row. `$1` is the previous selection.
- `console.dir` needs something to show. Plain `console.dir` without
  `(…)` shows the function itself: `ƒ dir() { [native code] }`, meaning
  "a function built into the browser".
- `console.dir($0)` shows hundreds of properties and no closing tag
  anywhere.

**If DevTools misbehaves**, for example an empty Elements panel or
Inspect doing nothing, try an Incognito window (⇧⌘N). Extensions are off
there, and one of them is often the cause.

## Building with JavaScript

Section 2 builds its list with a handful of functions, and shows each
line as it runs. Creating the list and its first item:

```js
const list = document.createElement("ul");      // a new <ul> object, not on the page yet
list.id = "list";                                // set its id attribute
document.getElementById("stage").append(list);   // attach it: now it's on the page

const li = document.createElement("li");
li.textContent = "first item";                   // give it a text node
document.getElementById("list").append(li);     // find the list by id, attach the li
```

That builds the same objects the parser would build from
`<ul id="list"><li>first item</li></ul>`, without any HTML.

- **`document.createElement(tag)`** makes a new element. It exists, but
  it isn't in the tree, so nothing is drawn yet.
- **`parent.append(child)`** attaches it as the parent's last child. Now
  it's in the tree, and the browser draws it.
- **`document.getElementById(id)`** finds an element that's already in
  the tree. `document.querySelector(".some-class")` does the same with
  any CSS selector, when there's no id to go by.
- **`el.replaceChildren()`**, with nothing in the brackets, removes all of
  an element's children and keeps the element: **Clear the items** leaves
  an empty `ul`.
- **`el.remove()`** takes the element itself out of the tree:
  **Remove the list** leaves the stage empty again.

HTML attributes show up as JavaScript properties on the element:
`id="list"` is `el.id`, `hidden` is `el.hidden` (true or false), and
`class="me"` is `el.className`. The class property has a different name
because `class` is a reserved word in JavaScript.

These few functions are enough for a lot. [DOM API](../DOM-API/) covers
the rest of the everyday toolkit: finding and walking, moving and copying
nodes, attributes, classes, styles and clicks.

## `textContent` vs `innerHTML`

Both put text into an element, but they're not the same:

- `el.textContent = s` makes **one text node** holding `s` exactly as it
  is. Any `<` or `>` is just a character.
- `el.innerHTML = s` **runs the HTML parser on `s`** and builds whatever
  elements it describes, just as section 1 does with a whole document.

With `<b>bold</b> and plain` in section 2's text box, the two **Add**
buttons give:

```
<li>
  text "<b>bold</b> and plain"   ← textContent: the tags are shown as text
<li>
  <b>                            ← innerHTML: a real <b> element
    text "bold"
  text " and plain"
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
- `lines(node, depth, spaces)` draws both tree panels. It walks the tree
  recursively, and for each node returns an array of text lines: its own
  line, then its children's lines indented one level deeper.
  - `node.nodeType` tells text, comment and element nodes apart.
  - `[...node.attributes]` copies the element's attribute list into a real
    array. The DOM's lists only look like arrays; they lack methods like
    `map`.
  - `flatMap` maps each child to its array of lines and joins those arrays
    into one.
  - An element with no child nodes at all gets a `(no children)` line, so
    an empty element doesn't look like a mistake. "Void" elements such as
    `<img>` and `<input>` are skipped, since they can never have
    children.
- **Section 1**, `parse()`:
  - `new DOMParser().parseFromString(html, "text/html")` builds a
    separate document from the typed text. It never runs scripts or
    event handlers, so any HTML typed there is safe.
  - The tree is drawn from that document's `documentElement` (the
    `<html>` element), and **Back to HTML** is its `outerHTML`.
  - The drawing is a sandboxed `<iframe>` given the text as `srcdoc`. The
    browser draws it but blocks its scripts; the Console says so if you
    type one.
- **Section 2**:
  - Each button's code is kept as text in `snippets`, and `run()`
    executes that text with `new Function(code)()`, which turns a string
    of JavaScript into a function and calls it. The log shows the same
    text, so it can't drift from what really ran.
  - Each snippet runs as its own function. That's why each one finds
    the list again with `getElementById`, and why each can declare its
    own `const li`.
  - The typed value is put into the code with `JSON.stringify`, which
    turns any text into a correctly quoted JavaScript string.
  - `drawTree()` draws from the stage, and enables only the buttons that
    make sense: nothing can be added before the list exists.
  - `$("create").onclick = () => run(…)` sets a click handler. Events get
    their own topic later.
- Both tree panels show their text with `textContent`, so the printout
  itself can't run anything either.
