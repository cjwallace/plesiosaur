/**
 * Entry point and IO for a single synchronous maelstrom node.
 */

import { TextLineStream } from "jsr:@std/streams";
import { JsonParseStream, JsonValue } from "jsr:@std/json";

import Node from "./node.ts";
import { handleRequest } from "./handlers.ts";

async function readLines(handler: (line: JsonValue) => Generator<JsonValue>) {
  const readable = Deno.stdin.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())
    .pipeThrough(new JsonParseStream());

  for await (const data of readable) {
    const messages = handler(data);
    for (const message of messages) {
      console.log(JSON.stringify(message));
    }
  }
}

if (import.meta.main) {
  const node = new Node();
  readLines((line) => handleRequest(node, line));
}
