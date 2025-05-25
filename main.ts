/**
 * Entry point and IO for a single synchronous maelstrom node.
 */

import { TextLineStream } from "jsr:@std/streams";
import { JsonParseStream } from "jsr:@std/json";

import Node from "./node.ts";
import { handleMessage } from "./handlers.ts";
import { Message, messageSchema } from "./messages.ts";

async function readLines(handler: (message: Message) => Generator<Message>) {
  const readable = Deno.stdin.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())
    .pipeThrough(new JsonParseStream());

  for await (const data of readable) {
    try {
      const message = messageSchema.parse(data);
      const messages = handler(message);
      for (const message of messages) {
        console.log(JSON.stringify(message));
      }
    } catch (error) {
      console.error(error);
    }
  }
}

if (import.meta.main) {
  const node = new Node();
  readLines((message) => handleMessage(node, message));
}
