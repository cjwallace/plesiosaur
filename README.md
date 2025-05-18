# plesiosaur

🌊 + 🦕

A nascent maelstrom node in typescript on the deno runtime.

Messages handled:
- init
- echo
- generate
- broadcast (not fault tolerant)
- read
- topology

Any other message type currently gets a `{code: 10, text: "Unsupported request message" }` response.

To test, use deno compile to build a binary, and run the maelstrom echo test with it (assuming maelstrom is on the PATH):

```bash
deno compile --allow-read --allow-write main.ts -o plesiosaur
maelstrom test -w echo --bin ./plesiosaur --time-limit 5
```

There is a `justfile` that can be used to build the binary and run maelstrom tests, which assumes maelstrom has been untarred into a `maelstrom` subdirectory.

Structure:

```bash
main.ts     # entry point, io
messages.ts # request and response message types
handlers.ts # message handlers
node.ts     # node state definition
```
