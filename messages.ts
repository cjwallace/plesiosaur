/**
 * Zod schemas for parsing incoming messages,
 * and typescript types for same, and outgoing messages.
 */

import { z } from "zod";

const initRequest = z.object({
  type: z.literal("init"),
  msg_id: z.optional(z.number()),
  node_id: z.string(),
  node_ids: z.array(z.string()),
});

const initResponse = z.object({
  type: z.literal("init_ok"),
  msg_id: z.number(),
  in_reply_to: z.optional(z.number()),
});

const echoRequest = z.object({
  type: z.literal("echo"),
  msg_id: z.optional(z.number()),
  echo: z.string(),
});

const echoResponse = z.object({
  type: z.literal("echo_ok"),
  echo: z.string(),
  msg_id: z.number(),
  in_reply_to: z.optional(z.number()),
});

const generateRequest = z.object({
  type: z.literal("generate"),
  msg_id: z.optional(z.number()),
});

const generateResponse = z.object({
  type: z.literal("generate_ok"),
  id: z.string(),
  msg_id: z.number(),
  in_reply_to: z.optional(z.number()),
});

const broadcastRequest = z.object({
  type: z.literal("broadcast"),
  msg_id: z.optional(z.number()),
  message: z.number(),
});

const broadcastResponse = z.object({
  type: z.literal("broadcast_ok"),
  msg_id: z.number(),
  in_reply_to: z.optional(z.number()),
});

const readRequest = z.object({
  type: z.literal("read"),
  msg_id: z.optional(z.number()),
});

const readResponse = z.object({
  type: z.literal("read_ok"),
  messages: z.array(z.number()),
  msg_id: z.number(),
  in_reply_to: z.optional(z.number()),
});

const topologyRequest = z.object({
  type: z.literal("topology"),
  msg_id: z.optional(z.number()),
  topology: z.record(z.string(), z.array(z.string())),
});

const topologyResponse = z.object({
  type: z.literal("topology_ok"),
  msg_id: z.number(),
  in_reply_to: z.optional(z.number()),
});

const errorResponse = z.object({
  type: z.literal("error"),
  code: z.number(),
  text: z.string(),
  msg_id: z.number(),
  in_reply_to: z.optional(z.number()),
});

const requestBody = z.discriminatedUnion("type", [
  initRequest,
  echoRequest,
  generateRequest,
  broadcastRequest,
  readRequest,
  topologyRequest,
]);

const responseBody = z.discriminatedUnion("type", [
  initResponse,
  echoResponse,
  generateResponse,
  broadcastResponse,
  readResponse,
  topologyResponse,
  errorResponse,
]);

const requestSchema = z.object({
  src: z.string(),
  dest: z.string(),
  body: requestBody,
});

const responseSchema = z.object({
  src: z.string(),
  dest: z.string(),
  body: responseBody,
});

export const messageSchema = z.object({
  src: z.string(),
  dest: z.string(),
  body: z.discriminatedUnion("type", [
    ...requestBody.options,
    ...responseBody.options,
  ]),
});

export type RequestMessage = z.infer<typeof requestSchema>;
export type ResponseMessage = z.infer<typeof responseSchema>;
export type Message = z.infer<typeof messageSchema>;

// Helper type for messages with specific body types
type MessageWithBody<T> = {
  src: string;
  dest: string;
  body: T;
};

export type InitRequest = MessageWithBody<z.infer<typeof initRequest>>;
export type EchoRequest = MessageWithBody<z.infer<typeof echoRequest>>;
export type GenerateRequest = MessageWithBody<z.infer<typeof generateRequest>>;
export type BroadcastRequest = MessageWithBody<z.infer<typeof broadcastRequest>>;
export type ReadRequest = MessageWithBody<z.infer<typeof readRequest>>;
export type TopologyRequest = MessageWithBody<z.infer<typeof topologyRequest>>;

export type InitResponse = MessageWithBody<z.infer<typeof initResponse>>;
export type EchoResponse = MessageWithBody<z.infer<typeof echoResponse>>;
export type GenerateResponse = MessageWithBody<z.infer<typeof generateResponse>>;
export type BroadcastResponse = MessageWithBody<z.infer<typeof broadcastResponse>>;
export type ReadResponse = MessageWithBody<z.infer<typeof readResponse>>;
export type TopologyResponse = MessageWithBody<z.infer<typeof topologyResponse>>;
export type ErrorResponse = MessageWithBody<z.infer<typeof errorResponse>>;

// Type guards
export function isRequestMessage(message: unknown): message is RequestMessage {
  return requestSchema.safeParse(message).success;
}

export function isResponseMessage(message: unknown): message is ResponseMessage {
  return responseSchema.safeParse(message).success;
}
