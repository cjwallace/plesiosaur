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
  RequestMessage,
  ResponseMessage,
} from "./messages.ts";

const awaitingResponse = new Map<
  number,
  { resolve: (response: ResponseMessage) => void; reject: (error: Error) => void }
>();

// Fire and forget
function send(message: Message) {
  console.log(JSON.stringify(message));
}

// Send awaiting response
function rpc(message: Message): Promise<ResponseMessage> {
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
    }, 1000);
    awaitingResponse.set(msgId, {
      resolve: (response: ResponseMessage) => {
        clearTimeout(timeoutId);
        resolve(response);
      },
      reject,
    });
  });
  send(message);
  return promise.catch(() => rpc(message));
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

async function readLines(
  handleRequest: (message: RequestMessage) => Generator<Message>,
  handleResponse: (message: ResponseMessage) => void,
) {
  const readable = Deno.stdin.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())
    .pipeThrough(new JsonParseStream());

  for await (const data of readable) {
    try {
      const message = messageSchema.parse(data);

      if (isResponseMessage(message)) {
        handleResponse(message);
      }

      if (isRequestMessage(message)) {
        const messages = handleRequest(message);
        for (const message of messages) {
          if (isRequestMessage(message)) {
            rpc(message);
          } else {
            send(message);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
}

if (import.meta.main) {
  const node = new Node();
  readLines(
    (message) => handleRequestMessage(node, message),
    handleResponseMessage,
  );
}
