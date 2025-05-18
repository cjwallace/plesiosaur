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

function makeBroadcastMessage(
  node: Node,
  dest: string,
  message: number,
): BroadcastRequest {
  const body = {
    type: "broadcast" as const,
    msg_id: node.msgId,
    message,
  };
  return { src: node.nodeId, dest: dest, body };
}

function broadcastMessage(node: Node, message: number) {
  const neighbours = node.topology[node.nodeId];
  for (const neighbor of neighbours) {
    const request = makeBroadcastMessage(node, neighbor, message);
    console.log(JSON.stringify(request));
    node.incrementMsgId();
  }
}

function handleBroadcast(
  node: Node,
  request: BroadcastRequest,
): BroadcastResponse {
  const message = request.body.message;

  if (!node.messages.includes(message)) {
    node.messages.push(message);
    broadcastMessage(node, request.body.message);
  }

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
  node.topology = request.body.topology;
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

  // Catch any messages that require no response
  if (message.body.type === "broadcast_ok") {
    return null;
  }

  const response = match(message)
    .returnType<Response>()
    .with({ body: { type: "init" } }, (msg) => handleInit(node, msg))
    .with({ body: { type: "echo" } }, (msg) => handleEcho(node, msg))
    .with({ body: { type: "generate" } }, (msg) => handleGenerate(node, msg))
    .with({ body: { type: "broadcast" } }, (msg) => handleBroadcast(node, msg))
    .with({ body: { type: "read" } }, (msg) => handleRead(node, msg))
    .with({ body: { type: "topology" } }, (msg) => handleTopology(node, msg))
    .otherwise((msg) => handleError(node, msg));
  node.incrementMsgId();
  return response;
}
