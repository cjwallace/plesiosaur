/**
 * Message handlers for all supported message types.
 */

import { JsonValue } from "@std/json/types";
import { match } from "ts-pattern";

import Node from "./node.ts";
import {
  BroadcastRequest,
  BroadcastResponse,
  EchoRequest,
  EchoResponse,
  ErrorResponse,
  GenerateRequest,
  GenerateResponse,
  InitRequest,
  InitResponse,
  Message,
  messageSchema,
  ReadRequest,
  ReadResponse,
  Response,
  TopologyRequest,
  TopologyResponse,
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

function handleGenerate(
  node: Node,
  request: GenerateRequest,
): GenerateResponse {
  const body: GenerateResponse["body"] = {
    type: "generate_ok" as const,
    msg_id: node.msgId,
    id: `${node.nodeId}-${node.msgId}`,
  };

  return createResponse(node, request, withReplyTo(request, body));
}

function handleBroadcast(
  node: Node,
  request: BroadcastRequest,
): BroadcastResponse {
  node.messages.push(request.body.message);

  const body: BroadcastResponse["body"] = {
    type: "broadcast_ok" as const,
    msg_id: node.msgId,
  };

  return createResponse(node, request, withReplyTo(request, body));
}

function handleRead(node: Node, request: ReadRequest): ReadResponse {
  const body: ReadResponse["body"] = {
    type: "read_ok" as const,
    messages: node.messages,
  };

  return createResponse(node, request, withReplyTo(request, body));
}

function handleTopology(
  node: Node,
  request: TopologyRequest,
): TopologyResponse {
  const body: TopologyResponse["body"] = {
    type: "topology_ok" as const,
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
    .with({ body: { type: "generate" } }, (msg) => {
      return handleGenerate(node, msg);
    })
    .with({ body: { type: "broadcast" } }, (msg) => {
      return handleBroadcast(node, msg);
    })
    .with({ body: { type: "read" } }, (msg) => {
      return handleRead(node, msg);
    })
    .with({ body: { type: "topology" } }, (msg) => {
      return handleTopology(node, msg);
    })
    .otherwise((msg) => {
      return handleError(node, msg);
    });
  node.incrementMsgId();
  return response;
}
