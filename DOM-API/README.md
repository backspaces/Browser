# DOM API, 80/20

Layer: **browser only**, like the [DOM](../DOM/) itself.

The DOM has hundreds of functions and properties. About twenty of them
do most everyday work. This topic covers those twenty and skips the rest.

[Try it](https://backspaces.github.io/Browser/DOM-API/). Thirteen steps,
each a few lines of real code that runs against a small page. The page
shows:
- the result on the page;
- the tree before and after, with removed lines in red and new lines in
  green;
- anything the code passes to `show(…)`.

You can edit any step and run your own code.

The page the steps work on starts as this HTML:

```html
<section id="app">
  <h2>Groceries</h2>
  <ul id="todo">
    <li class="done">milk</li>
    <li>bread</li>
    <li>eggs</li>
  </ul>
  <p id="note">Three things to buy.</p>
</section>
```

## Find elements

```js
document.getElementById("todo")          // the element with that id
document.querySelector("#todo li")       // the first match for a CSS selector
document.querySelectorAll("#todo li")    // every match
el.closest("section")                    // el or its nearest ancestor that matches
```

- `querySelector` takes **any CSS selector**: `.done`, `li:nth-child(2)`,
  `#app > p`. The same selectors a stylesheet uses.
- **It returns `null` when nothing matches.** Using the result anyway,
  e.g. `document.querySelector("#nope").textContent`, throws
  `TypeError: Cannot read properties of null`. It's one of the most
  common DOM errors. Try it in the demo.
- You can search inside an element as well as the whole document:
  `list.querySelector("li")` only looks inside `list`.

## Move around the tree

```js
el.parentElement
el.children                  // element children
el.firstElementChild    el.lastElementChild
el.nextElementSibling   el.previousElementSibling
```

Each of these has an older twin without `Element` in the name:
`childNodes`, `firstChild`, `nextSibling`. The twins include text nodes,
including the whitespace between tags (see [DOM](../DOM/README.md#nodes)).
Use the `Element` versions unless you really want the text nodes.

## Create elements

```js
const li = document.createElement("li");   // new, empty, not in the tree
const copy = li.cloneNode(true);            // a copy, with everything inside it
```

A new element exists but isn't drawn until it's attached. The copy from
`cloneNode(true)` includes its children and attributes. It doesn't
include listeners added with `addEventListener`.

## Attach, move and remove

```js
parent.append(a, b)        // as the last children
parent.prepend(a)          // as the first child
el.before(a)   el.after(a) // as siblings, next to el
el.replaceWith(a)          // in el's place
el.remove()                // out of the tree
parent.replaceChildren()   // remove all children (or replace them with the arguments)
```

- **All of them accept strings too**, which become text nodes:
  `p.append("for ", "Saturday")` adds two text nodes. That's handy for
  mixing text and elements: `p.append("Total: ", bold, ".")`.
- **A node can only be in one place.** Appending a node that's already in
  the tree **moves** it (step 5 in the demo). To have it in two places,
  `cloneNode(true)` it first (step 6).
- Older code uses `appendChild`, `insertBefore` and `removeChild`, which
  do the same jobs one node at a time. You'll still see them; there's no
  need to write them.

## Change what's inside

```js
el.textContent              // all the text inside, as one string
el.textContent = "new"      // replace all the children with one text node
el.innerHTML = "<b>x</b>"   // replace all the children by parsing HTML
```

`textContent` is safe for anything. `innerHTML` runs the HTML parser, so
text from users can become elements with code in them. Use it only for
HTML you wrote yourself. The [DOM](../DOM/) topic demonstrates why.

## Attributes, classes and style

**Most attributes are also properties:**

```js
el.id = "main"       el.title = "hint"       el.hidden = true
input.value          a.href                   img.src
```

`setAttribute(name, value)`, `getAttribute(name)` and
`removeAttribute(name)` work for any attribute, including ones with no
property.

- **The property and the attribute can differ.** For example,
  `input.value` is what's in the box now, while
  `input.getAttribute("value")` is still the starting value written in
  the HTML.
- **Boolean attributes** like `hidden` are on or off. `el.hidden = true`
  adds `hidden=""` (the demo's tree shows it), and `false` removes it.

**Classes** should be changed with `classList`, not by writing the
`class` attribute:

```js
el.classList.add("done")      el.classList.remove("done")
el.classList.toggle("done")   el.classList.contains("done")
```

The CSS decides what a class looks like. Toggling classes is the usual
way JavaScript changes appearance, because it keeps the look in the
stylesheet. Removing the last class leaves an empty `class=""`, which is
harmless.

**`style`** sets individual CSS properties directly:

```js
el.style.backgroundColor = "lightyellow";   // CSS background-color
el.style.padding = "4px";
```

The names are camelCase because `-` can't appear in a JavaScript name.
Values are strings, units included. They're written into the element's
`style` attribute, as the demo's tree shows.

**`dataset`** holds your own data on an element, as `data-*` attributes:

```js
el.dataset.qty = 12;         // data-qty="12"
el.dataset.userId = "ann";   // data-user-id="ann"
el.dataset.qty               // "12": always a string
```

## Loop over matches

```js
for (const li of document.querySelectorAll("#todo li")) {
  li.classList.toggle("done");
}
```

`querySelectorAll` returns a `NodeList`: a snapshot of the matches when it
was called. `children` returns an `HTMLCollection`, which stays **live**:
it updates as children are added and removed. Both work with `for…of`.
For array methods like `map` and `filter`, copy them first:
`[...list.children].map(…)`.

## React to the user

```js
list.addEventListener("click", (event) => {
  const li = event.target.closest("li");
  if (li) li.classList.toggle("done");
});
```

- `addEventListener(type, fn)` calls `fn` whenever that event happens on
  the element or anything inside it.
- `event.target` is the exact element that was clicked.
- The pattern above is called **event delegation**: one listener on the
  parent, with `closest` finding which child was meant. It handles items
  added later too, because the listener is on the list, not on each item.

Events get their own topic later.

## Putting it together

Step 13 builds a small card from nothing:

```js
const card = document.createElement("article");
card.className = "card";
const title = document.createElement("h3");
title.textContent = "Built by JavaScript";
const text = document.createElement("p");
const bold = document.createElement("b");
bold.textContent = "none";
text.append("HTML written for this: ", bold, ".");
card.append(title, text);
document.getElementById("app").append(card);
```

This is the everyday pattern:
1. create the elements;
2. fill them with `textContent`;
3. nest them with `append`;
4. attach the finished piece to the page once.

## Beyond the twenty

These didn't make the list. Each is worth knowing when you need it:

- `insertAdjacentHTML` / `insertAdjacentElement`: insert at a precise
  spot relative to an element.
- `<template>`: a block of inert HTML to clone as a starting point.
- `getComputedStyle(el)`: the final CSS values after all the stylesheets.
- `el.getBoundingClientRect()`: an element's position and size on
  screen.
- `MutationObserver`: be told when part of the DOM changes. The demo
  uses one to redraw "Tree now" after a click handler changes the page.
- `document.createDocumentFragment()`, `TreeWalker`, `Range`, shadow
  DOM.

## In the ValTown repo

The Rooms chat page's
[`show()`](https://github.com/backspaces/ValTown/blob/main/Rooms/http.ts#L142-L151)
follows the same pattern: `createElement`, then `textContent`, then
`append`, for each message.

## The demo's code

- `startHTML` is the page the steps work on. **Reset** and picking a step
  put it back with `innerHTML`. That's safe here because it's HTML the
  page wrote itself.
- `run()` executes the code box with `new Function("show", code)(show)`.
  That turns the text into a function with one parameter, `show`, and
  calls it. Errors are caught and shown in red.
- `describe()` turns values into readable text for `show`: elements as
  their tag, NodeLists as a list, `null` as "nothing found".
- **The trees:**
  - `lines()` draws a tree, as in the DOM topic.
  - `unchanged()` compares the before and after trees line by line and
    finds the longest run of lines they share, a *longest common
    subsequence*. Every other line is marked removed or added.
- **A `MutationObserver`** watches the playground and redraws "Tree now"
  on any change. That's how clicks in step 12 show up in the tree.
