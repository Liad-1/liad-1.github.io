# binarytree (browser build)

Copy of https://github.com/Liad-1/binarytree (`com/java/`) at commit
`2a95ef046f59061b0f2a76d459e55706bc795c7b`, compiled to JavaScript with
[TeaVM](https://teavm.org) for the website's "Launch" button.

Changes from the original:

1. `Terminal.java` added: the browser has no console, so `init()` sends
   `System.out` / `System.err` to the page's terminal panel, and `readLine()`
   is a TeaVM `@Async` method that suspends the program until the user presses
   Enter. The page supplies `window.btTerm = { write, readLine }`.
2. `Main.java`: `Terminal.init()` is called first in `main`, and each
   `System.console().readLine()` is replaced with `Terminal.readLine()`.
   (`System.console()` is `null` outside a real terminal anyway.)

The tree logic in `BinaryTree.java` is unchanged.

Rebuild with `npm run build:java` (needs a JDK 11+; the TeaVM jars are
downloaded into `.cache/teavm/` on first run). Output goes to
`public/demos/binarytree/`.
