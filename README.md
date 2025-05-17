# plesiosaur

A nascent maelstrom node in typescript on the deno runtime.

Messages handled:
- init
- echo

Any other message type currently gets a `{code: 10, text: "Unsupported request message" }` response.

To test, use deno compile to build a binary, and run the maelstrom echo test with it:

```bash
deno compile --allow-read --allow-write main.ts -o plesiosaur
maelstrom test -w echo --bin ./plesiosaur --time-limit 5
```

Structure:

```bash
main.ts     # entry point, io
messages.ts # request and response message types
handlers.ts # message handlers
node.ts     # node state definition
```
