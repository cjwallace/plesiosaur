/**
 * Message handlers for all supported message types.
 */

import { JsonValue } from "@std/json/types";
import { match } from "ts-pattern";

import Node from "./node.ts";
import {
  EchoRequest,
  EchoResponse,
  ErrorResponse,
  InitRequest,
  InitResponse,
  Message,
  messageSchema,
  Response,
} from "./messages.ts";

function withReplyTo<T extends Response["body"]>(message: Message, body: T): T {
  if (message.body.msg_id) {
    return { ...body, in_reply_to: message.body.msg_id };
  }
  return { ...body };
}

function createResponse<T extends Response>(
  node: Node,
  message: Message,
  body: T["body"],
): T {
  return {
    src: node.nodeId,
    dest: message.src,
    body,
  } as T;
}

function handleInit(node: Node, request: InitRequest): InitResponse {
  node.init(request.body.node_id, request.body.node_ids);

  const body: InitResponse["body"] = {
    type: "init_ok",
    msg_id: node.msgId,
  };

  return createResponse(node, request, withReplyTo(request, body));
}

function handleEcho(node: Node, request: EchoRequest): EchoResponse {
  const body: EchoResponse["body"] = {
    type: "echo_ok" as const,
    msg_id: node.msgId,
    echo: request.body.echo,
  };

  return createResponse(node, request, withReplyTo(request, body));
}

function handleError(node: Node, request: Message): ErrorResponse {
  const body: ErrorResponse["body"] = {
    type: "error",
    code: 10,
    text: "Unsupported request message",
    msg_id: node.msgId,
  };

  return createResponse(node, request, withReplyTo(request, body));
}

export function handleRequest(node: Node, request: JsonValue) {
  const message = messageSchema.parse(request);
  const response = match(message)
    .returnType<Response>()
    .with({ body: { type: "init" } }, (msg) => {
      return handleInit(node, msg);
    })
    .with({ body: { type: "echo" } }, (msg) => {
      return handleEcho(node, msg);
    })
    .otherwise((msg) => {
      return handleError(node, msg);
    });
  node.incrementMsgId();
  return response;
}
