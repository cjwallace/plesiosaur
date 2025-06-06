/**
 * Message handlers for all supported message types.
 */

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
  ReadRequest,
  ReadResponse,
  RequestMessage,
  ResponseMessage,
  TopologyRequest,
  TopologyResponse,
} from "./messages.ts";

function withReplyTo<T extends ResponseMessage["body"]>(
  message: RequestMessage,
  body: T,
): T {
  if (message.body.msg_id) {
    return { ...body, in_reply_to: message.body.msg_id };
  }
  return { ...body };
}

function createResponse<T extends ResponseMessage>(
  node: Node,
  message: RequestMessage,
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

function* broadcastMessage(node: Node, request: BroadcastRequest) {
  const neighbours = node.topology[node.nodeId].filter((neighbor) => neighbor !== request.src);
  for (const neighbor of neighbours) {
    const newRequest = makeBroadcastMessage(node, neighbor, request.body.message);
    node.incrementMsgId();
    yield newRequest;
  }
}

function* handleBroadcast(
  node: Node,
  request: BroadcastRequest,
): Generator<BroadcastRequest | BroadcastResponse> {
  const message = request.body.message;

  if (!node.messages.includes(message)) {
    node.messages.push(message);
    yield* broadcastMessage(node, request);
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
    msg_id: node.msgId,
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
    msg_id: node.msgId,
  };

  yield createResponse(node, request, withReplyTo(request, body));
}

function* handleError(
  node: Node,
  message: RequestMessage,
): Generator<ErrorResponse> {
  const body: ErrorResponse["body"] = {
    type: "error",
    code: 10,
    text: "Unsupported request message",
    msg_id: node.msgId,
  };

  yield createResponse(node, message, withReplyTo(message, body));
}

export function* handleRequestMessage(
  node: Node,
  message: RequestMessage,
): Generator<Message> {
  const response = match(message)
    .returnType<Generator<RequestMessage | ResponseMessage>>()
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
