/**
 * Entry point and IO for a single synchronous maelstrom node.
 */

import { TextLineStream } from "jsr:@std/streams";
import { JsonParseStream } from "jsr:@std/json";

import Node from "./node.ts";
import { handleRequestMessage } from "./handlers.ts";
import {
  isRequestMessage,
  isResponseMessage,
  Message,
  messageSchema,
  ResponseMessage,
} from "./messages.ts";

const RPC_TIMEOUT = 1000;

// Store map of {msg_id: {resolve, reject}} for requests awaiting response
const awaitingResponse = new Map<
  number,
  { resolve: (response: ResponseMessage) => void; reject: (error: Error) => void }
>();

// Fire and forget
function send(message: Message) {
  console.log(JSON.stringify(message));
}

// Send, awaiting response
function request(message: Message): Promise<ResponseMessage> {
  const msgId = message.body.msg_id;
  if (!msgId) {
    throw new Error("Message ID is missing");
  }
  const promise = new Promise<ResponseMessage>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject({
        type: "error",
        code: 0,
        text: `No response received for msg_id: ${msgId}`,
      });
    }, RPC_TIMEOUT);
    awaitingResponse.set(msgId, {
      resolve: (response: ResponseMessage) => {
        clearTimeout(timeoutId);
        resolve(response);
      },
      reject,
    });
  });
  send(message);
  return promise.catch(() => request(message));
}

function handleResponseMessage(message: ResponseMessage) {
  const inReplyTo = message.body.in_reply_to;
  if (inReplyTo) {
    const { resolve } = awaitingResponse.get(inReplyTo) || {};
    if (resolve) {
      resolve(message);
      awaitingResponse.delete(inReplyTo);
    }
  }
}

function handleMessage(node: Node, message: Message) {
  if (isResponseMessage(message)) {
    handleResponseMessage(message);
  }

  if (isRequestMessage(message)) {
    const messages = handleRequestMessage(node, message);
    for (const message of messages) {
      if (isRequestMessage(message)) {
        request(message);
      } else {
        send(message);
      }
    }
  }
}

if (import.meta.main) {
  const node = new Node();

  const readable = Deno.stdin.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())
    .pipeThrough(new JsonParseStream());

  for await (const data of readable) {
    try {
      const message = messageSchema.parse(data);
      handleMessage(node, message);
    } catch (error) {
      console.error(error);
    }
  }
}
