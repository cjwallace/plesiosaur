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

function* handleInit(
  node: Node,
  request: InitRequest,
): Generator<InitResponse> {
  node.init(request.body.node_id, request.body.node_ids);

  const body: InitResponse["body"] = {
    type: "init_ok",
    msg_id: node.msgId,
  };

  yield createResponse(node, request, withReplyTo(request, body));
}

function* handleEcho(
  node: Node,
  request: EchoRequest,
): Generator<EchoResponse> {
  const body: EchoResponse["body"] = {
    type: "echo_ok" as const,
    msg_id: node.msgId,
    echo: request.body.echo,
  };

  yield createResponse(node, request, withReplyTo(request, body));
}

function* handleGenerate(
  node: Node,
  request: GenerateRequest,
): Generator<GenerateResponse> {
  const body: GenerateResponse["body"] = {
    type: "generate_ok" as const,
    msg_id: node.msgId,
    id: `${node.nodeId}-${node.msgId}`,
  };

  yield createResponse(node, request, withReplyTo(request, body));
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

function* broadcastMessage(node: Node, message: number) {
  const neighbours = node.topology[node.nodeId];
  for (const neighbor of neighbours) {
    const request = makeBroadcastMessage(node, neighbor, message);
    node.incrementMsgId();
    yield request;
  }
}

function* handleBroadcast(
  node: Node,
  request: BroadcastRequest,
): Generator<BroadcastRequest | BroadcastResponse> {
  const message = request.body.message;

  if (!node.messages.includes(message)) {
    node.messages.push(message);
    yield* broadcastMessage(node, request.body.message);
  }

  const body: BroadcastResponse["body"] = {
    type: "broadcast_ok" as const,
    msg_id: node.msgId,
  };

  yield createResponse<BroadcastResponse>(
    node,
    request,
    withReplyTo(request, body),
  );
}

function* handleRead(
  node: Node,
  request: ReadRequest,
): Generator<ReadResponse> {
  const body: ReadResponse["body"] = {
    type: "read_ok" as const,
    messages: node.messages,
  };

  yield createResponse(node, request, withReplyTo(request, body));
}

function* handleTopology(
  node: Node,
  request: TopologyRequest,
): Generator<TopologyResponse> {
  node.topology = request.body.topology;
  const body: TopologyResponse["body"] = {
    type: "topology_ok" as const,
  };

  yield createResponse(node, request, withReplyTo(request, body));
}

function* handleError(
  node: Node,
  request: Message,
): Generator<ErrorResponse> {
  const body: ErrorResponse["body"] = {
    type: "error",
    code: 10,
    text: "Unsupported request message",
    msg_id: node.msgId,
  };

  yield createResponse(node, request, withReplyTo(request, body));
}

export function* handleRequest(
  node: Node,
  request: JsonValue,
): Generator<JsonValue> {
  const message = messageSchema.parse(request);

  // Catch any messages that require no response
  if (message.body.type === "broadcast_ok") {
    return;
  }

  const response = match(message)
    .returnType<Generator<Message | Response>>()
    .with({ body: { type: "init" } }, (msg) => handleInit(node, msg))
    .with({ body: { type: "echo" } }, (msg) => handleEcho(node, msg))
    .with({ body: { type: "generate" } }, (msg) => handleGenerate(node, msg))
    .with({ body: { type: "broadcast" } }, (msg) => handleBroadcast(node, msg))
    .with({ body: { type: "read" } }, (msg) => handleRead(node, msg))
    .with({ body: { type: "topology" } }, (msg) => handleTopology(node, msg))
    .otherwise((msg) => handleError(node, msg));
  node.incrementMsgId();
  yield* response;
}
