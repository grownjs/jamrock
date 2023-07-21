---
$render: ../layout.pug
includes: !include "how-to/**/*.{js,txt,html}"
---

## It works.

```html
//@ test.html
<div>
  Some text here:
  ---<h1>OSOM</h1>---
  +++<h1>It works.</h1>+++
</div>
```

<details>
  <summary>
  Click
  </summary>
  <button onclick="toggle()">OSOM</button>
</details>


## TODO

- try same theme as grown (old jamrock?)
- avoid mini-browser... instead, embed previews within the content...
  basically lazy mini-browsers on the page, that may be activated
  when they're within the viewport!
- try the editor as toggle, fixed on the bottom; that might help to edit
  a file of interest without having to scroll down..
- also, we might improve the front-end side with a client route-like behavior,
  where json is delivered statically... and we can manage the swapping by hand
  ^ actually, we **can** do that rn... just scrape the resuling markup, extract
    and replace... json details MUST be in a separate tag to properly match and read!


```diff
foo
bar
+baz
-buzz
```
